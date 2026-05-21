import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private orgsService: OrganizationsService,
  ) {}

  @Post('signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto.email, signupDto.password);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-organization')
  async createOrganization(
    @Request() req: any,
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    if (!name) {
      throw new UnauthorizedException('Organization name is required');
    }
    const org = await this.orgsService.create(name, description);
    const userId = req.user.userId;
    const updatedUser = await this.usersService.updateOrganization(userId, org._id);
    return this.authService.login(updatedUser);
  }
}
