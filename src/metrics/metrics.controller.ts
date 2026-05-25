import { Controller, Get, Request, UseGuards, Query } from '@nestjs/common';
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
  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  async getApiUsage(@Request() req: any, @Query('limit') limitStr?: string) {
    const user = req.user;
    const limit = limitStr ? parseInt(limitStr, 10) : 10;
    
    // Admin sees all usage by default (or can pass orgId if implemented later).
    // OrgAdmin only sees usage for their organization.
    let organizationId = undefined;
    if (user.role === UserRole.ORG_ADMIN) {
      organizationId = user.organizationId;
    }
    
    return this.metricsService.getTopApis(organizationId, limit);
  }
}
