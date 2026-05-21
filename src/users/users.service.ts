import { Injectable, OnModuleInit, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private orgsService: OrganizationsService,
  ) {}

  async onModuleInit() {
    // Seed admin user if it doesn't exist (can handle all organizations)
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

    // Migration: assign default org to users who don't have one
    const defaultOrg = await this.orgsService.getDefaultOrg();
    if (defaultOrg) {
      await this.userModel.updateMany(
        { organizationId: { $exists: false } },
        { $set: { organizationId: defaultOrg._id } }
      ).exec();

      // Migration: convert uppercase roles to lowercase
      await this.userModel.updateMany(
        { role: 'ADMIN' },
        { $set: { role: 'admin' } }
      ).exec();
      await this.userModel.updateMany(
        { role: 'ORG_ADMIN' },
        { $set: { role: 'org-admin' } }
      ).exec();
      await this.userModel.updateMany(
        { role: 'USER' },
        { $set: { role: 'user' } }
      ).exec();
    }
  }

  async create(email: string, passwordPlain: string, role: string = 'user'): Promise<UserDocument> {
    const password = await bcrypt.hash(passwordPlain, 10);
    const createdUser = new this.userModel({
      email,
      password,
      role,
      organizationId: undefined,
    });
    return createdUser.save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findOneById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateOrganization(id: string, orgId: any): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, { organizationId: orgId }, { new: true }).exec();
  }

  async findAllInOrg(orgId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ organizationId: new Types.ObjectId(orgId) })
      .exec();
  }

  async updatePermissions(
    userId: string,
    orgId: string,
    permissions?: { canDeploy?: boolean; canEdit?: boolean; canView?: boolean }
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.organizationId?.toString() !== orgId) {
      throw new ForbiddenException('User does not belong to your organization');
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

  async createOrgAdmin(email: string, password: string, organizationName: string): Promise<UserDocument> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create organization
    const org = await this.orgsService.create(organizationName);

    // Create user with org-admin role and organization
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

  async createOrgUser(
    email: string,
    password: string,
    role: string,
    permissions: { canDeploy?: boolean; canEdit?: boolean; canView?: boolean },
    organizationId: string
  ): Promise<UserDocument> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate role
    if (role !== 'user' && role !== 'org-admin') {
      throw new ForbiddenException('Invalid role for org user creation');
    }

    // Create user with specified role and organization
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      role,
      organizationId: new Types.ObjectId(organizationId),
      permissions: permissions || {
        canDeploy: true,
        canEdit: true,
        canView: true,
      },
    });

    return user;
  }

  async updateRole(userId: string, role: string, orgId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    // Verify user is in the same organization
    if (user.organizationId?.toString() !== orgId) {
      throw new ForbiddenException('You can only update role for users in your organization');
    }

    // Validate role
    const validRoles = ['user', 'org-admin'];
    if (!validRoles.includes(role)) {
      throw new ForbiddenException('Invalid role');
    }

    user.role = role;
    return user.save();
  }
}
