import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  members: Types.ObjectId[];
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
