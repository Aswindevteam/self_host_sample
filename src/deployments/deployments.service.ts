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

  async create(projectId: string, userId: string): Promise<DeploymentDocument> {
    // Verify user owns the project
    const project = await this.projectsService.findOne(projectId, userId);

    const createdDeployment = new this.deploymentModel({
      project: new Types.ObjectId(projectId),
      status: DeploymentStatus.PENDING,
      logs: `[${new Date().toISOString()}] Deployment initialized...\n`,
    });
    const savedDeployment = await createdDeployment.save();

    // Start build and deployment asynchronously in the background
    this.startBuildAndDeploy(savedDeployment.id, project);

    return savedDeployment;
  }

  async findAllByProject(projectId: string, userId: string): Promise<DeploymentDocument[]> {
    // Verify user owns the project
    await this.projectsService.findOne(projectId, userId);

    return this.deploymentModel.find({ project: new Types.ObjectId(projectId) }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<DeploymentDocument> {
    const deployment = await this.deploymentModel.findById(id).populate('project').exec();
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    // Verify user owns the project associated with this deployment
    const project: any = deployment.project;
    if (project.owner.toString() !== userId) {
      throw new UnauthorizedException('Access denied');
    }
    return deployment;
  }

  async updateStatus(id: string, status: DeploymentStatus, logLine?: string): Promise<DeploymentDocument> {
    const deployment = await this.deploymentModel.findById(id).exec();
    if (!deployment) {
      throw new NotFoundException('Deployment not found');
    }
    deployment.status = status;
    if (logLine) {
      deployment.logs += `\n[${new Date().toISOString()}] ${logLine}`;
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
        dep.logs += text;
        await dep.save();
      }
    };

    try {
      if (isRollback) {
        await this.updateStatus(deploymentId, DeploymentStatus.BUILDING, 'Executing rollback to target version...');
        await appendLog(`\n[Orchestrator] Rolling back container to image ${targetImage}...\n`);
      } else if (isDockerImage) {
        await this.updateStatus(deploymentId, DeploymentStatus.BUILDING, 'Pulling target Docker image...');
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
        await this.updateStatus(deploymentId, DeploymentStatus.BUILDING, 'Starting code retrieval...');
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

        // Step 2: Ensure Dockerfile exists, auto-detect type and write Dockerfile if missing
        const dockerfilePath = path.join(tempDir, 'Dockerfile');
        if (!fs.existsSync(dockerfilePath)) {
          await appendLog(`\n[Orchestrator] No Dockerfile found in repository. Auto-detecting project language/framework and generating configuration...\n`);
          const dockerfileContent = this.generateDockerfileContent(tempDir, project.port);
          fs.writeFileSync(dockerfilePath, dockerfileContent);

          const startScriptContent = `const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function getStaticDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      const res = getStaticDir(fullPath);
      if (res) return res;
    } else if (file === 'index.html') {
      return dir;
    }
  }
  return null;
}

const targetDir = getStaticDir('dist') || getStaticDir('build');
if (targetDir) {
  console.log('[StartScript] Serving static directory: ' + targetDir);
  const serve = spawn('npx', ['serve', '-s', targetDir, '-l', '${project.port}'], { stdio: 'inherit', shell: true });
  serve.on('close', (code) => process.exit(code));
} else {
  console.log('[StartScript] Static index.html not found, falling back to npm start...');
  const start = spawn('npm', ['start'], { stdio: 'inherit', shell: true });
  start.on('close', (code) => process.exit(code));
}
`;
          fs.writeFileSync(path.join(tempDir, 'start.js'), startScriptContent);
        }

        // Step 3: Docker Build
        await appendLog(`\n[Orchestrator] Starting Docker image build (${imageName})...\n`);
        await new Promise<void>((resolve, reject) => {
          const build = spawn('docker', ['build', '-t', imageName, tempDir]);
          build.stdout.on('data', (data) => appendLog(data.toString()));
          build.stderr.on('data', (data) => appendLog(data.toString()));
          build.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Docker build failed with exit code ${code}`));
          });
        });
      } else if (project.distPath) {
        await this.updateStatus(deploymentId, DeploymentStatus.BUILDING, 'Preparing dist folder...');
        fs.mkdirSync(tempDir, { recursive: true });

        await appendLog(`\n[Orchestrator] Copying dist folder from ${project.distPath}...\n`);
        try {
          fs.cpSync(project.distPath, tempDir, { recursive: true });
        } catch (copyErr) {
          throw new Error(`Failed to copy dist folder: ${copyErr.message}`);
        }

        // Generate a Dockerfile to serve the static content
        const dockerfilePath = path.join(tempDir, 'Dockerfile');
        const dockerfileContent = `FROM node:20-alpine
WORKDIR /usr/src/app
RUN npm install -g serve
COPY . .
EXPOSE ${project.port}
CMD ["serve", "-s", ".", "-l", "${project.port}"]
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
        deployment.status = DeploymentStatus.RUNNING;
        deployment.containerId = finalContainerId;
        deployment.logs += `\n[Orchestrator] Successful deployment! Container ID: ${finalContainerId}\n`;
        await deployment.save();
      }

      // Update Nginx Proxy config if project domain is configured
      if (project.domain) {
        await appendLog(`\n[Orchestrator] Configuring Nginx reverse proxy routing for domain ${project.domain}...\n`);
        await this.nginxService.configureDomain(projectId, project.domain, project.port);
      }

      this.logger.log(`Successful deployment ${deploymentId} for project ${project.name}`);

    } catch (err) {
      this.logger.error(`Deployment failed: ${err.message}`, err.stack);
      await this.updateStatus(deploymentId, DeploymentStatus.FAILED, `Deployment failed: ${err.message}`);
    } finally {
      // Clean up temporary workspace directory
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        this.logger.warn(`Failed to clean up temporary directory ${tempDir}: ${cleanupErr.message}`);
      }
    }
  }

  async rollback(targetDeploymentId: string, userId: string): Promise<DeploymentDocument> {
    const targetDeployment = await this.deploymentModel
      .findById(targetDeploymentId)
      .populate('project')
      .exec();
    if (!targetDeployment) {
      throw new NotFoundException('Target deployment not found');
    }
    const project: any = targetDeployment.project;
    if (project.owner.toString() !== userId) {
      throw new UnauthorizedException('Access denied');
    }

    // Create a new deployment to track this rollback process
    const createdDeployment = new this.deploymentModel({
      project: project._id,
      status: DeploymentStatus.PENDING,
      logs: `[${new Date().toISOString()}] Rollback initiated targeting deployment #${targetDeploymentId.substring(18)}...\n`,
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
