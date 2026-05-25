import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
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
    signup(email: string, pass: string): Promise<{
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
