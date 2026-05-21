import { Controller, Get, Post, Param, UseGuards, Query, Request } from '@nestjs/common';
import { DockerService } from './docker.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('docker')
export class DockerController {
  constructor(private dockerService: DockerService) {}

  @Get('containers')
  async listContainers(@Request() req: any) {
    return this.dockerService.listContainers(req.user);
  }

  @Post('containers/:id/start')
  async startContainer(@Param('id') id: string, @Request() req: any) {
    return this.dockerService.startContainer(id, req.user);
  }

  @Post('containers/:id/stop')
  async stopContainer(@Param('id') id: string, @Request() req: any) {
    return this.dockerService.stopContainer(id, req.user);
  }

  @Post('containers/:id/restart')
  async restartContainer(@Param('id') id: string, @Request() req: any) {
    return this.dockerService.restartContainer(id, req.user);
  }

  @Get('containers/:id/logs')
  async getContainerLogs(@Param('id') id: string, @Request() req: any, @Query('tail') tail?: string) {
    const tailCount = tail ? parseInt(tail, 10) : 200;
    const logs = await this.dockerService.getContainerLogs(id, req.user, tailCount);
    return { logs };
  }
}
