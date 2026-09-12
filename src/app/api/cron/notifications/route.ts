import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

// GET & POST /api/cron/notifications - Process pending notifications (Vercel cron uses GET)
export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return errorResponse('Unauthorized', 401);
    }

    await dbConnect();

    // Find pending notifications that are due
    const now = new Date();
    const pendingNotifications = await Notification.find({
      scheduledAt: { $lte: now },
      status: 'PENDING',
    }).limit(100);

    if (pendingNotifications.length === 0) {
      return successResponse({ processed: 0 });
    }

    // Mark as sent
    const ids = pendingNotifications.map((n) => n._id);
    await Notification.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'SENT' } }
    );

    // TODO: Here you can add email/telegram/discord notification sending
    // For each notification:
    // - Get the user's preferences
    // - Send via the appropriate channel
    // This architecture is extensible for future channels

    return successResponse({ processed: pendingNotifications.length });
  } catch (error) {
    return handleApiError(error);
  }
}
