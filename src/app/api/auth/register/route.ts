import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { registerSchema } from '@/lib/validations';
import { generateVerificationToken } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/mail';
import { successResponse, errorResponse, handleApiError, rateLimit } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 registration attempts per 15 minutes per IP.
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { allowed, resetAt } = rateLimit(`register:${ip}`, 20, 15 * 60 * 1000);
    if (!allowed) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      const response = errorResponse(`Bạn đã thử đăng ký quá 20 lần trong 15 phút. Vui lòng thử lại sau khoảng ${Math.ceil(retryAfter / 60)} phút.`, 429);
      response.headers.set('Retry-After', String(retryAfter));
      return response;
    }

    const body = await request.json();
    const validated = registerSchema.parse(body);

    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return errorResponse('An account with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 12);

    // If SMTP is not configured or has default placeholder, auto-verify the account
    const hasSmtpConfigured =
      process.env.MAIL_USER &&
      !process.env.MAIL_USER.includes('your-email') &&
      process.env.MAIL_PASSWORD &&
      !process.env.MAIL_PASSWORD.includes('your-app-password');

    const status = hasSmtpConfigured ? 'PENDING_VERIFICATION' : 'ACTIVE';
    const emailVerifiedAt = hasSmtpConfigured ? null : new Date();

    // Create user
    const user = await User.create({
      fullName: validated.fullName,
      email: validated.email,
      passwordHash,
      role: 'USER',
      status,
      emailVerifiedAt,
    });

    if (hasSmtpConfigured) {
      // Generate verification token
      const token = generateVerificationToken();
      await VerificationToken.create({
        userId: user._id,
        token,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      });

      // Send verification email (non-blocking)
      sendVerificationEmail(user.email, token, user.fullName).catch((err) => {
        console.error('Failed to send verification email:', err);
      });

      return successResponse(
        {
          message: 'Registration successful. Please check your email to verify your account.',
          userId: user._id,
        },
        201
      );
    }

    return successResponse(
      {
        message: 'Registration successful! You can now log in.',
        userId: user._id,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
