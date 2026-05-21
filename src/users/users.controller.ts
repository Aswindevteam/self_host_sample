import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './enums/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Get()
  async findAllInOrg(@Request() req: any) {
    return this.usersService.findAllInOrg(req.user.organizationId);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Put(':id/projects')
  async assignProjects(
    @Param('id') userId: string,
    @Body('projectIds') projectIds: string[],
    @Body('canDeploy') canDeploy: boolean,
    @Body('canEdit') canEdit: boolean,
    @Body('canView') canView: boolean,
    @Request() req: any,
  ) {
    return this.usersService.assignProjects(userId, projectIds, req.user.organizationId, {
      canDeploy,
      canEdit,
      canView,
    });
  }
}
