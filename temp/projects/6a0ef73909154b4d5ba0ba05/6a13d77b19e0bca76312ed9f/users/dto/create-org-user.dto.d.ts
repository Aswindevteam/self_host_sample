export declare class CreateOrgUserDto {
    email: string;
    password: string;
    role?: string;
    permissions?: {
        canDeploy?: boolean;
        canEdit?: boolean;
        canView?: boolean;
    };
}
