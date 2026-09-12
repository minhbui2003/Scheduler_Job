import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { requireAdmin } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { deleteAllUserData } from '@/services/notification.service';
import mongoose from 'mongoose';

// DELETE /api/admin/users/[id]
export async function DELETE(
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

    const user = await User.findById(id);
    if (!user) {
      return errorResponse('User not found', 404);
    }

    if (user.role === 'ADMIN') {
      return errorResponse('Cannot delete admin account', 403);
    }

    // Delete all user data
    await deleteAllUserData(id);

    // Delete verification tokens
    await VerificationToken.deleteMany({ userId: id });

    // Delete user
    await User.findByIdAndDelete(id);

    return successResponse({ message: 'User and all related data deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}
