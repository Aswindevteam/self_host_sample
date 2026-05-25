import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
import { UserDocument } from './schemas/user.schema';
import { OrganizationsService } from '../organizations/organizations.service';
export declare class UsersService implements OnModuleInit {
    private userModel;
    private orgsService;
    constructor(userModel: Model<UserDocument>, orgsService: OrganizationsService);
    onModuleInit(): Promise<void>;
    create(email: string, passwordPlain: string, role?: string): Promise<UserDocument>;
    findOneByEmail(email: string): Promise<UserDocument | null>;
    findOneById(id: string): Promise<UserDocument | null>;
    updateOrganization(id: string, orgId: any): Promise<UserDocument | null>;
    findAllInOrg(orgId: string): Promise<UserDocument[]>;
    updatePermissions(userId: string, orgId: string, permissions?: {
        canDeploy?: boolean;
        canEdit?: boolean;
        canView?: boolean;
    }): Promise<UserDocument>;
    createOrgAdmin(email: string, password: string, organizationName: string): Promise<UserDocument>;
    createOrgUser(email: string, password: string, role: string, permissions: {
        canDeploy?: boolean;
        canEdit?: boolean;
        canView?: boolean;
    }, organizationId: string): Promise<UserDocument>;
    updateRole(userId: string, role: string, orgId: string): Promise<UserDocument>;
}
