import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'user', enum: ['admin', 'org-admin', 'user'] })
  role: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, required: false })
  organizationId?: Types.ObjectId;

  @Prop({
    type: {
      canDeploy: { type: Boolean, default: true },
      canEdit: { type: Boolean, default: true },
      canView: { type: Boolean, default: true },
    },
    default: {
      canDeploy: true,
      canEdit: true,
      canView: true,
    },
  })
  permissions?: {
    canDeploy: boolean;
    canEdit: boolean;
    canView: boolean;
  };
}

export const UserSchema = SchemaFactory.createForClass(User);
