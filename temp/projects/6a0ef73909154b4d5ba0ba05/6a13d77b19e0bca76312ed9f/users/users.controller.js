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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const user_role_enum_1 = require("./enums/user-role.enum");
const create_org_admin_dto_1 = require("./dto/create-org-admin.dto");
const create_org_user_dto_1 = require("./dto/create-org-user.dto");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async findAllInOrg(req) {
        return this.usersService.findAllInOrg(req.user.organizationId);
    }
    async updatePermissions(userId, canDeploy, canEdit, canView, req) {
        return this.usersService.updatePermissions(userId, req.user.organizationId, {
            canDeploy,
            canEdit,
            canView,
        });
    }
    async updateRole(userId, role, req) {
        return this.usersService.updateRole(userId, role, req.user.organizationId);
    }
    async createOrgAdmin(createOrgAdminDto, req) {
        const user = await this.usersService.createOrgAdmin(createOrgAdminDto.email, createOrgAdminDto.password, createOrgAdminDto.organizationName);
        return {
            message: 'Org admin created successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            },
        };
    }
    async createOrgUser(createOrgUserDto, req) {
        const user = await this.usersService.createOrgUser(createOrgUserDto.email, createOrgUserDto.password, createOrgUserDto.role || 'user', createOrgUserDto.permissions || {}, req.user.organizationId);
        return {
            message: 'User created successfully',
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId,
            },
        };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN, user_role_enum_1.UserRole.USER),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAllInOrg", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Put)(':id/permissions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('canDeploy')),
    __param(2, (0, common_1.Body)('canEdit')),
    __param(3, (0, common_1.Body)('canView')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, Boolean, Boolean, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updatePermissions", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN, user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Put)(':id/role'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('role')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateRole", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ADMIN),
    (0, common_1.Post)('create-org-admin'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_org_admin_dto_1.CreateOrgAdminDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createOrgAdmin", null);
__decorate([
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRole.ORG_ADMIN),
    (0, common_1.Post)('create-org-user'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_org_user_dto_1.CreateOrgUserDto, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createOrgUser", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map