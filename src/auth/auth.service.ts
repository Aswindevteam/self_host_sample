import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.passwordHash))) {
      const { passwordHash, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(user: any) {
    const organizationId = user.organization?._id?.toString() || user.organization?.toString();
    const organizationName = user.organization?.name || undefined;
    const payload = {
      email: user.email,
      sub: user._id,
      role: user.role,
      organizationId,
      organizationName,
      canDeploy: user.canDeploy ?? true,
      canEdit: user.canEdit ?? true,
      canView: user.canView ?? true,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId,
        organizationName,
        canDeploy: user.canDeploy ?? true,
        canEdit: user.canEdit ?? true,
        canView: user.canView ?? true,
      },
    };
  }

  async signup(email: string, pass: string) {
    const existing = await this.usersService.findOneByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const user = await this.usersService.create(email, pass);
    return this.login(user);
  }
}
