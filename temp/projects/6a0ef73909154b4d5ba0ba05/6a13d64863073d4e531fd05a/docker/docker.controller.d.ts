import { DockerService } from './docker.service';
export declare class DockerController {
    private dockerService;
    constructor(dockerService: DockerService);
    listContainers(req: any): Promise<import("./interfaces/container-info.interface").IContainerInfo[]>;
    startContainer(id: string, req: any): Promise<{
        message: string;
    }>;
    stopContainer(id: string, req: any): Promise<{
        message: string;
    }>;
    restartContainer(id: string, req: any): Promise<{
        message: string;
    }>;
    getContainerLogs(id: string, req: any, tail?: string): Promise<{
        logs: string;
    }>;
}
