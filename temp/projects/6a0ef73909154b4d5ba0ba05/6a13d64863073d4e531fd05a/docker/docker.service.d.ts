import { IContainerInfo } from './interfaces/container-info.interface';
import { ProjectsService } from '../projects/projects.service';
export declare class DockerService {
    private projectsService;
    private docker;
    constructor(projectsService: ProjectsService);
    checkContainerAccess(id: string, user: any): Promise<void>;
    listContainers(user: any): Promise<IContainerInfo[]>;
    startContainer(id: string, user: any): Promise<{
        message: string;
    }>;
    stopContainer(id: string, user: any): Promise<{
        message: string;
    }>;
    restartContainer(id: string, user: any): Promise<{
        message: string;
    }>;
    getContainerLogs(id: string, user: any, tailCount?: number): Promise<string>;
    private cleanDockerLogs;
}
