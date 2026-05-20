import { DeploymentStatus } from '../enums/deployment-status.enum';

export interface IDeployment {
  id: string;
  project: string;
  status: DeploymentStatus;
  containerId?: string;
  logs: string;
  createdAt: Date;
  updatedAt: Date;
}
