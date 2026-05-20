import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';
import { Deployment, DeploymentSchema } from './schemas/deployment.schema';
import { ProjectsModule } from '../projects/projects.module';
import { NginxModule } from '../nginx/nginx.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Deployment.name, schema: DeploymentSchema }]),
    ProjectsModule,
    NginxModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
