import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectAssignment, ProjectAssignmentSchema } from './schemas/project-assignment.schema';
import { NginxConfigHistory, NginxConfigHistorySchema } from './schemas/nginx-config-history.schema';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { ProjectAssignmentsService } from './project-assignments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectAssignment.name, schema: ProjectAssignmentSchema },
      { name: NginxConfigHistory.name, schema: NginxConfigHistorySchema },
    ]),
    OrganizationsModule,
    UsersModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAssignmentsService],
  exports: [ProjectsService, ProjectAssignmentsService],
})
export class ProjectsModule {}
