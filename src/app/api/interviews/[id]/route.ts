import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Interview from '@/models/Interview';
import Application from '@/models/Application';
import Company from '@/models/Company';
import Notification from '@/models/Notification';
import InterviewReview from '@/models/InterviewReview';
import { requireAuth } from '@/lib/auth';
import { updateInterviewSchema, rescheduleInterviewSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import {
  createInterviewReminders,
  deleteInterviewReminders,
  createActivity,
} from '@/services/notification.service';
import mongoose from 'mongoose';

// GET /api/interviews/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid interview ID', 400);
    }

    await dbConnect();

    const interview = await Interview.findOne({ _id: id, userId: user.id }).lean();
    if (!interview) {
      return errorResponse('Interview not found', 404);
    }

    const company = await Company.findOne({
      _id: interview.companyId,
      userId: user.id,
    }).lean();

    const application = await Application.findOne({
      _id: interview.applicationId,
      userId: user.id,
    }).lean();

    return successResponse({ ...interview, company, application });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/interviews/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid interview ID', 400);
    }

    const body = await request.json();

    // Check if this is a reschedule action
    if (body.action === 'reschedule') {
      const validated = rescheduleInterviewSchema.parse(body);

      await dbConnect();

      const interview = await Interview.findOne({ _id: id, userId: user.id });
      if (!interview) {
        return errorResponse('Interview not found', 404);
      }

      const oldStart = interview.scheduledStart;
      const newStart = new Date(validated.newStart);
      const newEnd = validated.newEnd ? new Date(validated.newEnd) : null;
      if (Number.isNaN(newStart.getTime()) || (newEnd && (Number.isNaN(newEnd.getTime()) || newEnd <= newStart))) {
        return errorResponse('Ngày giờ không hợp lệ. Giờ kết thúc phải sau giờ bắt đầu.', 400);
      }

      // Add to history
      interview.history.push({
        type: 'RESCHEDULED',
        from: oldStart,
        to: newStart,
        reason: validated.reason || '',
        createdAt: new Date(),
      });

      interview.scheduledStart = newStart;
      interview.scheduledEnd = newEnd;
      interview.status = 'RESCHEDULED';
      await interview.save();

      // Delete old reminders and create new ones
      await deleteInterviewReminders(id);

      const company = await Company.findOne({ _id: interview.companyId, userId: user.id });
      const application = await Application.findOne({ _id: interview.applicationId, userId: user.id });

      if (company && application) {
        await createInterviewReminders(
          user.id,
          id,
          newStart,
          company.name,
          application.position
        );
      }

      // Activity
      await createActivity(
        user.id,
        interview.applicationId.toString(),
        'INTERVIEW_RESCHEDULED',
        `Interview rescheduled from ${oldStart.toLocaleDateString()} to ${newStart.toLocaleDateString()}`,
        { interviewId: id, from: oldStart, to: newStart, reason: validated.reason }
      );

      return successResponse(interview);
    }

    // Check if this is a complete action
    if (body.action === 'complete') {
      await dbConnect();

      const interview = await Interview.findOne({ _id: id, userId: user.id });
      if (!interview) {
        return errorResponse('Interview not found', 404);
      }

      interview.status = 'COMPLETED';
      await interview.save();

      // Update application status
      await Application.updateOne(
        { _id: interview.applicationId, userId: user.id },
        { $set: { status: 'INTERVIEWED' } }
      );

      // Delete pending reminders
      await deleteInterviewReminders(id);

      // Activity
      await createActivity(
        user.id,
        interview.applicationId.toString(),
        'INTERVIEW_COMPLETED',
        'Interview completed'
      );

      return successResponse(interview);
    }

    // Check if this is a cancel action
    if (body.action === 'cancel') {
      await dbConnect();

      const interview = await Interview.findOne({ _id: id, userId: user.id });
      if (!interview) {
        return errorResponse('Interview not found', 404);
      }

      interview.status = 'CANCELLED';
      await interview.save();

      // Delete pending reminders
      await deleteInterviewReminders(id);

      // Activity
      await createActivity(
        user.id,
        interview.applicationId.toString(),
        'INTERVIEW_CANCELLED',
        'Interview cancelled'
      );

      return successResponse(interview);
    }

    // Regular update
    const validated = updateInterviewSchema.parse(body);
    await dbConnect();

    const updateData: Record<string, unknown> = {};
    if (validated.scheduledStart) updateData.scheduledStart = new Date(validated.scheduledStart);
    if (validated.scheduledEnd !== undefined) {
      updateData.scheduledEnd = validated.scheduledEnd ? new Date(validated.scheduledEnd) : null;
    }
    if (validated.timezone) updateData.timezone = validated.timezone;
    if (validated.type) updateData.type = validated.type;
    if (validated.location !== undefined) updateData.location = validated.location;
    if (validated.meetingUrl !== undefined) updateData.meetingUrl = validated.meetingUrl;
    if (validated.contactName !== undefined) updateData.contactName = validated.contactName;
    if (validated.contactEmail !== undefined) updateData.contactEmail = validated.contactEmail;
    if (validated.contactPhone !== undefined) updateData.contactPhone = validated.contactPhone;
    if (validated.notes !== undefined) updateData.notes = validated.notes;

    const interview = await Interview.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: updateData },
      { new: true }
    ).lean();

    if (!interview) {
      return errorResponse('Interview not found', 404);
    }

    return successResponse(interview);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/interviews/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid interview ID', 400);
    }

    await dbConnect();

    const interview = await Interview.findOne({ _id: id, userId: user.id });
    if (!interview) {
      return errorResponse('Interview not found', 404);
    }

    await Notification.deleteMany({ interviewId: id, userId: user.id });
    await InterviewReview.deleteMany({ interviewId: id, userId: user.id });
    await Interview.deleteOne({ _id: id, userId: user.id });

    return successResponse({ message: 'Interview deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
