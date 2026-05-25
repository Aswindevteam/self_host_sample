import { UsersService } from './users.service';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAllInOrg(req: any): Promise<import("./schemas/user.schema").UserDocument[]>;
    updatePermissions(userId: string, canDeploy: boolean, canEdit: boolean, canView: boolean, req: any): Promise<import("./schemas/user.schema").UserDocument>;
    updateRole(userId: string, role: string, req: any): Promise<import("./schemas/user.schema").UserDocument>;
    createOrgAdmin(createOrgAdminDto: CreateOrgAdminDto, req: any): Promise<{
        message: string;
        user: {
            id: import("mongoose").Types.ObjectId;
            email: string;
            role: string;
            organizationId: import("mongoose").Types.ObjectId | undefined;
        };
    }>;
    createOrgUser(createOrgUserDto: CreateOrgUserDto, req: any): Promise<{
        message: string;
        user: {
            id: import("mongoose").Types.ObjectId;
            email: string;
            role: string;
            organizationId: import("mongoose").Types.ObjectId | undefined;
        };
    }>;
}
