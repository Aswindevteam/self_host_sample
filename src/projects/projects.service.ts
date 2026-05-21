import { Injectable, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService implements OnModuleInit {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private orgsService: OrganizationsService,
    private usersService: UsersService,
  ) {}

  async onModuleInit() {
    // Migration: assign default org to any projects missing one
    const defaultOrg = await this.orgsService.getDefaultOrg();
    if (defaultOrg) {
      await this.projectModel.updateMany(
        { organization: { $exists: false } },
        { $set: { organization: defaultOrg._id } },
      ).exec();
    }
  }

  /** Create a project owned by the requesting user inside their org */
  async create(projectData: CreateProjectDto, user: any): Promise<ProjectDocument> {
    const createdProject = new this.projectModel({
      ...projectData,
      owner: new Types.ObjectId(user.userId),
      organization: user.organizationId ? new Types.ObjectId(user.organizationId) : undefined,
    });
    return createdProject.save();
  }

  /**
   * findAll:
   *   Admin/Org Admin → all projects in their org
   *   User             → projects owned by this user or projects assigned to them in their org
   */
  async findAll(user: any): Promise<ProjectDocument[]> {
    if (!user.organizationId) return [];

    const orgFilter = { organization: new Types.ObjectId(user.organizationId) };

    if (user.role === UserRole.ADMIN || user.role === UserRole.ORG_ADMIN) {
      // Admin/Org Admin sees every project in the org
      return this.projectModel.find(orgFilter).populate('owner', 'email').exec();
    }

    // Fetch user details to get assignedProjects
    const userDoc = await this.usersService.findOneById(user.userId);
    const assignedProjects = userDoc?.assignedProjects || [];

    // Regular user sees only their own or assigned projects
    return this.projectModel
      .find({
        ...orgFilter,
        $or: [
          { owner: new Types.ObjectId(user.userId) },
          { _id: { $in: assignedProjects } },
        ],
      })
      .populate('owner', 'email')
      .exec();
  }

  /**
   * findOne:
   *   Admin/Org Admin → any project in their org
   *   User             → only their own or assigned projects
   */
  async findOne(id: string, user: any): Promise<ProjectDocument> {
    if (!user.organizationId) throw new ForbiddenException('No organization assigned');

    const project = await this.projectModel.findById(id).populate('owner', 'email').exec();
    if (!project) throw new NotFoundException('Project not found');

    // Must be in same org
    if (project.organization?.toString() !== user.organizationId) {
      throw new ForbiddenException('Access denied');
    }

    // User can only access their own or assigned projects
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ORG_ADMIN) {
      const userDoc = await this.usersService.findOneById(user.userId);
      const isAssigned = userDoc?.assignedProjects?.some(
        (projId) => projId.toString() === id,
      );
      if (project.owner?.toString() !== user.userId && !isAssigned) {
        throw new ForbiddenException('You can only access your own or assigned projects');
      }
    }

    return project;
  }

  /** Update: admin/org-admin can update any org project; user only their own or assigned if edit permission is granted */
  async update(id: string, updateData: UpdateProjectDto, user: any): Promise<ProjectDocument> {
    const project = await this.findOne(id, user); // enforces visibility/org match

    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ORG_ADMIN) {
      const userDoc = await this.usersService.findOneById(user.userId);
      
      // Check edit permissions
      if (userDoc?.canEdit === false) {
        throw new ForbiddenException('You do not have permission to edit projects');
      }

      const isOwner = project.owner?.toString() === user.userId;
      const isAssigned = userDoc?.assignedProjects?.some(
        (projId) => projId.toString() === id,
      );

      if (!isOwner && !isAssigned) {
        throw new ForbiddenException('You can only update your own or assigned projects');
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
    return project.save();
  }

  /** Delete: admin or org-admin only */
  async remove(id: string, user: any): Promise<any> {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.ORG_ADMIN) {
      throw new ForbiddenException('Only administrators can delete projects');
    }
    const project = await this.projectModel.findById(id).exec();
    if (!project) throw new NotFoundException('Project not found');
    if (project.organization?.toString() !== user.organizationId) {
      throw new ForbiddenException('Access denied');
    }
    return this.projectModel.findByIdAndDelete(id).exec();
  }
}
