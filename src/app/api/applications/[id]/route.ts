import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Application from '@/models/Application';
import Company from '@/models/Company';
import Interview from '@/models/Interview';
import Activity from '@/models/Activity';
import InterviewReview from '@/models/InterviewReview';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/auth';
import { updateApplicationSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

// GET /api/applications/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid application ID', 400);
    }

    await dbConnect();

    const application = await Application.findOne({ _id: id, userId: user.id }).lean();
    if (!application) {
      return errorResponse('Application not found', 404);
    }

    const company = await Company.findOne({
      _id: application.companyId,
      userId: user.id,
    }).lean();

    const interviews = await Interview.find({
      applicationId: id,
      userId: user.id,
    })
      .sort({ scheduledStart: -1 })
      .lean();

    const activities = await Activity.find({
      applicationId: id,
      userId: user.id,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return successResponse({
      ...application,
      company,
      interviews,
      activities,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/applications/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid application ID', 400);
    }

    const body = await request.json();
    const validated = updateApplicationSchema.parse(body);

    await dbConnect();

    const existing = await Application.findOne({ _id: id, userId: user.id });
    if (!existing) return errorResponse('Application not found', 404);

    const { companyName, ...fields } = validated;
    let companyId = existing.companyId;
    if (companyName) {
      const currentCompany = await Company.findOne({ _id: companyId, userId: user.id });
      if (currentCompany?.name !== companyName) {
        const target = await Company.findOne({ userId: user.id, name: companyName });
        const company = target || await Company.create({ userId: user.id, name: companyName });
        companyId = company._id;
      }
      // Update related records without renaming the company of unrelated jobs.
      await Interview.updateMany({ applicationId: id, userId: user.id }, { $set: { companyId } });
      await InterviewReview.updateMany({ applicationId: id, userId: user.id }, { $set: { companyId } });
    }
    const application = await Application.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: { ...fields, companyId } },
      { new: true, runValidators: true }
    ).lean();

    if (!application) {
      return errorResponse('Application not found', 404);
    }

    if (companyName || fields.position !== undefined) {
      const company = await Company.findOne({ _id: companyId, userId: user.id });
      const interviews = await Interview.find({ applicationId: id, userId: user.id }).select('_id').lean();
      await Notification.updateMany(
        { interviewId: { $in: interviews.map((interview) => interview._id) }, userId: user.id, status: 'PENDING' },
        { $set: { message: `Interview at ${company?.name || ''} for ${application.position}` } }
      );
    }
    return successResponse(application);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/applications/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid application ID', 400);
    }

    await dbConnect();

    const application = await Application.findOne({ _id: id, userId: user.id });
    if (!application) {
      return errorResponse('Application not found', 404);
    }

    // Delete children first so a failed cleanup can be retried using the job ID.
    const interviews = await Interview.find({ applicationId: id, userId: user.id }).select('_id').lean();
    await Notification.deleteMany({ interviewId: { $in: interviews.map((interview) => interview._id) }, userId: user.id });
    await InterviewReview.deleteMany({ applicationId: id, userId: user.id });
    await Activity.deleteMany({ applicationId: id, userId: user.id });
    await Interview.deleteMany({ applicationId: id, userId: user.id });
    await Application.deleteOne({ _id: id, userId: user.id });

    return successResponse({ message: 'Application deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
