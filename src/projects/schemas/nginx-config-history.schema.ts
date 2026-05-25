import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type NginxConfigHistoryDocument = NginxConfigHistory & Document;

@Schema({ timestamps: true })
export class NginxConfigHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  configContent: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;
}

export const NginxConfigHistorySchema = SchemaFactory.createForClass(NginxConfigHistory);
