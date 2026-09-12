import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ActivityType } from '@/types';

export interface IActivityDocument extends Document {
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  type: ActivityType;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivityDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'APPLICATION_CREATED',
        'INTERVIEW_IMPORTED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_RESCHEDULED',
        'INTERVIEW_COMPLETED',
        'INTERVIEW_CANCELLED',
        'REVIEW_ADDED',
        'STATUS_CHANGED',
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
ActivitySchema.index({ userId: 1, applicationId: 1, createdAt: -1 });

const Activity: Model<IActivityDocument> =
  mongoose.models.Activity || mongoose.model<IActivityDocument>('Activity', ActivitySchema);

export default Activity;
