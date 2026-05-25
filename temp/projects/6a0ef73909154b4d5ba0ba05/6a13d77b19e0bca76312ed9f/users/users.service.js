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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcrypt"));
const user_schema_1 = require("./schemas/user.schema");
const organizations_service_1 = require("../organizations/organizations.service");
let UsersService = class UsersService {
    userModel;
    orgsService;
    constructor(userModel, orgsService) {
        this.userModel = userModel;
        this.orgsService = orgsService;
    }
    async onModuleInit() {
        const existingAdmin = await this.userModel.findOne({ email: 'admin@launchpad.local' }).exec();
        if (!existingAdmin) {
            const adminPassword = await bcrypt.hash('admin123', 10);
            await this.userModel.create({
                email: 'admin@launchpad.local',
                password: adminPassword,
                role: 'admin',
            });
            console.log('[UsersService] Seeded admin@launchpad.local user with role ADMIN');
        }
        const defaultOrg = await this.orgsService.getDefaultOrg();
        if (defaultOrg) {
            await this.userModel.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: defaultOrg._id } }).exec();
            await this.userModel.updateMany({ role: 'ADMIN' }, { $set: { role: 'admin' } }).exec();
            await this.userModel.updateMany({ role: 'ORG_ADMIN' }, { $set: { role: 'org-admin' } }).exec();
            await this.userModel.updateMany({ role: 'USER' }, { $set: { role: 'user' } }).exec();
        }
    }
    async create(email, passwordPlain, role = 'user') {
        const password = await bcrypt.hash(passwordPlain, 10);
        const createdUser = new this.userModel({
            email,
            password,
            role,
            organizationId: undefined,
        });
        return createdUser.save();
    }
    async findOneByEmail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async findOneById(id) {
        return this.userModel.findById(id).exec();
    }
    async updateOrganization(id, orgId) {
        return this.userModel.findByIdAndUpdate(id, { organizationId: orgId }, { new: true }).exec();
    }
    async findAllInOrg(orgId) {
        return this.userModel
            .find({ organizationId: new mongoose_2.Types.ObjectId(orgId) })
            .exec();
    }
    async updatePermissions(userId, orgId, permissions) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.organizationId?.toString() !== orgId) {
            throw new common_1.ForbiddenException('User does not belong to your organization');
        }
        if (permissions) {
            user.permissions = {
                canDeploy: permissions.canDeploy ?? user.permissions?.canDeploy ?? true,
                canEdit: permissions.canEdit ?? user.permissions?.canEdit ?? true,
                canView: permissions.canView ?? user.permissions?.canView ?? true,
            };
        }
        return user.save();
    }
    async createOrgAdmin(email, password, organizationName) {
        const existingUser = await this.userModel.findOne({ email }).exec();
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const org = await this.orgsService.create(organizationName);
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.create({
            email,
            password: hashedPassword,
            role: 'org-admin',
            organizationId: org._id,
            permissions: {
                canDeploy: true,
                canEdit: true,
                canView: true,
            },
        });
        return user;
    }
    async createOrgUser(email, password, role, permissions, organizationId) {
        const existingUser = await this.userModel.findOne({ email }).exec();
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        if (role !== 'user' && role !== 'org-admin') {
            throw new common_1.ForbiddenException('Invalid role for org user creation');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.userModel.create({
            email,
            password: hashedPassword,
            role,
            organizationId: new mongoose_2.Types.ObjectId(organizationId),
            permissions: permissions || {
                canDeploy: true,
                canEdit: true,
                canView: true,
            },
        });
        return user;
    }
    async updateRole(userId, role, orgId) {
        const user = await this.userModel.findById(userId).exec();
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.organizationId?.toString() !== orgId) {
            throw new common_1.ForbiddenException('You can only update role for users in your organization');
        }
        const validRoles = ['user', 'org-admin'];
        if (!validRoles.includes(role)) {
            throw new common_1.ForbiddenException('Invalid role');
        }
        user.role = role;
        return user.save();
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        organizations_service_1.OrganizationsService])
], UsersService);
//# sourceMappingURL=users.service.js.map