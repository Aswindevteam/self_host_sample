import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ProjectAssignmentDocument = ProjectAssignment & Document;

@Schema({ timestamps: true })
export class ProjectAssignment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: true })
  canView: boolean;

  @Prop({ default: false })
  canEdit: boolean;

  @Prop({ default: false })
  canDeploy: boolean;
}

export const ProjectAssignmentSchema = SchemaFactory.createForClass(ProjectAssignment);

// Compound index for efficient lookups
ProjectAssignmentSchema.index({ projectId: 1, userId: 1 }, { unique: true });
