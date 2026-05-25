import { Model } from 'mongoose';
import { DeploymentDocument } from './schemas/deployment.schema';
import { ProjectsService } from '../projects/projects.service';
import { NginxService } from '../nginx/nginx.service';
export declare class DeploymentsService {
    private deploymentModel;
    private projectsService;
    private nginxService;
    private readonly logger;
    constructor(deploymentModel: Model<DeploymentDocument>, projectsService: ProjectsService, nginxService: NginxService);
    create(projectId: string, user: any): Promise<DeploymentDocument>;
    findAllByProject(projectId: string, user: any): Promise<DeploymentDocument[]>;
    findOne(id: string, user: any): Promise<DeploymentDocument>;
    updateStatus(id: string, status: string, logLine?: string): Promise<DeploymentDocument>;
    private startBuildAndDeploy;
    rollback(targetDeploymentId: string, user: any): Promise<DeploymentDocument>;
    private generateDockerfileContent;
}
