import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { resendVerificationSchema } from '@/lib/validations';
import { generateVerificationToken } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/mail';
import { successResponse, errorResponse, handleApiError, rateLimit } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = resendVerificationSchema.parse(body);

    // Rate limit: 3 resend per 15 minutes per email
    const { allowed } = rateLimit(`resend:${validated.email}`, 3, 15 * 60 * 1000);
    if (!allowed) {
      return errorResponse('Too many resend attempts. Please try again later.', 429);
    }

    await dbConnect();

    const user = await User.findOne({ email: validated.email });

    // Always return success to not leak user existence
    if (!user || user.status !== 'PENDING_VERIFICATION') {
      return successResponse({
        message: 'If an account exists with that email and is pending verification, a new email has been sent.',
      });
    }

    // Delete old tokens
    await VerificationToken.deleteMany({ userId: user._id });

    // Generate new token
    const token = generateVerificationToken();
    await VerificationToken.create({
      userId: user._id,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    // Send email
    sendVerificationEmail(user.email, token, user.fullName).catch((err) => {
      console.error('Failed to send verification email:', err);
    });

    return successResponse({
      message: 'If an account exists with that email and is pending verification, a new email has been sent.',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
