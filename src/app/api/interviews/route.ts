import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Interview from '@/models/Interview';
import Application from '@/models/Application';
import Company from '@/models/Company';
import { requireAuth } from '@/lib/auth';
import { createInterviewSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import {
  createInterviewReminders,
  createActivity,
} from '@/services/notification.service';
import mongoose from 'mongoose';

// GET /api/interviews
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const status = searchParams.get('status');
    const applicationId = searchParams.get('applicationId');

    const query: Record<string, unknown> = { userId: user.id };

    if (start && end) {
      query.scheduledStart = {
        $gte: new Date(start),
        $lte: new Date(end),
      };
    }

    if (status) {
      query.status = status;
    }

    if (applicationId && mongoose.Types.ObjectId.isValid(applicationId)) {
      query.applicationId = applicationId;
    }

    const interviews = await Interview.find(query)
      .sort({ scheduledStart: 1 })
      .lean();

    // Populate company and application details
    const companyIds = [...new Set(interviews.map((i) => i.companyId.toString()))];
    const companies = await Company.find({
      _id: { $in: companyIds },
      userId: user.id,
    }).lean();
    const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));

    const appIds = [...new Set(interviews.map((i) => i.applicationId.toString()))];
    const applications = await Application.find({
      _id: { $in: appIds },
      userId: user.id,
    }).lean();
    const appMap = new Map(applications.map((a) => [a._id.toString(), a]));

    const enriched = interviews.map((interview) => ({
      ...interview,
      company: companyMap.get(interview.companyId.toString()) || null,
      application: appMap.get(interview.applicationId.toString()) || null,
    }));

    return successResponse(enriched);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/interviews
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = createInterviewSchema.parse(body);

    await dbConnect();

    // Verify application belongs to user
    if (!mongoose.Types.ObjectId.isValid(validated.applicationId)) {
      return errorResponse('Invalid application ID', 400);
    }
    const application = await Application.findOne({
      _id: validated.applicationId,
      userId: user.id,
    });
    if (!application) {
      return errorResponse('Application not found', 404);
    }

    // Verify company belongs to user
    if (!mongoose.Types.ObjectId.isValid(validated.companyId)) {
      return errorResponse('Invalid company ID', 400);
    }
    const company = await Company.findOne({
      _id: validated.companyId,
      userId: user.id,
    });
    if (!company) {
      return errorResponse('Company not found', 404);
    }

    const scheduledStart = new Date(validated.scheduledStart);
    const scheduledEnd = validated.scheduledEnd ? new Date(validated.scheduledEnd) : null;

    const interview = await Interview.create({
      userId: user.id,
      applicationId: validated.applicationId,
      companyId: validated.companyId,
      scheduledStart,
      scheduledEnd,
      timezone: validated.timezone,
      type: validated.type,
      location: validated.location,
      meetingUrl: validated.meetingUrl,
      contactName: validated.contactName,
      contactEmail: validated.contactEmail,
      contactPhone: validated.contactPhone,
      notes: validated.notes,
      status: 'SCHEDULED',
      history: [
        {
          type: 'CREATED',
          from: null,
          to: scheduledStart,
          reason: '',
          createdAt: new Date(),
        },
      ],
    });

    // Update application status
    if (application.status === 'APPLIED') {
      application.status = 'INTERVIEW_SCHEDULED';
      await application.save();
    }

    // Create reminders
    await createInterviewReminders(
      user.id,
      interview._id.toString(),
      scheduledStart,
      company.name,
      application.position
    );

    // Create activity
    await createActivity(
      user.id,
      validated.applicationId,
      'INTERVIEW_SCHEDULED',
      `Interview scheduled for ${scheduledStart.toLocaleDateString()}`,
      { interviewId: interview._id }
    );

    return successResponse(
      { ...interview.toObject(), company: company.toObject() },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
