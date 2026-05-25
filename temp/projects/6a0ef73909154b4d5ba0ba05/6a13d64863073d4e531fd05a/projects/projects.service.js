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
exports.ProjectsService = void 0;
const common_1 = require("@nestjs/common");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const project_schema_1 = require("./schemas/project.schema");
const organizations_service_1 = require("../organizations/organizations.service");
const user_role_enum_1 = require("../users/enums/user-role.enum");
const users_service_1 = require("../users/users.service");
const project_assignments_service_1 = require("./project-assignments.service");
let ProjectsService = class ProjectsService {
    projectModel;
    orgsService;
    usersService;
    projectAssignmentsService;
    constructor(projectModel, orgsService, usersService, projectAssignmentsService) {
        this.projectModel = projectModel;
        this.orgsService = orgsService;
        this.usersService = usersService;
        this.projectAssignmentsService = projectAssignmentsService;
    }
    async onModuleInit() {
    }
    async create(projectData, user) {
        const createdProject = new this.projectModel({
            ...projectData,
            owner: new mongoose_2.Types.ObjectId(user.userId),
        });
        const savedProject = await createdProject.save();
        await this.projectAssignmentsService.assignToUser(savedProject._id.toString(), user.userId, true, true, true);
        return savedProject;
    }
    async findAll(user) {
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            const projects = await this.projectModel
                .find()
                .populate('owner', 'email role organizationId')
                .exec();
            const orgIds = projects
                .map((p) => p.owner?.organizationId)
                .filter((id) => !!id);
            console.log('[ProjectsService] Org IDs extracted:', orgIds);
            if (orgIds.length > 0) {
                try {
                    const orgs = await this.orgsService.findByIds(orgIds);
                    console.log('[ProjectsService] Organizations found:', orgs.length);
                    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.name]));
                    console.log('[ProjectsService] Org map:', Array.from(orgMap.entries()));
                    const result = projects.map((project) => {
                        const orgId = project.owner?.organizationId?.toString();
                        const orgName = orgId ? orgMap.get(orgId) : null;
                        console.log(`[ProjectsService] Project ${project.name}: orgId=${orgId}, orgName=${orgName}`);
                        const projectObj = project.toObject();
                        projectObj.organizationName = orgName;
                        return projectObj;
                    });
                    return result;
                }
                catch (error) {
                    console.error('[ProjectsService] Error fetching organizations:', error);
                    return projects;
                }
            }
            return projects;
        }
        const assignments = await this.projectAssignmentsService.findByUser(user.userId);
        const projectIds = assignments.map(a => a.projectId);
        if (projectIds.length === 0) {
            return [];
        }
        return this.projectModel
            .find({ _id: { $in: projectIds } })
            .populate('owner', 'email role organizationId')
            .exec();
    }
    async findOne(id, user) {
        const project = await this.projectModel.findById(id).populate('owner', 'email role organizationId').exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            return project;
        }
        const hasAccess = await this.projectAssignmentsService.hasAccess(id, user.userId);
        if (!hasAccess) {
            throw new common_1.ForbiddenException('You do not have access to this project');
        }
        return project;
    }
    async update(id, updateData, user) {
        const project = await this.findOne(id, user);
        if (user.role !== user_role_enum_1.UserRole.ADMIN) {
            const assignment = await this.projectAssignmentsService.findByUser(user.userId);
            const projectAssignment = assignment.find(a => a.projectId.toString() === id);
            if (!projectAssignment || !projectAssignment.canEdit) {
                throw new common_1.ForbiddenException('You do not have permission to edit this project');
            }
            const isOriginallyDocker = !!project.dockerImage;
            const isOriginallyDist = !!project.distPath;
            const isOriginallyGit = !!project.gitUrl;
            if (isOriginallyDocker && (updateData.gitUrl || updateData.distPath)) {
                throw new common_1.ForbiddenException('You cannot change a Docker-based project to another type');
            }
            if (isOriginallyGit && (updateData.dockerImage || updateData.distPath)) {
                throw new common_1.ForbiddenException('You cannot change a Git-based project to another type');
            }
            if (isOriginallyDist && (updateData.gitUrl || updateData.dockerImage)) {
                throw new common_1.ForbiddenException('You cannot change a Dist-based project to another type');
            }
        }
        if (updateData.dockerImage) {
            project.gitUrl = undefined;
            project.branch = undefined;
            project.distPath = undefined;
        }
        else if (updateData.gitUrl) {
            project.dockerImage = undefined;
            project.distPath = undefined;
        }
        else if (updateData.distPath) {
            project.gitUrl = undefined;
            project.branch = undefined;
            project.dockerImage = undefined;
        }
        for (const key of Object.keys(updateData)) {
            if (updateData[key] !== undefined) {
                project[key] = updateData[key];
            }
        }
        return project.save();
    }
    async remove(id, user) {
        const project = await this.projectModel.findById(id).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            return this.projectModel.findByIdAndDelete(id).exec();
        }
        if (user.role === user_role_enum_1.UserRole.ORG_ADMIN) {
            if (project.owner.toString() !== user.userId) {
                throw new common_1.ForbiddenException('You can only delete your own projects');
            }
            return this.projectModel.findByIdAndDelete(id).exec();
        }
        throw new common_1.ForbiddenException('Only administrators and org-admins can delete projects');
    }
    async assignToUser(assignProjectDto, user) {
        const { projectId, userId, canView, canEdit, canDeploy } = assignProjectDto;
        const project = await this.projectModel.findById(projectId).exec();
        if (!project)
            throw new common_1.NotFoundException('Project not found');
        const targetUser = await this.usersService.findOneById(userId);
        if (!targetUser)
            throw new common_1.NotFoundException('User not found');
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            await this.projectAssignmentsService.assignToUser(projectId, userId, canView !== undefined ? canView : true, canEdit !== undefined ? canEdit : true, canDeploy !== undefined ? canDeploy : true);
            return { message: 'Project assigned successfully' };
        }
        if (user.role === user_role_enum_1.UserRole.ORG_ADMIN) {
            const currentUser = await this.usersService.findOneById(user.userId);
            if (!currentUser?.organizationId) {
                throw new common_1.ForbiddenException('You are not assigned to an organization');
            }
            const projectOwner = await this.usersService.findOneById(project.owner.toString());
            if (!projectOwner?.organizationId || projectOwner.organizationId.toString() !== currentUser.organizationId.toString()) {
                throw new common_1.ForbiddenException('You can only assign projects from your organization');
            }
            if (!targetUser.organizationId || targetUser.organizationId.toString() !== currentUser.organizationId.toString()) {
                throw new common_1.ForbiddenException('You can only assign projects to users in your organization');
            }
            await this.projectAssignmentsService.assignToUser(projectId, userId, canView !== undefined ? canView : true, canEdit !== undefined ? canEdit : true, canDeploy !== undefined ? canDeploy : true);
            return { message: 'Project assigned successfully' };
        }
        throw new common_1.ForbiddenException('Only administrators and org-admins can assign projects');
    }
    async getUserAssignments(userId, user) {
        const targetUser = await this.usersService.findOneById(userId);
        if (!targetUser)
            throw new common_1.NotFoundException('User not found');
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            const assignments = await this.projectAssignmentsService.findByUser(userId);
            const projectIds = assignments.map(a => a.projectId);
            const projects = await this.projectModel.find({ _id: { $in: projectIds } }).exec();
            const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));
            return assignments.map(a => ({
                ...a.toObject(),
                projectName: projectMap.get(a.projectId.toString()) || 'Unknown Project',
            }));
        }
        if (user.role === user_role_enum_1.UserRole.ORG_ADMIN) {
            const currentUser = await this.usersService.findOneById(user.userId);
            if (!currentUser?.organizationId) {
                throw new common_1.ForbiddenException('You are not assigned to an organization');
            }
            if (!targetUser.organizationId || targetUser.organizationId.toString() !== currentUser.organizationId.toString()) {
                throw new common_1.ForbiddenException('You can only view assignments for users in your organization');
            }
            const assignments = await this.projectAssignmentsService.findByUser(userId);
            const projectIds = assignments.map(a => a.projectId);
            const projects = await this.projectModel.find({ _id: { $in: projectIds } }).exec();
            const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));
            return assignments.map(a => ({
                ...a.toObject(),
                projectName: projectMap.get(a.projectId.toString()) || 'Unknown Project',
            }));
        }
        throw new common_1.ForbiddenException('Only administrators and org-admins can view assignments');
    }
    async removeAssignment(assignmentId, user) {
        const assignment = await this.projectAssignmentsService['projectAssignmentModel'].findById(assignmentId).exec();
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            await this.projectAssignmentsService.remove(assignment.projectId.toString(), assignment.userId.toString());
            return { message: 'Assignment removed successfully' };
        }
        if (user.role === user_role_enum_1.UserRole.ORG_ADMIN) {
            const currentUser = await this.usersService.findOneById(user.userId);
            if (!currentUser?.organizationId) {
                throw new common_1.ForbiddenException('You are not assigned to an organization');
            }
            const project = await this.projectModel.findById(assignment.projectId).exec();
            if (!project)
                throw new common_1.NotFoundException('Project not found');
            const projectOwner = await this.usersService.findOneById(project.owner.toString());
            if (!projectOwner?.organizationId || projectOwner.organizationId.toString() !== currentUser.organizationId.toString()) {
                throw new common_1.ForbiddenException('You can only remove assignments from your organization');
            }
            await this.projectAssignmentsService.remove(assignment.projectId.toString(), assignment.userId.toString());
            return { message: 'Assignment removed successfully' };
        }
        throw new common_1.ForbiddenException('Only administrators and org-admins can remove assignments');
    }
    async updateAssignment(assignmentId, permissions, user) {
        const assignment = await this.projectAssignmentsService['projectAssignmentModel'].findById(assignmentId).exec();
        if (!assignment)
            throw new common_1.NotFoundException('Assignment not found');
        if (user.role === user_role_enum_1.UserRole.ADMIN) {
            await this.projectAssignmentsService.assignToUser(assignment.projectId.toString(), assignment.userId.toString(), permissions.canView, permissions.canEdit, permissions.canDeploy);
            return { message: 'Assignment updated successfully' };
        }
        if (user.role === user_role_enum_1.UserRole.ORG_ADMIN) {
            const currentUser = await this.usersService.findOneById(user.userId);
            if (!currentUser?.organizationId) {
                throw new common_1.ForbiddenException('You are not assigned to an organization');
            }
            const project = await this.projectModel.findById(assignment.projectId).exec();
            if (!project)
                throw new common_1.NotFoundException('Project not found');
            const projectOwner = await this.usersService.findOneById(project.owner.toString());
            if (!projectOwner?.organizationId || projectOwner.organizationId.toString() !== currentUser.organizationId.toString()) {
                throw new common_1.ForbiddenException('You can only update assignments from your organization');
            }
            await this.projectAssignmentsService.assignToUser(assignment.projectId.toString(), assignment.userId.toString(), permissions.canView, permissions.canEdit, permissions.canDeploy);
            return { message: 'Assignment updated successfully' };
        }
        throw new common_1.ForbiddenException('Only administrators and org-admins can update assignments');
    }
    async extractDistUpload(files) {
        if (!files || files.length === 0) {
            throw new Error('No files uploaded');
        }
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const extractPath = path.join('/tmp', 'dist-uploads', uniqueId);
        for (const file of files) {
            const safeName = file.originalname.replace(/\.\./g, '').replace(/^\//, '');
            const filePath = path.join(extractPath, safeName);
            const fileDir = path.dirname(filePath);
            fs.mkdirSync(fileDir, { recursive: true });
            fs.writeFileSync(filePath, file.buffer);
        }
        return { distPath: extractPath };
    }
};
exports.ProjectsService = ProjectsService;
exports.ProjectsService = ProjectsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(project_schema_1.Project.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        organizations_service_1.OrganizationsService,
        users_service_1.UsersService,
        project_assignments_service_1.ProjectAssignmentsService])
], ProjectsService);
//# sourceMappingURL=projects.service.js.map