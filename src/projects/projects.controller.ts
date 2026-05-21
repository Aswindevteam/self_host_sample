import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(createProjectDto, req.user);
  }

  @Get()
  async findAll(@Request() req: any) {
    return this.projectsService.findAll(req.user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.findOne(id, req.user);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @Request() req: any,
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(id, req.user);
  }
}
