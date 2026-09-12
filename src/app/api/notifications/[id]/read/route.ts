import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

// PUT /api/notifications/[id]/read
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid notification ID', 400);
    }

    await dbConnect();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: { read: true, status: 'READ' } },
      { new: true }
    );

    if (!notification) {
      return errorResponse('Notification not found', 404);
    }

    return successResponse(notification);
  } catch (error) {
    return handleApiError(error);
  }
}
