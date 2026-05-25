import { Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Deployment, DeploymentDocument } from './schemas/deployment.schema';
import { ProjectsService } from '../projects/projects.service';
import { DeploymentStatus } from './enums/deployment-status.enum';
import { NginxService } from '../nginx/nginx.service';

@Injectable()
export class DeploymentsService {
  private readonly logger = new Logger(DeploymentsService.name);

  constructor(
    @InjectModel(Deployment.name) private deploymentModel: Model<DeploymentDocument>,
    private projectsService: ProjectsService,
    private nginxService: NginxService,
  ) {}

  async create(projectId: string, user: any): Promise<DeploymentDocument> {
    // Verify user has access to the project
    const project = await this.projectsService.findOne(projectId, user);

    const createdDeployment = new this.deploymentModel({
      projectId: new Types.ObjectId(projectId),
      status: 'PENDING',
      logs: [`[${new Date().toISOString()}] Deployment initialized...`],
    });
    const savedDeployment = await createdDeployment.save();

    // Start build and deployment asynchronously in the background
    this.startBuildAndDeploy(savedDeployment.id, project);

    return savedDeployment;
  }

  async findAllByProject(projectId: string, user: any): Promise<DeploymentDocument[]> {
    // Verify user has access to the project
    await this.projectsService.findOne(projectId, user);

    return this.deploymentModel.find({ projectId: new Types.ObjectId(projectId) }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, user: any): Promise<DeploymentDocument> {
    const deployment = await this.deploymentModel.findById(id).populate('projectId').exec();
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    // Verify user has access to the project associated with this deployment
    const project: any = deployment.projectId;
    await this.projectsService.findOne(project._id.toString(), user);
    return deployment;
  }

  async updateStatus(id: string, status: string, logLine?: string): Promise<DeploymentDocument> {
    const deployment = await this.deploymentModel.findById(id).exec();
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    deployment.status = status;
    if (logLine) {
      deployment.logs.push(`[${new Date().toISOString()}] ${logLine}`);
    }
    return deployment.save();
  }

  // Asynchronous background deployment worker
  private async startBuildAndDeploy(
    deploymentId: string,
    project: any,
    rollbackImageName?: string,
  ): Promise<void> {
    const projectId = project._id.toString();
    const tempDir = path.join(process.cwd(), 'temp', 'projects', projectId, deploymentId);
    const imageName = `app-${projectId}:${deploymentId}`;
    const containerName = `app-${projectId}`;
    const isDockerImage = !!project.dockerImage;
    const isRollback = !!rollbackImageName;
    const targetImage = rollbackImageName
      ? rollbackImageName
      : isDockerImage
        ? project.dockerImage
        : imageName;

    const appendLog = async (text: string) => {
      const dep = await this.deploymentModel.findById(deploymentId);
      if (dep) {
        dep.logs.push(text);
        await dep.save();
      }
    };

    try {
      if (isRollback) {
        await this.updateStatus(deploymentId, 'BUILDING', 'Executing rollback to target version...');
        await appendLog(`\n[Orchestrator] Rolling back container to image ${targetImage}...\n`);
      } else if (isDockerImage) {
        await this.updateStatus(deploymentId, 'BUILDING', 'Pulling target Docker image...');
        await appendLog(`\n[Orchestrator] Pulling Docker image ${targetImage}...\n`);
        await new Promise<void>((resolve, reject) => {
          const pull = spawn('docker', ['pull', targetImage]);
          pull.stdout.on('data', (data) => appendLog(data.toString()));
          pull.stderr.on('data', (data) => appendLog(data.toString()));
          pull.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Docker pull failed with exit code ${code}`));
          });
        });
      } else if (project.gitUrl) {
        await this.updateStatus(deploymentId, 'BUILDING', 'Starting code retrieval...');
        fs.mkdirSync(tempDir, { recursive: true });

        // Step 1: Git clone the target repository
        await appendLog(`\n[Orchestrator] Cloning repository ${project.gitUrl} (branch: ${project.branch})...\n`);
        await new Promise<void>((resolve, reject) => {
          const clone = spawn('git', ['clone', '--depth', '1', '-b', project.branch, project.gitUrl, tempDir]);
          clone.stdout.on('data', (data) => appendLog(data.toString()));
          clone.stderr.on('data', (data) => appendLog(data.toString()));
          clone.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Git clone failed with exit code ${code}`));
          });
        });

