import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

// PUT /api/admin/users/[id]/activate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid user ID', 400);
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status: 'ACTIVE' } },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    return successResponse(user);
  } catch (error) {
    return handleApiError(error);
  }
}
