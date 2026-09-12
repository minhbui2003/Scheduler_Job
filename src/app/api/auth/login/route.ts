import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { bootstrapAdmin } from '@/lib/bootstrap-admin';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { loginSchema } from '@/lib/validations';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError, rateLimit } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed } = rateLimit(`login:${ip}`, 5, 60 * 1000);
    if (!allowed) {
      return errorResponse('Too many login attempts. Please try again later.', 429);
    }

    const body = await request.json();
    const validated = loginSchema.parse(body);

    await dbConnect();
    await bootstrapAdmin(validated.email);

    // Find user by email
    const user = await User.findOne({ email: validated.email }).select('+passwordHash');
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Check user status
    if (user.status === 'PENDING_VERIFICATION') {
      return errorResponse('Please verify your email before logging in', 403);
    }

    if (user.status === 'DISABLED') {
      return errorResponse('Your account has been disabled. Contact support for assistance.', 403);
    }

    if (user.status === 'DELETED') {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    // Set cookies
    await setAuthCookies(tokens);

    // Update last login
    await User.updateOne({ _id: user._id }, { lastLoginAt: new Date() });

    return successResponse({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
