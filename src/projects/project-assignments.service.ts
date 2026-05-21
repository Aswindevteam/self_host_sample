import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProjectAssignment, ProjectAssignmentDocument } from './schemas/project-assignment.schema';

@Injectable()
export class ProjectAssignmentsService {
  constructor(
    @InjectModel(ProjectAssignment.name) private projectAssignmentModel: Model<ProjectAssignmentDocument>,
  ) {}

  async assignToUser(
    projectId: string,
    userId: string,
    canView: boolean = true,
    canEdit: boolean = false,
    canDeploy: boolean = false,
  ): Promise<ProjectAssignmentDocument> {
    const existing = await this.projectAssignmentModel.findOne({ projectId, userId }).exec();
    if (existing) {
      existing.canView = canView;
      existing.canEdit = canEdit;
      existing.canDeploy = canDeploy;
      return existing.save();
    }

    const created = new this.projectAssignmentModel({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
      canView,
      canEdit,
      canDeploy,
    });
    return created.save();
  }

  async findByUser(userId: string): Promise<ProjectAssignmentDocument[]> {
    return this.projectAssignmentModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async findByProject(projectId: string): Promise<ProjectAssignmentDocument[]> {
    return this.projectAssignmentModel.find({ projectId: new Types.ObjectId(projectId) }).exec();
  }

  async remove(projectId: string, userId: string): Promise<void> {
    await this.projectAssignmentModel.deleteOne({ projectId, userId }).exec();
  }

  async hasAccess(projectId: string, userId: string): Promise<boolean> {
    const assignment = await this.projectAssignmentModel.findOne({
      projectId: new Types.ObjectId(projectId),
      userId: new Types.ObjectId(userId),
    }).exec();
    return !!assignment && assignment.canView;
  }
}
