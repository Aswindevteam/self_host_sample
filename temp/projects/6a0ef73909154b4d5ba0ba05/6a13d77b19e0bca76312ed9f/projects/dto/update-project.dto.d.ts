export declare class UpdateProjectDto {
    name?: string;
    gitUrl?: string;
    dockerImage?: string;
    distPath?: string;
    branch?: string;
    port?: number;
    domain?: string;
    env?: Record<string, string>;
}
