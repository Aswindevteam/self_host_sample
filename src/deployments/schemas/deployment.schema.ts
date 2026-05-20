import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { DeploymentStatus } from '../enums/deployment-status.enum';

export type DeploymentDocument = Deployment & Document;

@Schema({ timestamps: true })
export class Deployment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  project: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(DeploymentStatus),
    default: DeploymentStatus.PENDING,
  })
  status: DeploymentStatus;

  @Prop()
  containerId: string;

  @Prop({ default: '' })
  logs: string;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);
