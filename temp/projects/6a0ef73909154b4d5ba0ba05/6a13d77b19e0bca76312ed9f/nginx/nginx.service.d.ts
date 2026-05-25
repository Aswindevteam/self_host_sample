export declare class NginxService {
    private readonly logger;
    private readonly sitesAvailableDir;
    private readonly sitesEnabledDir;
    private readonly localConfigDir;
    private useSystemDirs;
    constructor();
    configureDomain(projectId: string, domain: string, port: number): Promise<void>;
    removeDomain(projectId: string): Promise<void>;
}
