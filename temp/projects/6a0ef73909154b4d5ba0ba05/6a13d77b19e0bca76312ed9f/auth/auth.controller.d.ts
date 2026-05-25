import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
export declare class AuthController {
    private authService;
    private usersService;
    private orgsService;
    constructor(authService: AuthService, usersService: UsersService, orgsService: OrganizationsService);
    signup(signupDto: SignupDto): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            organizationId: any;
            canDeploy: any;
            canEdit: any;
            canView: any;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            organizationId: any;
            canDeploy: any;
            canEdit: any;
            canView: any;
        };
    }>;
    getProfile(req: any): any;
    createOrganization(req: any, name: string): Promise<{
        access_token: string;
        user: {
            id: any;
            email: any;
            role: any;
            organizationId: any;
            canDeploy: any;
            canEdit: any;
            canView: any;
        };
    }>;
}
