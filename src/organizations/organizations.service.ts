import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';

@Injectable()
export class OrganizationsService implements OnModuleInit {
  constructor(
    @InjectModel(Organization.name) private orgModel: Model<OrganizationDocument>,
  ) {}

  async onModuleInit() {
    await this.getDefaultOrg();
  }

  async getDefaultOrg(): Promise<OrganizationDocument> {
    let defaultOrg = await this.orgModel.findOne({ name: 'Default Organization' }).exec();
    if (!defaultOrg) {
      defaultOrg = await this.orgModel.create({
        name: 'Default Organization',
      });
      console.log('[OrganizationsService] Created Default Organization');
    }
    return defaultOrg;
  }

  async create(name: string): Promise<OrganizationDocument> {
    return this.orgModel.create({ name });
  }

  async findAll(): Promise<OrganizationDocument[]> {
    return this.orgModel.find().exec();
  }

  async findByIds(ids: string[]): Promise<OrganizationDocument[]> {
    return this.orgModel.find({ _id: { $in: ids } }).exec();
  }

  async findOne(id: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findById(id).exec();
  }

  async update(id: string, updateData: Partial<Organization>): Promise<OrganizationDocument | null> {
    return this.orgModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async remove(id: string): Promise<any> {
    return this.orgModel.findByIdAndDelete(id).exec();
  }
}
