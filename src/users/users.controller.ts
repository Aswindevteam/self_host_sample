import { Controller, Get, Post, Put, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';
import { CreateOrgAdminDto } from './dto/create-org-admin.dto';
import { CreateOrgUserDto } from './dto/create-org-user.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.USER)
  @Get()
  async findAllInOrg(@Request() req: any) {
    return this.usersService.findAllInOrg(req.user.organizationId);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Put(':id/permissions')
  async updatePermissions(
    @Param('id') userId: string,
    @Body('canDeploy') canDeploy: boolean,
    @Body('canEdit') canEdit: boolean,
    @Body('canView') canView: boolean,
    @Request() req: any,
  ) {
    return this.usersService.updatePermissions(userId, req.user.organizationId, {
      canDeploy,
      canEdit,
      canView,
    });
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Put(':id/role')
  async updateRole(
    @Param('id') userId: string,
    @Body('role') role: string,
    @Request() req: any,
  ) {
    return this.usersService.updateRole(userId, role, req.user.organizationId);
  }

  @Roles(UserRole.ADMIN)
  @Post('create-org-admin')
  async createOrgAdmin(@Body() createOrgAdminDto: CreateOrgAdminDto, @Request() req: any) {
    const user = await this.usersService.createOrgAdmin(
      createOrgAdminDto.email,
      createOrgAdminDto.password,
      createOrgAdminDto.organizationName,
    );
    return {
      message: 'Org admin created successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  @Roles(UserRole.ORG_ADMIN)
  @Post('create-org-user')
  async createOrgUser(@Body() createOrgUserDto: CreateOrgUserDto, @Request() req: any) {
    const user = await this.usersService.createOrgUser(
      createOrgUserDto.email,
      createOrgUserDto.password,
      createOrgUserDto.role || 'user',
      createOrgUserDto.permissions || {},
      req.user.organizationId,
    );
    return {
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}
