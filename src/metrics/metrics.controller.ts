import { Controller, Get, Request, UseGuards, Query, Param } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@Controller('metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('api-usage')
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.USER)
  async getApiUsage(@Request() req: any, @Query('limit') limitStr?: string, @Query('orgId') orgId?: string) {
    const user = req.user;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    
    let organizationId: string | undefined;
    if (user.role === UserRole.ORG_ADMIN || user.role === UserRole.USER) {
      organizationId = user.organizationId;
    } else if (user.role === UserRole.ADMIN && orgId) {
      organizationId = orgId;
    }
    
    return this.metricsService.getTopApis(organizationId, limit);
  }

  @Get('deployed-usage')
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN, UserRole.USER)
  async getDeployedUsage(@Request() req: any, @Query('limit') limitStr?: string, @Query('orgId') orgId?: string) {
    const user = req.user;
    
    let organizationId:string | undefined = undefined;
    if (user.role === UserRole.ORG_ADMIN || user.role === UserRole.USER) {
      organizationId = user.organizationId;
    } else if (user.role === UserRole.ADMIN && orgId) {
      organizationId = orgId;
    }
    
    return this.metricsService.getDeployedAppsUsage(organizationId);
  }
}
