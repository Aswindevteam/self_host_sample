import { Module } from '@nestjs/common';
import { DockerService } from './docker.service';
import { DockerController } from './docker.controller';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ProjectsModule],
  controllers: [DockerController],
  providers: [DockerService],
  exports: [DockerService],
})
export class DockerModule {}
