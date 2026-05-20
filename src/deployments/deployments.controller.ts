import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('deployments')
export class DeploymentsController {
  constructor(private deploymentsService: DeploymentsService) {}

  @Post('project/:projectId')
  async create(@Param('projectId') projectId: string, @Request() req: any) {
    return this.deploymentsService.create(projectId, req.user.userId);
  }

  @Get('project/:projectId')
  async findAllByProject(@Param('projectId') projectId: string, @Request() req: any) {
    return this.deploymentsService.findAllByProject(projectId, req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.deploymentsService.findOne(id, req.user.userId);
  }

  @Post(':id/rollback')
  async rollback(@Param('id') id: string, @Request() req: any) {
    return this.deploymentsService.rollback(id, req.user.userId);
  }
}
