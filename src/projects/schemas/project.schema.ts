import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  gitUrl?: string;

  @Prop({ trim: true })
  dockerImage?: string;

  @Prop({ trim: true })
  distPath?: string;

  @Prop({ default: 'main' })
  branch?: string;

  @Prop({ default: 3000 })
  port: number;

  @Prop({ trim: true, unique: true, sparse: true })
  domain?: string;

  @Prop({ type: Map, of: String, default: {} })
  env: Map<string, string>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
