import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AssignProjectDto } from './dto/assign-project.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  async create(@Body() createProjectDto: CreateProjectDto, @Request() req: any) {
    return this.projectsService.create(createProjectDto, req.user);
  }

  @Post('upload-dist')
  @UseInterceptors(FilesInterceptor('files', 2000, { storage: memoryStorage() }))
  async uploadDist(@UploadedFiles() files: Express.Multer.File[]) {
    return this.projectsService.extractDistUpload(files);
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

  @Get(':id/nginx-history')
  async getNginxConfigHistory(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.getNginxConfigHistory(id, req.user);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.projectsService.remove(id, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Post('assign')
  async assignToUser(@Body() assignProjectDto: AssignProjectDto, @Request() req: any) {
    return this.projectsService.assignToUser(assignProjectDto, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Get('assignments/user/:userId')
  async getUserAssignments(@Param('userId') userId: string, @Request() req: any) {
    return this.projectsService.getUserAssignments(userId, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Delete('assignments/:assignmentId')
  async removeAssignment(@Param('assignmentId') assignmentId: string, @Request() req: any) {
    return this.projectsService.removeAssignment(assignmentId, req.user);
  }

  @Roles(UserRole.ADMIN, UserRole.ORG_ADMIN)
  @Put('assignments/:assignmentId')
  async updateAssignment(
    @Param('assignmentId') assignmentId: string,
    @Body('canView') canView: boolean,
    @Body('canEdit') canEdit: boolean,
    @Body('canDeploy') canDeploy: boolean,
    @Request() req: any,
  ) {
    return this.projectsService.updateAssignment(assignmentId, { canView, canEdit, canDeploy }, req.user);
  }
}
