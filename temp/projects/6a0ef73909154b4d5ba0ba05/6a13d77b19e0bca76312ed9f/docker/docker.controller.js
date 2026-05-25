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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerController = void 0;
const common_1 = require("@nestjs/common");
const docker_service_1 = require("./docker.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let DockerController = class DockerController {
    dockerService;
    constructor(dockerService) {
        this.dockerService = dockerService;
    }
    async listContainers(req) {
        return this.dockerService.listContainers(req.user);
    }
    async startContainer(id, req) {
        return this.dockerService.startContainer(id, req.user);
    }
    async stopContainer(id, req) {
        return this.dockerService.stopContainer(id, req.user);
    }
    async restartContainer(id, req) {
        return this.dockerService.restartContainer(id, req.user);
    }
    async getContainerLogs(id, req, tail) {
        const tailCount = tail ? parseInt(tail, 10) : 200;
        const logs = await this.dockerService.getContainerLogs(id, req.user, tailCount);
        return { logs };
    }
};
exports.DockerController = DockerController;
__decorate([
    (0, common_1.Get)('containers'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DockerController.prototype, "listContainers", null);
__decorate([
    (0, common_1.Post)('containers/:id/start'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DockerController.prototype, "startContainer", null);
__decorate([
    (0, common_1.Post)('containers/:id/stop'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DockerController.prototype, "stopContainer", null);
__decorate([
    (0, common_1.Post)('containers/:id/restart'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DockerController.prototype, "restartContainer", null);
__decorate([
    (0, common_1.Get)('containers/:id/logs'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Query)('tail')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], DockerController.prototype, "getContainerLogs", null);
exports.DockerController = DockerController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('docker'),
    __metadata("design:paramtypes", [docker_service_1.DockerService])
], DockerController);
//# sourceMappingURL=docker.controller.js.map