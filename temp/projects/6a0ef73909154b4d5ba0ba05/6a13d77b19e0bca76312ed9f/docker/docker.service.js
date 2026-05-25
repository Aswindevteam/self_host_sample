"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerService = void 0;
const common_1 = require("@nestjs/common");
const dockerode_1 = __importDefault(require("dockerode"));
const projects_service_1 = require("../projects/projects.service");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let DockerService = class DockerService {
    projectsService;
    docker;
    constructor(projectsService) {
        this.projectsService = projectsService;
        this.docker = new dockerode_1.default({ socketPath: '/var/run/docker.sock' });
    }
    async checkContainerAccess(id, user) {
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            return;
        }
        try {
            const container = this.docker.getContainer(id);
            const info = await container.inspect();
            const name = info.Name;
            if (name.startsWith('/app-')) {
                const projectId = name.substring(5);
                await this.projectsService.findOne(projectId, user);
            }
            else {
                throw new common_1.UnauthorizedException('Access denied to system container');
            }
        }
        catch (err) {
            throw new common_1.UnauthorizedException(`Access denied: ${err.message}`);
        }
    }
    async listContainers(user) {
        try {
            const containers = await this.docker.listContainers({ all: true });
            const userProjects = await this.projectsService.findAll(user);
            const allowedContainerNames = userProjects.map((p) => `/app-${p._id.toString()}`);
            const mapped = containers
                .map((c) => {
                const appName = c.Names.find((name) => name.startsWith('/app-'));
                let projectName;
                let deploymentId;
                if (appName) {
                    const projectId = appName.substring(5);
                    const project = userProjects.find((p) => p._id.toString() === projectId);
                    if (project) {
                        projectName = project.name;
                    }
                }
                const imageParts = c.Image.split(':');
                const imageRepo = imageParts[0] || '';
                if (imageRepo.startsWith('app-')) {
                    const projectId = imageRepo.substring(4);
                    const project = userProjects.find((p) => p._id.toString() === projectId);
                    if (project) {
                        deploymentId = imageParts[1] || '';
                    }
                }
                return {
                    id: c.Id,
                    names: c.Names,
                    image: c.Image,
                    state: c.State,
                    status: c.Status,
                    ports: c.Ports,
                    projectName,
                    deploymentId,
                };
            })
                .filter((c) => {
                const name = c.names[0] || '';
                return !['/mongodb_service', '/nest_app', '/wonderful_matsumoto'].includes(name);
            });
            return mapped.filter((c) => {
                const name = c.names[0] || '';
                return allowedContainerNames.includes(name);
            });
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(`Failed to query Docker daemon: ${err.message}`);
        }
    }
    async startContainer(id, user) {
        await this.checkContainerAccess(id, user);
        try {
            const container = this.docker.getContainer(id);
            await container.start();
            return { message: `Container ${id.substring(0, 12)} started successfully` };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(`Failed to start container: ${err.message}`);
        }
    }
    async stopContainer(id, user) {
        await this.checkContainerAccess(id, user);
        try {
            const container = this.docker.getContainer(id);
            await container.stop();
            return { message: `Container ${id.substring(0, 12)} stopped successfully` };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(`Failed to stop container: ${err.message}`);
        }
    }
    async restartContainer(id, user) {
        await this.checkContainerAccess(id, user);
        try {
            const container = this.docker.getContainer(id);
            await container.restart();
            return { message: `Container ${id.substring(0, 12)} restarted successfully` };
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(`Failed to restart container: ${err.message}`);
        }
    }
    async getContainerLogs(id, user, tailCount = 200) {
        await this.checkContainerAccess(id, user);
        try {
            const container = this.docker.getContainer(id);
            const logBuffer = await container.logs({
                stdout: true,
                stderr: true,
                tail: tailCount,
                follow: false,
            });
            return this.cleanDockerLogs(logBuffer);
        }
        catch (err) {
            throw new common_1.InternalServerErrorException(`Failed to retrieve container logs: ${err.message}`);
        }
    }
    cleanDockerLogs(buffer) {
        let offset = 0;
        let cleanText = '';
        while (offset < buffer.length) {
            const size = buffer.readUInt32BE(offset + 4);
            const chunk = buffer.subarray(offset + 8, offset + 8 + size);
            cleanText += chunk.toString('utf8');
            offset += 8 + size;
        }
        return cleanText || buffer.toString('utf8');
    }
};
exports.DockerService = DockerService;
exports.DockerService = DockerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], DockerService);
//# sourceMappingURL=docker.service.js.map