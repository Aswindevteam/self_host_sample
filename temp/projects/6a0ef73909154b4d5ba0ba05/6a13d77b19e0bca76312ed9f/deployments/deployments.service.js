"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeploymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const deployment_schema_1 = require("./schemas/deployment.schema");
const projects_service_1 = require("../projects/projects.service");
const nginx_service_1 = require("../nginx/nginx.service");
let DeploymentsService = DeploymentsService_1 = class DeploymentsService {
    deploymentModel;
    projectsService;
    nginxService;
    logger = new common_1.Logger(DeploymentsService_1.name);
    constructor(deploymentModel, projectsService, nginxService) {
        this.deploymentModel = deploymentModel;
        this.projectsService = projectsService;
        this.nginxService = nginxService;
    }
    async create(projectId, user) {
        const project = await this.projectsService.findOne(projectId, user);
        const createdDeployment = new this.deploymentModel({
            projectId: new mongoose_2.Types.ObjectId(projectId),
            status: 'PENDING',
            logs: [`[${new Date().toISOString()}] Deployment initialized...`],
        });
        const savedDeployment = await createdDeployment.save();
        this.startBuildAndDeploy(savedDeployment.id, project);
        return savedDeployment;
    }
    async findAllByProject(projectId, user) {
        await this.projectsService.findOne(projectId, user);
        return this.deploymentModel.find({ projectId: new mongoose_2.Types.ObjectId(projectId) }).sort({ createdAt: -1 }).exec();
    }
    async findOne(id, user) {
        const deployment = await this.deploymentModel.findById(id).populate('projectId').exec();
        if (!deployment) {
            throw new common_1.NotFoundException('Deployment not found');
        }
        const project = deployment.projectId;
        await this.projectsService.findOne(project._id.toString(), user);
        return deployment;
    }
    async updateStatus(id, status, logLine) {
        const deployment = await this.deploymentModel.findById(id).exec();
        if (!deployment) {
            throw new common_1.NotFoundException('Deployment not found');
        }
        deployment.status = status;
        if (logLine) {
            deployment.logs.push(`[${new Date().toISOString()}] ${logLine}`);
        }
        return deployment.save();
    }
    async startBuildAndDeploy(deploymentId, project, rollbackImageName) {
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
        const appendLog = async (text) => {
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
            }
            else if (isDockerImage) {
                await this.updateStatus(deploymentId, 'BUILDING', 'Pulling target Docker image...');
                await appendLog(`\n[Orchestrator] Pulling Docker image ${targetImage}...\n`);
                await new Promise((resolve, reject) => {
                    const pull = (0, child_process_1.spawn)('docker', ['pull', targetImage]);
                    pull.stdout.on('data', (data) => appendLog(data.toString()));
                    pull.stderr.on('data', (data) => appendLog(data.toString()));
                    pull.on('close', (code) => {
                        if (code === 0)
                            resolve();
                        else
                            reject(new Error(`Docker pull failed with exit code ${code}`));
                    });
                });
            }
            else if (project.gitUrl) {
                await this.updateStatus(deploymentId, 'BUILDING', 'Starting code retrieval...');
                fs.mkdirSync(tempDir, { recursive: true });
                await appendLog(`\n[Orchestrator] Cloning repository ${project.gitUrl} (branch: ${project.branch})...\n`);
                await new Promise((resolve, reject) => {
                    const clone = (0, child_process_1.spawn)('git', ['clone', '--depth', '1', '-b', project.branch, project.gitUrl, tempDir]);
                    clone.stdout.on('data', (data) => appendLog(data.toString()));
                    clone.stderr.on('data', (data) => appendLog(data.toString()));
                    clone.on('close', (code) => {
                        if (code === 0)
                            resolve();
                        else
                            reject(new Error(`Git clone failed with exit code ${code}`));
                    });
                });
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
                await appendLog(`\n[Orchestrator] Starting Docker image build (${imageName})...\n`);
                await new Promise((resolve, reject) => {
                    const build = (0, child_process_1.spawn)('docker', ['build', '-t', imageName, tempDir]);
                    build.stdout.on('data', (data) => appendLog(data.toString()));
                    build.stderr.on('data', (data) => appendLog(data.toString()));
                    build.on('close', (code) => {
                        if (code === 0)
                            resolve();
                        else
                            reject(new Error(`Docker build failed with exit code ${code}`));
                    });
                });
            }
            else if (project.distPath) {
                await this.updateStatus(deploymentId, 'BUILDING', 'Preparing dist folder...');
                fs.mkdirSync(tempDir, { recursive: true });
                await appendLog(`\n[Orchestrator] Copying dist folder from ${project.distPath}...\n`);
                try {
                    fs.cpSync(project.distPath, tempDir, { recursive: true });
                }
                catch (copyErr) {
                    throw new Error(`Failed to copy dist folder: ${copyErr.message}`);
                }
                const dockerfilePath = path.join(tempDir, 'Dockerfile');
                const dockerfileContent = `FROM node:20-alpine
WORKDIR /usr/src/app
RUN npm install -g serve
COPY . .
EXPOSE ${project.port}
CMD ["serve", "-s", ".", "-l", "${project.port}"]
`;
                fs.writeFileSync(dockerfilePath, dockerfileContent);
                await appendLog(`\n[Orchestrator] Starting Docker image build (${imageName}) from dist folder...\n`);
                await new Promise((resolve, reject) => {
                    const build = (0, child_process_1.spawn)('docker', ['build', '-t', imageName, tempDir]);
                    build.stdout.on('data', (data) => appendLog(data.toString()));
                    build.stderr.on('data', (data) => appendLog(data.toString()));
                    build.on('close', (code) => {
                        if (code === 0)
                            resolve();
                        else
                            reject(new Error(`Docker build failed with exit code ${code}`));
                    });
                });
            }
            else {
                throw new Error('Neither Git URL, Docker image, nor Dist path was specified for this project.');
            }
            await appendLog(`\n[Orchestrator] Cleaning up existing container instances (${containerName})...\n`);
            await new Promise((resolve) => {
                const stop = (0, child_process_1.spawn)('docker', ['stop', containerName]);
                stop.on('close', () => {
                    const rm = (0, child_process_1.spawn)('docker', ['rm', containerName]);
                    rm.on('close', () => resolve());
                });
            });
            await appendLog(`\n[Orchestrator] Deploying new container instance (${containerName}) on port ${project.port}...\n`);
            const runArgs = [
                'run',
                '-d',
                '--name', containerName,
                '--network', 'service_app-network',
                '-p', `${project.port}:${project.port}`,
            ];
            if (project.envVariables) {
                const envMap = project.envVariables instanceof Map
                    ? Object.fromEntries(project.envVariables)
                    : project.envVariables;
                for (const [key, value] of Object.entries(envMap)) {
                    runArgs.push('-e', `${key}=${value}`);
                }
            }
            runArgs.push('-e', 'MONGODB_URI=mongodb://mongodb_service:27017/service');
            runArgs.push(targetImage);
            let containerId = '';
            await new Promise((resolve, reject) => {
                const run = (0, child_process_1.spawn)('docker', runArgs);
                run.stdout.on('data', (data) => {
                    containerId += data.toString().trim();
                    appendLog(data.toString());
                });
                run.stderr.on('data', (data) => appendLog(data.toString()));
                run.on('close', (code) => {
                    if (code === 0)
                        resolve();
                    else
                        reject(new Error(`Docker run failed with exit code ${code}`));
                });
            });
            const finalContainerId = containerId.substring(0, 12);
            const deployment = await this.deploymentModel.findById(deploymentId).exec();
            if (deployment) {
                deployment.status = 'RUNNING';
                deployment.containerId = finalContainerId;
                deployment.imageName = targetImage;
                deployment.logs.push(`\n[Orchestrator] Successful deployment! Container ID: ${finalContainerId}\n`);
                await deployment.save();
            }
            if (project.domain) {
                await appendLog(`\n[Orchestrator] Configuring Nginx reverse proxy routing for domain ${project.domain}...\n`);
                await this.nginxService.configureDomain(projectId, project.domain, project.port);
            }
            this.logger.log(`Successful deployment ${deploymentId} for project ${project.name}`);
        }
        catch (err) {
            this.logger.error(`Deployment failed: ${err.message}`, err.stack);
            await this.updateStatus(deploymentId, 'FAILED', `Deployment failed: ${err.message}`);
        }
        finally {
            try {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            catch (cleanupErr) {
                this.logger.warn(`Failed to clean up temporary directory ${tempDir}: ${cleanupErr.message}`);
            }
        }
    }
    async rollback(targetDeploymentId, user) {
        const targetDeployment = await this.deploymentModel
            .findById(targetDeploymentId)
            .populate('projectId')
            .exec();
        if (!targetDeployment) {
            throw new common_1.NotFoundException('Target deployment not found');
        }
        const project = targetDeployment.projectId;
        await this.projectsService.findOne(project._id.toString(), user);
        const createdDeployment = new this.deploymentModel({
            projectId: project._id,
            status: 'PENDING',
            logs: [`[${new Date().toISOString()}] Rollback initiated targeting deployment #${targetDeploymentId.substring(18)}...`],
        });
        const savedDeployment = await createdDeployment.save();
        const rollbackImageName = project.dockerImage
            ? project.dockerImage
            : `app-${project._id.toString()}:${targetDeploymentId}`;
        this.startBuildAndDeploy(savedDeployment.id, project, rollbackImageName);
        return savedDeployment;
    }
    generateDockerfileContent(tempDir, port) {
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
};
exports.DeploymentsService = DeploymentsService;
exports.DeploymentsService = DeploymentsService = DeploymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(deployment_schema_1.Deployment.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        projects_service_1.ProjectsService,
        nginx_service_1.NginxService])
], DeploymentsService);
//# sourceMappingURL=deployments.service.js.map