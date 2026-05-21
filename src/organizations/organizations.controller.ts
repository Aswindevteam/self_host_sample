import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Body('name') name: string) {
    return this.orgsService.create(name);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  async findAll() {
    return this.orgsService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @Post('batch')
  async findByIds(@Body('ids') ids: string[]) {
    return this.orgsService.findByIds(ids);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.USER)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== UserRole.ADMIN && req.user.organizationId !== id) {
      throw new ForbiddenException('You can only access your own organization');
    }
    return this.orgsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req: any,
    @Body('name') name: string,
  ) {
    if (req.user.role !== UserRole.ADMIN && req.user.organizationId !== id) {
      throw new ForbiddenException('You can only update your own organization');
    }
    return this.orgsService.update(id, { name });
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.orgsService.remove(id);
  }
}
