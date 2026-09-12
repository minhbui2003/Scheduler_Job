import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import InterviewReview from '@/models/InterviewReview';
import { requireAuth } from '@/lib/auth';
import { updateReviewSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

// GET /api/reviews/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid review ID', 400);
    }

    await dbConnect();

    const review = await InterviewReview.findOne({ _id: id, userId: user.id }).lean();
    if (!review) {
      return errorResponse('Review not found', 404);
    }

    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/reviews/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid review ID', 400);
    }

    const body = await request.json();
    const validated = updateReviewSchema.parse(body);

    await dbConnect();

    const review = await InterviewReview.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: validated },
      { new: true, runValidators: true }
    ).lean();

    if (!review) {
      return errorResponse('Review not found', 404);
    }

    return successResponse(review);
  } catch (error) {
    return handleApiError(error);
  }
}
