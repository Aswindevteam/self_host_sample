import { Injectable, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { NginxConfigHistory, NginxConfigHistoryDocument } from './schemas/nginx-config-history.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { ProjectAssignmentsService } from './project-assignments.service';
import type { Multer } from 'multer';

@Injectable()
export class ProjectsService implements OnModuleInit {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(NginxConfigHistory.name) private nginxHistoryModel: Model<NginxConfigHistoryDocument>,
    private orgsService: OrganizationsService,
    private usersService: UsersService,
    private projectAssignmentsService: ProjectAssignmentsService,
  ) {}

  async onModuleInit() {
    // No migration needed for organization field as it was removed from schema
  }

  /** Create a project owned by the requesting user */
  async create(projectData: CreateProjectDto, user: any): Promise<ProjectDocument> {
    const createdProject = new this.projectModel({
      ...projectData,
      owner: new Types.ObjectId(user.userId),
    });
    const savedProject = await createdProject.save();

    // Automatically assign the creator to the project with full access
    await this.projectAssignmentsService.assignToUser(
      savedProject._id.toString(),
      user.userId,
      true, // canView
      true, // canEdit
      true, // canDeploy
    );

    return savedProject;
  }

  /**
   * findAll:
   *   Admin → all projects
   *   Org-admin/User → projects they have been assigned access to
   */
  async findAll(user: any): Promise<ProjectDocument[]> {
    if (user.role === UserRole.ADMIN) {
      // Admin sees all projects with owner and organization info
      const projects = await this.projectModel
        .find()
        .populate('owner', 'email role organizationId')
        .exec();

      // Fetch organization names and attach to projects
      const orgIds = projects
        .map((p) => (p.owner as any)?.organizationId)
        .filter((id): id is string => !!id);

      console.log('[ProjectsService] Org IDs extracted:', orgIds);

      if (orgIds.length > 0) {
        try {
          const orgs = await this.orgsService.findByIds(orgIds);
          console.log('[ProjectsService] Organizations found:', orgs.length);
          const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.name]));
          console.log('[ProjectsService] Org map:', Array.from(orgMap.entries()));

          const result = projects.map((project) => {
            const orgId = (project.owner as any)?.organizationId?.toString();
            const orgName = orgId ? orgMap.get(orgId) : null;
            console.log(`[ProjectsService] Project ${project.name}: orgId=${orgId}, orgName=${orgName}`);

            // Convert to plain object and add organizationName
            const projectObj = project.toObject();
            (projectObj as any).organizationName = orgName;
            return projectObj;
          });

          return result;
        } catch (error) {
          console.error('[ProjectsService] Error fetching organizations:', error);
          return projects;
        }
      }

      return projects;
    }

    // Non-admins see only projects they have been assigned access to
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

  /**
   * findOne:
   *   Admin → any project
   *   Org-admin/User → projects they have been assigned access to
   */
  async findOne(id: string, user: any): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).populate('owner', 'email role organizationId').exec();
    if (!project) throw new NotFoundException('Project not found');

    // Admin can access any project
    if (user.role === UserRole.ADMIN) {
      return project;
    }

    // Non-admins can only access projects they have been assigned to
    const hasAccess = await this.projectAssignmentsService.hasAccess(id, user.userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  /** Update: admin can update any project; user only their own if edit permission is granted */
  async update(id: string, updateData: UpdateProjectDto, user: any): Promise<ProjectDocument> {
    const project = await this.findOne(id, user); // enforces visibility

    if (user.role !== UserRole.ADMIN) {
      // Check edit permissions from project assignment
      const assignment = await this.projectAssignmentsService.findByUser(user.userId);
      const projectAssignment = assignment.find(a => a.projectId.toString() === id);

      if (!projectAssignment || (!projectAssignment.canEdit && !(projectAssignment.canDeploy && updateData.distPath !== undefined && Object.keys(updateData).every(k => k === 'distPath')))) {
        throw new ForbiddenException('You do not have permission to edit this project');
      }

      // Enforce that regular users cannot switch core deployment type (git vs docker vs dist)
      const isOriginallyDocker = !!project.dockerImage;
      const isOriginallyDist = !!project.distPath;
      const isOriginallyGit = !!project.gitUrl;

      if (isOriginallyDocker && (updateData.gitUrl || updateData.distPath)) {
        throw new ForbiddenException('You cannot change a Docker-based project to another type');
      }
      if (isOriginallyGit && (updateData.dockerImage || updateData.distPath)) {
        throw new ForbiddenException('You cannot change a Git-based project to another type');
      }
      if (isOriginallyDist && (updateData.gitUrl || updateData.dockerImage)) {
        throw new ForbiddenException('You cannot change a Dist-based project to another type');
      }
    }

    // Clean fields if needed to allow switching between git, docker, and dist
    if (updateData.dockerImage) {
      project.gitUrl = undefined;
      project.branch = undefined;
      project.distPath = undefined;
    } else if (updateData.gitUrl) {
      project.dockerImage = undefined;
      project.distPath = undefined;
    } else if (updateData.distPath) {
      project.gitUrl = undefined;
      project.branch = undefined;
      project.dockerImage = undefined;
    }

    // Only assign defined values to avoid overwriting existing fields with undefined
    for (const key of Object.keys(updateData)) {
      if (updateData[key] !== undefined) {
        project[key] = updateData[key];
      }
    }

    // If customNginxConfig was updated, save history
    if (updateData.customNginxConfig !== undefined) {
      await new this.nginxHistoryModel({
        projectId: project._id,
        configContent: updateData.customNginxConfig,
        updatedBy: new Types.ObjectId(user.userId),
      }).save();
    }

    return project.save();
  }

  async getNginxConfigHistory(id: string, user: any): Promise<NginxConfigHistoryDocument[]> {
    await this.findOne(id, user); // enforces visibility
    return this.nginxHistoryModel
      .find({ projectId: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'email')
      .exec();
  }

  /** Delete: admin and org-admin (for their own projects) */
  async remove(id: string, user: any): Promise<any> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');

    // Admin can delete any project
    if (user.role === UserRole.ADMIN) {
      return this.projectModel.findByIdAndDelete(id).exec();
    }

    // Org-admin can only delete their own projects
    if (user.role === UserRole.ORG_ADMIN) {
      if (project.owner.toString() !== user.userId) {
        throw new ForbiddenException('You can only delete your own projects');
      }
      return this.projectModel.findByIdAndDelete(id).exec();
    }

    throw new ForbiddenException('Only administrators and org-admins can delete projects');
  }

  /** Assign project to user with permissions */
  async assignToUser(assignProjectDto: AssignProjectDto, user: any): Promise<any> {
    const { projectId, userId, canView, canEdit, canDeploy } = assignProjectDto;

    // Verify project exists
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) throw new NotFoundException('Project not found');

    // Verify user exists
    const targetUser = await this.usersService.findOneById(userId);
    if (!targetUser) throw new NotFoundException('User not found');

    // Admin can assign any project
    if (user.role === UserRole.ADMIN) {
      await this.projectAssignmentsService.assignToUser(
        projectId,
        userId,
        canView !== undefined ? canView : true,
        canEdit !== undefined ? canEdit : true,
        canDeploy !== undefined ? canDeploy : true,
      );
      return { message: 'Project assigned successfully' };
    }

    // Org-admin can only assign projects from their organization
    if (user.role === UserRole.ORG_ADMIN) {
      const currentUser = await this.usersService.findOneById(user.userId);
      if (!currentUser?.organizationId) {
        throw new ForbiddenException('You are not assigned to an organization');
      }

      // Check if project owner is in the same organization
      const projectOwner = await this.usersService.findOneById(project.owner.toString());
      if (!projectOwner?.organizationId || projectOwner.organizationId.toString() !== currentUser.organizationId.toString()) {
        throw new ForbiddenException('You can only assign projects from your organization');
      }

      // Check if target user is in the same organization
      if (!targetUser.organizationId || targetUser.organizationId.toString() !== currentUser.organizationId.toString()) {
        throw new ForbiddenException('You can only assign projects to users in your organization');
      }

      await this.projectAssignmentsService.assignToUser(
        projectId,
        userId,
        canView !== undefined ? canView : true,
        canEdit !== undefined ? canEdit : true,
        canDeploy !== undefined ? canDeploy : true,
      );
      return { message: 'Project assigned successfully' };
    }

    throw new ForbiddenException('Only administrators and org-admins can assign projects');
  }

  /** Get all project assignments for a specific user */
  async getUserAssignments(userId: string, user: any): Promise<any[]> {
    // Verify user exists
    const targetUser = await this.usersService.findOneById(userId);
    if (!targetUser) throw new NotFoundException('User not found');

    // Admin can view any user's assignments
    if (user.role === UserRole.ADMIN) {
      const assignments = await this.projectAssignmentsService.findByUser(userId);
      // Fetch project names
      const projectIds = assignments.map(a => a.projectId);
      const projects = await this.projectModel.find({ _id: { $in: projectIds } }).exec();
      const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));
      return assignments.map(a => ({
        ...a.toObject(),
        projectName: projectMap.get(a.projectId.toString()) || 'Unknown Project',
      }));
    }

    // Org-admin can only view assignments from their organization
    if (user.role === UserRole.ORG_ADMIN) {
      const currentUser = await this.usersService.findOneById(user.userId);
      if (!currentUser?.organizationId) {
        throw new ForbiddenException('You are not assigned to an organization');
      }

      // Check if target user is in the same organization
      if (!targetUser.organizationId || targetUser.organizationId.toString() !== currentUser.organizationId.toString()) {
        throw new ForbiddenException('You can only view assignments for users in your organization');
      }

      const assignments = await this.projectAssignmentsService.findByUser(userId);
      // Fetch project names
      const projectIds = assignments.map(a => a.projectId);
      const projects = await this.projectModel.find({ _id: { $in: projectIds } }).exec();
      const projectMap = new Map(projects.map(p => [p._id.toString(), p.name]));
      return assignments.map(a => ({
        ...a.toObject(),
        projectName: projectMap.get(a.projectId.toString()) || 'Unknown Project',
      }));
    }

    throw new ForbiddenException('Only administrators and org-admins can view assignments');
  }

  /** Remove a project assignment */
  async removeAssignment(assignmentId: string, user: any): Promise<any> {
    const assignment = await this.projectAssignmentsService['projectAssignmentModel'].findById(assignmentId).exec();
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Admin can remove any assignment
    if (user.role === UserRole.ADMIN) {
      await this.projectAssignmentsService.remove(assignment.projectId.toString(), assignment.userId.toString());
      return { message: 'Assignment removed successfully' };
    }

    // Org-admin can only remove assignments from their organization
    if (user.role === UserRole.ORG_ADMIN) {
      const currentUser = await this.usersService.findOneById(user.userId);
      if (!currentUser?.organizationId) {
        throw new ForbiddenException('You are not assigned to an organization');
      }

      // Check if the project owner is in the same organization
      const project = await this.projectModel.findById(assignment.projectId).exec();
      if (!project) throw new NotFoundException('Project not found');
      const projectOwner = await this.usersService.findOneById(project.owner.toString());
      if (!projectOwner?.organizationId || projectOwner.organizationId.toString() !== currentUser.organizationId.toString()) {
        throw new ForbiddenException('You can only remove assignments from your organization');
      }

      await this.projectAssignmentsService.remove(assignment.projectId.toString(), assignment.userId.toString());
      return { message: 'Assignment removed successfully' };
    }

    throw new ForbiddenException('Only administrators and org-admins can remove assignments');
  }

  /** Update a project assignment's permissions */
  async updateAssignment(assignmentId: string, permissions: { canView: boolean; canEdit: boolean; canDeploy: boolean }, user: any): Promise<any> {
    const assignment = await this.projectAssignmentsService['projectAssignmentModel'].findById(assignmentId).exec();
    if (!assignment) throw new NotFoundException('Assignment not found');

    // Admin can update any assignment
    if (user.role === UserRole.ADMIN) {
      await this.projectAssignmentsService.assignToUser(
        assignment.projectId.toString(),
        assignment.userId.toString(),
        permissions.canView,
        permissions.canEdit,
        permissions.canDeploy,
      );
      return { message: 'Assignment updated successfully' };
    }

    // Org-admin can only update assignments from their organization
    if (user.role === UserRole.ORG_ADMIN) {
      const currentUser = await this.usersService.findOneById(user.userId);
      if (!currentUser?.organizationId) {
        throw new ForbiddenException('You are not assigned to an organization');
      }

      // Check if the project owner is in the same organization
      const project = await this.projectModel.findById(assignment.projectId).exec();
      if (!project) throw new NotFoundException('Project not found');
      const projectOwner = await this.usersService.findOneById(project.owner.toString());
      if (!projectOwner?.organizationId || projectOwner.organizationId.toString() !== currentUser.organizationId.toString()) {
        throw new ForbiddenException('You can only update assignments from your organization');
      }

      await this.projectAssignmentsService.assignToUser(
        assignment.projectId.toString(),
        assignment.userId.toString(),
        permissions.canView,
        permissions.canEdit,
        permissions.canDeploy,
      );
      return { message: 'Assignment updated successfully' };
    }

    throw new ForbiddenException('Only administrators and org-admins can update assignments');
  }

  /**
   * Extract uploaded dist folder files to a temp directory on the server.
   * Files arrive with their relative paths encoded in file.originalname.
   * Returns the server-side distPath for use in project configuration.
   */
  async extractDistUpload(files: Express.Multer.File[]): Promise<{ distPath: string }> {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const extractPath = path.join('/tmp', 'dist-uploads', uniqueId);

    for (const file of files) {
      // originalname carries the relative path (e.g. "browser/index.html")
      // Sanitize to prevent path traversal attacks
      const safeName = file.originalname.replace(/\.\./g, '').replace(/^\//, '');
      const filePath = path.join(extractPath, safeName);
      const fileDir = path.dirname(filePath);
      fs.mkdirSync(fileDir, { recursive: true });
      fs.writeFileSync(filePath, file.buffer);
    }

    return { distPath: extractPath };
  }
}
