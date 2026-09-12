import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { requireAdmin } from '@/lib/auth';
import { successResponse, handleApiError } from '@/lib/api-utils';

// GET /api/admin/users
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const query: Record<string, unknown> = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(users);
  } catch (error) {
    return handleApiError(error);
  }
}
