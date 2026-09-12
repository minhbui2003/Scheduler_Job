import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/auth';
import { successResponse, handleApiError } from '@/lib/api-utils';

// PUT /api/notifications/read-all
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await dbConnect();

    await Notification.updateMany(
      { userId: user.id, read: false },
      { $set: { read: true, status: 'READ' } }
    );

    return successResponse({ message: 'All notifications marked as read' });
  } catch (error) {
    return handleApiError(error);
  }
}
