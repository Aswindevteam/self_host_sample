import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { DeploymentStatus } from '../enums/deployment-status.enum';

export type DeploymentDocument = Deployment & Document;

@Schema({ timestamps: true })
export class Deployment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['PENDING', 'BUILDING', 'RUNNING', 'FAILED'],
    default: 'PENDING',
  })
  status: string;

  @Prop()
  containerId: string;

  @Prop({ type: [String], default: [] })
  logs: string[];

  @Prop()
  imageName: string;
}

export const DeploymentSchema = SchemaFactory.createForClass(Deployment);
