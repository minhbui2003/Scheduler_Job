import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import Interview from '@/models/Interview';
import Company from '@/models/Company';
import { requireAuth } from '@/lib/auth';
import { successResponse, handleApiError } from '@/lib/api-utils';

// GET /api/notifications/upcoming
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await dbConnect();

    // Get upcoming interview notifications (sent or pending)
    const notifications = await Notification.find({
      userId: user.id,
      status: { $in: ['SENT', 'PENDING'] },
    })
      .sort({ scheduledAt: 1 })
      .limit(20)
      .lean();

    // Enrich with interview details
    const interviewIds = [...new Set(notifications.map((n) => n.interviewId.toString()))];
    const interviews = await Interview.find({
      _id: { $in: interviewIds },
      userId: user.id,
    }).lean();
    const interviewMap = new Map(interviews.map((i) => [i._id.toString(), i]));

    const companyIds = [...new Set(interviews.map((i) => i.companyId.toString()))];
    const companies = await Company.find({
      _id: { $in: companyIds },
      userId: user.id,
    }).lean();
    const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));

    const enriched = notifications.map((n) => {
      const interview = interviewMap.get(n.interviewId.toString());
      const company = interview ? companyMap.get(interview.companyId.toString()) : null;
      return {
        ...n,
        interview: interview
          ? {
              scheduledStart: interview.scheduledStart,
              scheduledEnd: interview.scheduledEnd,
              companyName: company?.name || 'Unknown',
              position: (interview as unknown as { applicationId: string }).applicationId
                ? 'Interview'
                : '',
              type: interview.type,
              location: interview.location,
              status: interview.status,
            }
          : null,
      };
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    return successResponse({ notifications: enriched, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}
