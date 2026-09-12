import mongoose, { Schema, Document, Model } from 'mongoose';
import type { UserRole, UserStatus } from '@/types';

export interface IUserDocument extends Document {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
    },
    status: {
      type: String,
      enum: ['PENDING_VERIFICATION', 'ACTIVE', 'DISABLED', 'DELETED'],
      default: 'PENDING_VERIFICATION',
    },
    emailVerifiedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ status: 1 });

// Remove password hash from JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

const User: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
