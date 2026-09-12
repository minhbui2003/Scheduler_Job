import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { bootstrapAdmin } from '@/lib/bootstrap-admin';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { adminLoginSchema } from '@/lib/validations';
import { generateTokens, setAuthCookies } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError, rateLimit } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = rateLimit(`admin-login:${ip}`, 5, 60 * 1000);
    if (!allowed) {
      return errorResponse('Too many login attempts', 429);
    }

    const body = await request.json();
    const validated = adminLoginSchema.parse(body);

    await dbConnect();
    await bootstrapAdmin(validated.email);

    const user = await User.findOne({
      email: validated.email,
      role: 'ADMIN',
    }).select('+passwordHash');

    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      return errorResponse('Invalid credentials', 401);
    }

    if (user.status !== 'ACTIVE') return errorResponse('Account is not active', 403);

    const tokens = generateTokens({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    });

    await setAuthCookies(tokens);

    return successResponse({ message: 'Admin login successful' });
  } catch (error) {
    return handleApiError(error);
  }
}
