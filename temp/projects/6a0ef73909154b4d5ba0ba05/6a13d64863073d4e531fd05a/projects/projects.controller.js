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
exports.ProjectsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const projects_service_1 = require("./projects.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const create_project_dto_1 = require("./dto/create-project.dto");
const update_project_dto_1 = require("./dto/update-project.dto");
const assign_project_dto_1 = require("./dto/assign-project.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_role_enum_1 = require("../users/enums/user-role.enum");
let ProjectsController = class ProjectsController {
    projectsService;
    constructor(projectsService) {
        this.projectsService = projectsService;
    }
    async create(createProjectDto, req) {
        return this.projectsService.create(createProjectDto, req.user);
    }
    async uploadDist(files) {
        return this.projectsService.extractDistUpload(files);
    }
    async findAll(req) {
        return this.projectsService.findAll(req.user);
    }
    async findOne(id, req) {
        return this.projectsService.findOne(id, req.user);
    }
    async update(id, updateProjectDto, req) {
        return this.projectsService.update(id, updateProjectDto, req.user);
    }
    async remove(id, req) {
        return this.projectsService.remove(id, req.user);
    }
    async assignToUser(assignProjectDto, req) {
        return this.projectsService.assignToUser(assignProjectDto, req.user);
    }
    async getUserAssignments(userId, req) {
        return this.projectsService.getUserAssignments(userId, req.user);
    }
    async removeAssignment(assignmentId, req) {
        return this.projectsService.removeAssignment(assignmentId, req.user);
    }
    async updateAssignment(assignmentId, canView, canEdit, canDeploy, req) {
        return this.projectsService.updateAssignment(assignmentId, { canView, canEdit, canDeploy }, req.user);
    }
};
exports.ProjectsController = ProjectsController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_project_dto_1.CreateProjectDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('upload-dist'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 2000, { storage: (0, multer_1.memoryStorage)() })),
    __param(0, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "uploadDist", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_project_dto_1.UpdateProjectDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "remove", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Post)('assign'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [assign_project_dto_1.AssignProjectDto, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "assignToUser", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Get)('assignments/user/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "getUserAssignments", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Delete)('assignments/:assignmentId'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "removeAssignment", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Put)('assignments/:assignmentId'),
    __param(0, (0, common_1.Param)('assignmentId')),
    __param(1, (0, common_1.Body)('canView')),
    __param(2, (0, common_1.Body)('canEdit')),
    __param(3, (0, common_1.Body)('canDeploy')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Boolean, Boolean, Object]),
    __metadata("design:returntype", Promise)
], ProjectsController.prototype, "updateAssignment", null);
exports.ProjectsController = ProjectsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('projects'),
    __metadata("design:paramtypes", [projects_service_1.ProjectsService])
], ProjectsController);
//# sourceMappingURL=projects.controller.js.map