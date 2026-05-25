import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ApiMetricDocument = ApiMetric & Document;

@Schema({ timestamps: true })
export class ApiMetric {
  @Prop({ required: true })
  endpoint: string;

  @Prop({ required: true })
  method: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: string;

  @Prop({ default: 1 })
  count: number;
}

export const ApiMetricSchema = SchemaFactory.createForClass(ApiMetric);
