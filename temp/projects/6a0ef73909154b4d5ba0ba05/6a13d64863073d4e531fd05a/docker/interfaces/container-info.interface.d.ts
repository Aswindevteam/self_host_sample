import { ContainerState } from '../enums/container-state.enum';
export interface IContainerInfo {
    id: string;
    names: string[];
    image: string;
    state: ContainerState;
    status: string;
    ports: any[];
    projectName?: string;
    deploymentId?: string;
}
