import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    // Migration: assign default org to users who don't have one
    const defaultOrg = await this.orgsService.getDefaultOrg();
    if (defaultOrg) {
      await this.userModel.updateMany(
        { organization: { $exists: false } },
        { $set: { organization: defaultOrg._id } }
      ).exec();
    }
  }

  async create(email: string, passwordPlain: string, role = 'user'): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(passwordPlain, 10);
    const defaultOrg = await this.orgsService.getDefaultOrg();
    const createdUser = new this.userModel({
      email,
      passwordHash,
      role,
      organization: defaultOrg?._id,
    });
    return createdUser.save();
  }

  async findOneByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findOneById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }
}
