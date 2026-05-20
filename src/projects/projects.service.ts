import { Injectable, OnModuleInit, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserRole } from '../users/enums/user-role.enum';

@Injectable()
export class ProjectsService implements OnModuleInit {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private orgsService: OrganizationsService,
  ) {}

  async onModuleInit() {
    // Migration: assign default org to projects who don't have one
    const defaultOrg = await this.orgsService.getDefaultOrg();
    if (defaultOrg) {
      await this.projectModel.updateMany(
        { organization: { $exists: false } },
        { $set: { organization: defaultOrg._id } }
      ).exec();
    }
  }

  async create(projectData: CreateProjectDto, user: any): Promise<ProjectDocument> {
    const createdProject = new this.projectModel({
      ...projectData,
      owner: new Types.ObjectId(user.userId),
      organization: user.organizationId ? new Types.ObjectId(user.organizationId) : undefined,
    });
    return createdProject.save();
  }

  async findAll(user: any): Promise<ProjectDocument[]> {
    if (user.role === UserRole.ADMIN) {
      return this.projectModel.find().exec();
    }
    if (!user.organizationId) {
      return [];
    }
    return this.projectModel.find({ organization: new Types.ObjectId(user.organizationId) }).exec();
  }

  async findOne(id: string, user: any): Promise<ProjectDocument> {
    const project = await this.projectModel.findById(id).exec();
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (user.role !== UserRole.ADMIN) {
      if (!project.organization || project.organization.toString() !== user.organizationId) {
        throw new UnauthorizedException('Access denied');
      }
    }
    return project;
  }

  async update(
    id: string,
    updateData: UpdateProjectDto,
    user: any,
  ): Promise<ProjectDocument> {
    const project = await this.findOne(id, user);
    Object.assign(project, updateData);
    return project.save();
  }

  async remove(id: string, user: any): Promise<any> {
    await this.findOne(id, user);
    return this.projectModel.findByIdAndDelete(id).exec();
  }
}
