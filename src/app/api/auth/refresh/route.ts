import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { verifyRefreshToken, generateTokens, setAuthCookies } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refresh_token')?.value;

    if (!refreshToken) {
      return errorResponse('No refresh token provided', 401);
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return errorResponse('Invalid or expired refresh token', 401);
    }

    await dbConnect();

    const user = await User.findById(payload.id);
    if (!user || user.status !== 'ACTIVE') {
      return errorResponse('User not found or inactive', 401);
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    await setAuthCookies(tokens);

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
