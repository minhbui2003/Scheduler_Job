import dbConnect from '@/lib/mongodb';
import Company from '@/models/Company';
import Application from '@/models/Application';
import Interview from '@/models/Interview';
import InterviewReview from '@/models/InterviewReview';
import Notification from '@/models/Notification';
import Activity from '@/models/Activity';

// =====================
// NOTIFICATION SERVICE
// =====================

export async function createInterviewReminders(
  userId: string,
  interviewId: string,
  scheduledStart: Date,
  companyName: string,
  position: string
) {
  await dbConnect();

  const reminders = [
    {
      type: 'REMINDER_1DAY' as const,
      offset: 24 * 60 * 60 * 1000, // 1 day
      label: 'tomorrow',
    },
    {
      type: 'REMINDER_2HOUR' as const,
      offset: 2 * 60 * 60 * 1000, // 2 hours
      label: 'in 2 hours',
    },
    {
      type: 'REMINDER_30MIN' as const,
      offset: 30 * 60 * 1000, // 30 minutes
      label: 'in 30 minutes',
    },
  ];

  const notifications = reminders
    .map((r) => {
      const scheduledAt = new Date(scheduledStart.getTime() - r.offset);
      // Only create if the reminder is in the future
      if (scheduledAt <= new Date()) return null;
      return {
        userId,
        interviewId,
        type: r.type,
        scheduledAt,
        status: 'PENDING',
        read: false,
        channel: 'IN_APP',
        title: `Interview ${r.label}`,
        message: `Interview at ${companyName} for ${position}`,
      };
    })
    .filter(Boolean);

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }
}

export async function deleteInterviewReminders(interviewId: string) {
  await dbConnect();
  await Notification.deleteMany({
    interviewId,
    status: 'PENDING',
  });
}

// =====================
// ACTIVITY SERVICE
// =====================

export async function createActivity(
  userId: string,
  applicationId: string,
  type: string,
  description: string,
  metadata: Record<string, unknown> = {}
) {
  await dbConnect();
  await Activity.create({
    userId,
    applicationId,
    type,
    description,
    metadata,
  });
}

// =====================
// DELETE USER DATA
// =====================

export async function deleteAllUserData(userId: string) {
  await dbConnect();

  await Promise.all([
    Company.deleteMany({ userId }),
    Application.deleteMany({ userId }),
    Interview.deleteMany({ userId }),
    InterviewReview.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    Activity.deleteMany({ userId }),
  ]);
}
