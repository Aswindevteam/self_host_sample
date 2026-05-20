import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import { UserRole } from '../enums/user-role.enum';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ default: UserRole.USER, enum: Object.values(UserRole) })
  role: UserRole;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Organization', required: false })
  organization?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
