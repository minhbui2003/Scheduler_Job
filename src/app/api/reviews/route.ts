import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InterviewReview from '@/models/InterviewReview';
import Interview from '@/models/Interview';
import Application from '@/models/Application';
import Company from '@/models/Company';
import { requireAuth } from '@/lib/auth';
import { createReviewSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';
import { createActivity, deleteInterviewReminders } from '@/services/notification.service';

// GET /api/reviews
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const result = searchParams.get('result') || '';
    const sort = searchParams.get('sort') || 'newest';
    const ids = searchParams.get('ids'); // For compare mode

    const query: Record<string, unknown> = { userId: user.id };

    if (result && result !== 'ALL') {
      query.result = result;
    }

    const interviewId = searchParams.get('interviewId');
    if (interviewId) {
      if (!mongoose.isValidObjectId(interviewId)) return errorResponse('Invalid interview ID', 400);
      query.interviewId = interviewId;
    }

    if (ids) {
      const idList = ids.split(',').filter(Boolean);
      if (idList.some((id) => !mongoose.isValidObjectId(id))) return errorResponse('Invalid review ID', 400);
      query._id = { $in: idList };
    }

    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sort) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'salary-high':
        sortObj = { currency: 1, salaryType: 1, companyOffer: -1 };
        break;
      case 'rating-high':
        sortObj = { 'ratings.overall': -1 };
        break;
    }

    const reviews = await InterviewReview.find(query)
      .sort(sortObj)
      .lean();

    // Enrich with interview, company, application data
    const interviewIds = reviews.map((r) => r.interviewId);
    const companyIds = [...new Set(reviews.map((r) => r.companyId.toString()))];
    const applicationIds = reviews.map((r) => r.applicationId);

    const [interviews, companies, applications] = await Promise.all([
      Interview.find({ _id: { $in: interviewIds }, userId: user.id }).lean(),
      Company.find({ _id: { $in: companyIds }, userId: user.id }).lean(),
      Application.find({ _id: { $in: applicationIds }, userId: user.id }).lean(),
    ]);

    const interviewMap = new Map(interviews.map((i) => [i._id.toString(), i]));
    const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));
    const applicationMap = new Map(applications.map((a) => [a._id.toString(), a]));

    const enriched = reviews.map((review) => ({
      ...review,
      interview: interviewMap.get(review.interviewId.toString()) || null,
      company: companyMap.get(review.companyId.toString()) || null,
      application: applicationMap.get(review.applicationId.toString()) || null,
    }));

    return successResponse(enriched);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/reviews
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = createReviewSchema.parse(body);

    await dbConnect();

    // Verify interview belongs to user
    const interview = await Interview.findOne({
      _id: validated.interviewId,
      userId: user.id,
    });
    if (!interview) {
      return errorResponse('Interview not found', 404);
    }

    if (interview.applicationId.toString() !== validated.applicationId || interview.companyId.toString() !== validated.companyId) {
      return errorResponse('Review must belong to the same job and company as the interview', 400);
    }
    if (interview.status === 'CANCELLED' || interview.status === 'NO_SHOW') {
      return errorResponse('Cannot review a cancelled or missed interview', 400);
    }

    const [application, company] = await Promise.all([
      Application.findOne({ _id: interview.applicationId, userId: user.id }),
      Company.findOne({ _id: interview.companyId, userId: user.id }),
    ]);
    if (!application || !company) return errorResponse('Job or company no longer exists', 404);

    // Check if review already exists
    const existingReview = await InterviewReview.findOne({
      userId: user.id,
      interviewId: validated.interviewId,
    });
    if (existingReview) {
      return errorResponse('Review already exists for this interview', 409);
    }

    const review = await InterviewReview.create({
      userId: user.id,
      ...validated,
    });

    // Update interview and application status
    interview.status = 'COMPLETED';
    await interview.save();
    await deleteInterviewReminders(interview._id.toString());

    await Application.updateOne(
      { _id: validated.applicationId, userId: user.id },
      { $set: { status: 'INTERVIEWED' } }
    );

    // Activity
    await createActivity(
      user.id,
      validated.applicationId,
      'REVIEW_ADDED',
      'Post-interview review added'
    );

    return successResponse(review, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