        // Step 2: Build Image using Dockerfile or Cloud Native Buildpacks
        const dockerfilePath = path.join(tempDir, 'Dockerfile');
        if (fs.existsSync(dockerfilePath)) {
          await appendLog(`\n[Orchestrator] Starting Docker image build (${imageName}) using repository Dockerfile...\n`);
          await new Promise<void>((resolve, reject) => {
            const build = spawn('docker', ['build', '-t', imageName, tempDir]);
            build.stdout.on('data', (data) => appendLog(data.toString()));
            build.stderr.on('data', (data) => appendLog(data.toString()));
            build.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Docker build failed with exit code ${code}`));
            });
          });
        } else {
          await appendLog(`\n[Orchestrator] No Dockerfile found in repository. Utilizing Cloud Native Buildpacks to auto-detect language and build image (${imageName})...\n`);
          await new Promise<void>((resolve, reject) => {
            const build = spawn('pack', ['build', imageName, '--builder', 'paketobuildpacks/builder-jammy-base', '--path', tempDir]);
            build.stdout.on('data', (data) => appendLog(data.toString()));
            build.stderr.on('data', (data) => appendLog(data.toString()));
            build.on('close', (code) => {
              if (code === 0) resolve();
              else reject(new Error(`Cloud Native Buildpacks (pack build) failed with exit code ${code}. Please ensure the pack CLI is installed on the host.`));
            });
          });
        }
      } else if (project.distPath) {
        await this.updateStatus(deploymentId, 'BUILDING', 'Preparing dist folder...');
        fs.mkdirSync(tempDir, { recursive: true });

        await appendLog(`\n[Orchestrator] Copying dist folder from ${project.distPath}...\n`);
        try {
          fs.cpSync(project.distPath, tempDir, { recursive: true });
        } catch (copyErr) {
          throw new Error(`Failed to copy dist folder: ${copyErr.message}`);
        }

        // Generate a Dockerfile to serve the static content
        const dockerfilePath = path.join(tempDir, 'Dockerfile');
        const dockerfileContent = `FROM nginx:alpine
COPY . /usr/share/nginx/html
RUN echo "server { listen ${project.port}; root /usr/share/nginx/html; index index.html; location / { try_files \\$uri \\$uri/ /index.html; } }" > /etc/nginx/conf.d/default.conf
EXPOSE ${project.port}
`;
        fs.writeFileSync(dockerfilePath, dockerfileContent);

        // Step 3: Docker Build
        await appendLog(`\n[Orchestrator] Starting Docker image build (${imageName}) from dist folder...\n`);
        await new Promise<void>((resolve, reject) => {
          const build = spawn('docker', ['build', '-t', imageName, tempDir]);
          build.stdout.on('data', (data) => appendLog(data.toString()));
          build.stderr.on('data', (data) => appendLog(data.toString()));
          build.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Docker build failed with exit code ${code}`));
          });
        });
      } else {
        throw new Error('Neither Git URL, Docker image, nor Dist path was specified for this project.');
      }

      // Step 4: Stop & Remove old container if it exists
      await appendLog(`\n[Orchestrator] Cleaning up existing container instances (${containerName})...\n`);
      await new Promise<void>((resolve) => {
        const stop = spawn('docker', ['stop', containerName]);
        stop.on('close', () => {
          const rm = spawn('docker', ['rm', containerName]);
          rm.on('close', () => resolve());
        });
      });

      // Step 5: Docker Run (Start new container)
      await appendLog(`\n[Orchestrator] Deploying new container instance (${containerName}) on port ${project.port}...\n`);
      
      const runArgs = [
        'run',
        '-d',
        '--name', containerName,
        '--network', 'service_app-network',
        '-p', `${project.port}:${project.port}`,
      ];

      // Inject project environment variables
      if (project.envVariables) {
        const envMap = project.envVariables instanceof Map 
          ? Object.fromEntries(project.envVariables) 
          : project.envVariables;
        for (const [key, value] of Object.entries(envMap)) {
          runArgs.push('-e', `${key}=${value}`);
        }
      }
      // Provide connection access to containerized MongoDB
      runArgs.push('-e', 'MONGODB_URI=mongodb://mongodb_service:27017/service');
      runArgs.push(targetImage);

      let containerId = '';
      await new Promise<void>((resolve, reject) => {
        const run = spawn('docker', runArgs);

        run.stdout.on('data', (data) => {
          containerId += data.toString().trim();
          appendLog(data.toString());
        });
        run.stderr.on('data', (data) => appendLog(data.toString()));

        run.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Docker run failed with exit code ${code}`));
        });
      });

      // Update deployment status to running
      const finalContainerId = containerId.substring(0, 12);
      const deployment = await this.deploymentModel.findById(deploymentId).exec();
      if (deployment) {
        deployment.status = 'RUNNING';
        deployment.containerId = finalContainerId;
        deployment.imageName = targetImage;
        deployment.logs.push(`\n[Orchestrator] Successful deployment! Container ID: ${finalContainerId}\n`);
        await deployment.save();
      }

      // Update Nginx Proxy config if project domain is configured
      if (project.domain) {
        await appendLog(`\n[Orchestrator] Configuring Nginx reverse proxy routing for domain ${project.domain}...\n`);
        await this.nginxService.configureDomain(projectId, project.domain, project.port, project.customNginxConfig);
      }

      this.logger.log(`Successful deployment ${deploymentId} for project ${project.name}`);

    } catch (err) {
      this.logger.error(`Deployment failed: ${err.message}`, err.stack);
      await this.updateStatus(deploymentId, 'FAILED', `Deployment failed: ${err.message}`);
    } finally {
      // Clean up temporary workspace directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        this.logger.warn(`Failed to clean up temporary directory ${tempDir}: ${cleanupErr.message}`);
      }
    }
  }

  async rollback(targetDeploymentId: string, user: any): Promise<DeploymentDocument> {
    const targetDeployment = await this.deploymentModel
      .findById(targetDeploymentId)
      .populate('projectId')
      .exec();
    if (!targetDeployment) {
      throw new NotFoundException('Target deployment not found');
    }
    const project: any = targetDeployment.projectId;

    // Verify user has access to the project
    await this.projectsService.findOne(project._id.toString(), user);

    // Create a new deployment to track this rollback process
    const createdDeployment = new this.deploymentModel({
      projectId: project._id,
      status: 'PENDING',
      logs: [`[${new Date().toISOString()}] Rollback initiated targeting deployment #${targetDeploymentId.substring(18)}...`],
    });
    const savedDeployment = await createdDeployment.save();

    // Determine target image tag to reuse
    const rollbackImageName = project.dockerImage
      ? project.dockerImage
      : `app-${project._id.toString()}:${targetDeploymentId}`;

    // Start rollback asynchronously in the background
    this.startBuildAndDeploy(savedDeployment.id, project, rollbackImageName);

    return savedDeployment;
  }

  private generateDockerfileContent(tempDir: string, port: number): string {
    const hasGoMod = fs.existsSync(path.join(tempDir, 'go.mod'));

    if (hasGoMod) {
      return `FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:latest
WORKDIR /root/
COPY --from=builder /app/main .
EXPOSE ${port}
CMD ["./main"]
`;
    }

    // Default Node.js / React / Angular / Frontend static-serve fallback Dockerfile
    return `FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build --if-present
EXPOSE ${port}
CMD ["node", "start.js"]
`;
  }
}
