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
exports.DeploymentsController = void 0;
const common_1 = require("@nestjs/common");
const deployments_service_1 = require("./deployments.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let DeploymentsController = class DeploymentsController {
    deploymentsService;
    constructor(deploymentsService) {
        this.deploymentsService = deploymentsService;
    }
    async create(projectId, req) {
        return this.deploymentsService.create(projectId, req.user);
    }
    async findAllByProject(projectId, req) {
        return this.deploymentsService.findAllByProject(projectId, req.user);
    }
    async findOne(id, req) {
        return this.deploymentsService.findOne(id, req.user);
    }
    async rollback(id, req) {
        return this.deploymentsService.rollback(id, req.user);
    }
};
exports.DeploymentsController = DeploymentsController;
__decorate([
    (0, common_1.Post)('project/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeploymentsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('project/:projectId'),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeploymentsController.prototype, "findAllByProject", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeploymentsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/rollback'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DeploymentsController.prototype, "rollback", null);
exports.DeploymentsController = DeploymentsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('deployments'),
    __metadata("design:paramtypes", [deployments_service_1.DeploymentsService])
], DeploymentsController);
//# sourceMappingURL=deployments.controller.js.map