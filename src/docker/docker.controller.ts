import { Controller, Get, Post, Param, UseGuards, Query } from '@nestjs/common';
import { DockerService } from './docker.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('docker')
export class DockerController {
  constructor(private dockerService: DockerService) {}

  @Get('containers')
  async listContainers() {
    return this.dockerService.listContainers();
  }

  @Post('containers/:id/start')
  async startContainer(@Param('id') id: string) {
    return this.dockerService.startContainer(id);
  }

  @Post('containers/:id/stop')
  async stopContainer(@Param('id') id: string) {
    return this.dockerService.stopContainer(id);
  }

  @Post('containers/:id/restart')
  async restartContainer(@Param('id') id: string) {
    return this.dockerService.restartContainer(id);
  }

  @Get('containers/:id/logs')
  async getContainerLogs(@Param('id') id: string, @Query('tail') tail?: string) {
    const tailCount = tail ? parseInt(tail, 10) : 200;
    const logs = await this.dockerService.getContainerLogs(id, tailCount);
    return { logs };
  }
}
