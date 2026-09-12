import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { requireAuth } from '@/lib/auth';
import { successResponse, handleApiError } from '@/lib/api-utils';

export async function GET() {
  try {
    const userPayload = await requireAuth();

    await dbConnect();

    const user = await User.findById(userPayload.id).select('-passwordHash');
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
        status: 404,
      });
    }

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        timezone: user.timezone,
        emailVerifiedAt: user.emailVerifiedAt,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
