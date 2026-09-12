import mongoose, { Schema, Document, Model } from 'mongoose';
import type { InterviewType, InterviewStatus, InterviewHistoryEntry } from '@/types';

export interface IInterviewDocument extends Document {
  userId: mongoose.Types.ObjectId;
  applicationId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  scheduledStart: Date;
  scheduledEnd: Date | null;
  timezone: string;
  type: InterviewType;
  location: string;
  meetingUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  status: InterviewStatus;
  notes: string;
  history: InterviewHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const InterviewHistorySchema = new Schema(
  {
    type: {
      type: String,
      enum: ['CREATED', 'RESCHEDULED'],
      required: true,
    },
    from: {
      type: Date,
      default: null,
    },
    to: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const InterviewSchema = new Schema<IInterviewDocument>(
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
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    scheduledStart: {
      type: Date,
      required: true,
    },
    scheduledEnd: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      default: 'Asia/Ho_Chi_Minh',
    },
    type: {
      type: String,
      enum: ['OFFLINE', 'ONLINE', 'PHONE', 'OTHER'],
      default: 'OFFLINE',
    },
    location: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    meetingUrl: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    contactName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
      maxlength: 255,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 20,
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW'],
      default: 'SCHEDULED',
    },
    notes: {
      type: String,
      default: '',
      maxlength: 10000,
    },
    history: {
      type: [InterviewHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
InterviewSchema.index({ userId: 1, scheduledStart: 1 });
InterviewSchema.index({ userId: 1, applicationId: 1 });
InterviewSchema.index({ userId: 1, status: 1 });
InterviewSchema.index({ userId: 1, companyId: 1 });

const Interview: Model<IInterviewDocument> =
  mongoose.models.Interview ||
  mongoose.model<IInterviewDocument>('Interview', InterviewSchema);

export default Interview;
