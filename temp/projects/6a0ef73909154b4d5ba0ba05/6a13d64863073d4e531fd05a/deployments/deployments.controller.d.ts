import { DeploymentsService } from './deployments.service';
export declare class DeploymentsController {
    private deploymentsService;
    constructor(deploymentsService: DeploymentsService);
    create(projectId: string, req: any): Promise<import("./schemas/deployment.schema").DeploymentDocument>;
    findAllByProject(projectId: string, req: any): Promise<import("./schemas/deployment.schema").DeploymentDocument[]>;
    findOne(id: string, req: any): Promise<import("./schemas/deployment.schema").DeploymentDocument>;
    rollback(id: string, req: any): Promise<import("./schemas/deployment.schema").DeploymentDocument>;
}
