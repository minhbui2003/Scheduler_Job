import mongoose, { Schema, Document, Model } from 'mongoose';
import type { NotificationType, NotificationStatus, NotificationChannel } from '@/types';

export interface INotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  interviewId: mongoose.Types.ObjectId;
  type: NotificationType;
  scheduledAt: Date;
  status: NotificationStatus;
  read: boolean;
  channel: NotificationChannel;
  title: string;
  message: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
    },
    type: {
      type: String,
      enum: ['REMINDER_1DAY', 'REMINDER_2HOUR', 'REMINDER_30MIN'],
      required: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT', 'READ'],
      default: 'PENDING',
    },
    read: {
      type: Boolean,
      default: false,
    },
    channel: {
      type: String,
      enum: ['IN_APP', 'EMAIL', 'TELEGRAM', 'DISCORD'],
      default: 'IN_APP',
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
NotificationSchema.index({ userId: 1, scheduledAt: -1 });
NotificationSchema.index({ status: 1, scheduledAt: 1 }); // For cron job
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ interviewId: 1 });

const Notification: Model<INotificationDocument> =
  mongoose.models.Notification ||
  mongoose.model<INotificationDocument>('Notification', NotificationSchema);

export default Notification;
