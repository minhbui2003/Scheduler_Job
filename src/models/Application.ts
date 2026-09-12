import mongoose, { Schema, Document, Model } from 'mongoose';
import type { ApplicationStatus } from '@/types';

export interface IApplicationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  position: string;
  applicationDate: Date;
  status: ApplicationStatus;
  jdText: string;
  jdFileUrl: string;
  jdOriginalFilename: string;
  cvFileUrl: string;
  cvOriginalFilename: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplicationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    position: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    applicationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: [
        'APPLIED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEWED',
        'WAITING_RESULT',
        'OFFER',
        'REJECTED',
        'WITHDRAWN',
      ],
      default: 'APPLIED',
    },
    jdText: {
      type: String,
      default: '',
      maxlength: 50000,
    },
    jdFileUrl: {
      type: String,
      default: '',
    },
    jdOriginalFilename: {
      type: String,
      default: '',
    },
    cvFileUrl: {
      type: String,
      default: '',
    },
    cvOriginalFilename: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
      maxlength: 10000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ApplicationSchema.index({ userId: 1 });
ApplicationSchema.index({ userId: 1, companyId: 1 });
ApplicationSchema.index({ userId: 1, status: 1 });
ApplicationSchema.index({ userId: 1, applicationDate: -1 });

const Application: Model<IApplicationDocument> =
  mongoose.models.Application ||
  mongoose.model<IApplicationDocument>('Application', ApplicationSchema);

export default Application;
