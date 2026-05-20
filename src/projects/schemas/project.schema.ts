import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type ProjectDocument = Project & Document;

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ trim: true })
  gitUrl?: string;

  @Prop({ trim: true })
  dockerImage?: string;

  @Prop({ default: 'main' })
  branch?: string;

  @Prop({ default: 3000 })
  port: number;

  @Prop({ trim: true, unique: true, sparse: true })
  domain?: string;

  @Prop({ type: Map, of: String, default: {} })
  envVariables: Map<string, string>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: false })
  organization?: Types.ObjectId;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
