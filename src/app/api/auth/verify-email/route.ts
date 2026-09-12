import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import VerificationToken from '@/models/VerificationToken';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token || typeof token !== 'string' || token.length < 32) {
      return errorResponse('Liên kết xác minh không hợp lệ.', 400);
    }

    await dbConnect();

    // Find token
    const verificationToken = await VerificationToken.findOne({ token });

    if (!verificationToken) {
      return errorResponse('Liên kết xác minh không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email xác minh.', 400);
    }

    const user = await User.findById(verificationToken.userId);
    if (!user) return errorResponse('Không tìm thấy tài khoản.', 404);

    // Reopening a valid link is safe; it must never reactivate a blocked account.
    if (user.status === 'ACTIVE' && user.emailVerifiedAt) {
      return successResponse({ message: 'Email đã được xác minh. Bạn có thể đăng nhập ngay.' });
    }
    if (user.status !== 'PENDING_VERIFICATION') {
      return errorResponse('Tài khoản không thể xác minh lúc này. Vui lòng liên hệ quản trị viên.', 403);
    }

    // Check if already used
    if (verificationToken.usedAt) {
      return errorResponse('Liên kết này đã được sử dụng. Vui lòng yêu cầu gửi lại email xác minh.', 400);
    }

    // Check if expired
    if (new Date() > verificationToken.expiresAt) {
      return errorResponse('Liên kết xác minh đã hết hạn. Vui lòng yêu cầu gửi lại email xác minh.', 400);
    }

    // Only activate a pending account, even if an admin changes it concurrently.
    const activated = await User.findOneAndUpdate(
      { _id: user._id, status: 'PENDING_VERIFICATION' },
      { $set: { status: 'ACTIVE', emailVerifiedAt: new Date() } },
      { new: true }
    );
    if (!activated) {
      const currentUser = await User.findById(user._id);
      if (currentUser?.status === 'ACTIVE' && currentUser.emailVerifiedAt) {
        return successResponse({ message: 'Email đã được xác minh. Bạn có thể đăng nhập ngay.' });
      }
      return errorResponse('Tài khoản không thể xác minh lúc này. Vui lòng liên hệ quản trị viên.', 403);
    }

    // Mark token as used
    verificationToken.usedAt = new Date();
    await verificationToken.save();

    return successResponse({ message: 'Xác minh email thành công. Bạn có thể đăng nhập ngay.' });
  } catch (error) {
    return handleApiError(error);
  }
}
