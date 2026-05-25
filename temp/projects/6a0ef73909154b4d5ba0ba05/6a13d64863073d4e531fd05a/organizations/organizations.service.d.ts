import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
export declare class OrganizationsService implements OnModuleInit {
    private orgModel;
    constructor(orgModel: Model<OrganizationDocument>);
    onModuleInit(): Promise<void>;
    getDefaultOrg(): Promise<OrganizationDocument>;
    create(name: string): Promise<OrganizationDocument>;
    findAll(): Promise<OrganizationDocument[]>;
    findByIds(ids: string[]): Promise<OrganizationDocument[]>;
    findOne(id: string): Promise<OrganizationDocument | null>;
    update(id: string, updateData: Partial<Organization>): Promise<OrganizationDocument | null>;
    remove(id: string): Promise<any>;
}
