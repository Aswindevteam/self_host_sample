import { OrganizationsService } from './organizations.service';
export declare class OrganizationsController {
    private orgsService;
    constructor(orgsService: OrganizationsService);
    create(name: string): Promise<import("./schemas/organization.schema").OrganizationDocument>;
    findAll(): Promise<import("./schemas/organization.schema").OrganizationDocument[]>;
    findByIds(ids: string[]): Promise<import("./schemas/organization.schema").OrganizationDocument[]>;
    findOne(id: string, req: any): Promise<import("./schemas/organization.schema").OrganizationDocument | null>;
    update(id: string, req: any, name: string): Promise<import("./schemas/organization.schema").OrganizationDocument | null>;
    remove(id: string): Promise<any>;
}
