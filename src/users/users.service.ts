import { Injectable, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserRole } from './enums/user-role.enum';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private orgsService: OrganizationsService,
  ) {}

  async onModuleInit() {
    // Migration: assign default org to users who don't have one
    const defaultOrg = await this.orgsService.getDefaultOrg();
    if (defaultOrg) {
      await this.userModel.updateMany(
        { organization: { $exists: false } },
        { $set: { organization: defaultOrg._id } }
      ).exec();

      // Seed developer@launchpad.local if it doesn't exist
      const existingDev = await this.userModel.findOne({ email: 'developer@launchpad.local' }).exec();
      if (!existingDev) {
        const passwordHash = await bcrypt.hash('password123', 10);
        await this.userModel.create({
          email: 'developer@launchpad.local',
          passwordHash,
          role: UserRole.USER,
          organization: defaultOrg._id,
        });
        console.log('[UsersService] Seeded developer@launchpad.local user');
      }
    }
  }

  async create(email: string, passwordPlain: string, role: UserRole = UserRole.USER): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const createdUser = new this.userModel({
      email,
      passwordHash,
      role,
      organization: undefined,
    });
    return createdUser.save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).populate('organization').exec();
  }

  async findOneById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateOrganization(id: string, orgId: any): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, { organization: orgId }, { new: true }).populate('organization').exec();
  }

  async findAllInOrg(orgId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ organization: new Types.ObjectId(orgId) })
      .populate('assignedProjects')
      .exec();
  }

  async assignProjects(
    userId: string,
    projectIds: string[],
    orgId: string,
    permissions?: { canDeploy?: boolean; canEdit?: boolean; canView?: boolean }
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.organization?.toString() !== orgId) {
      throw new ForbiddenException('User does not belong to your organization');
    }
    user.assignedProjects = projectIds.map(id => new Types.ObjectId(id));
    if (permissions) {
      if (permissions.canDeploy !== undefined) user.canDeploy = permissions.canDeploy;
      if (permissions.canEdit !== undefined) user.canEdit = permissions.canEdit;
      if (permissions.canView !== undefined) user.canView = permissions.canView;
    }
    return user.save();
  }
}
