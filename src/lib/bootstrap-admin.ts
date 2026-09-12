import bcrypt from 'bcryptjs';
import User from '@/models/User';

// Both login pages can initialize the configured admin after connecting to DB.
export async function bootstrapAdmin(loginEmail: string) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || loginEmail !== email) return;

  // Never promote or reset an existing account just because its email matches.
  if (await User.exists({ email })) return;
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await User.create({
      fullName: 'Admin', email, passwordHash,
      role: 'ADMIN', status: 'ACTIVE', emailVerifiedAt: new Date(),
    });
  } catch (error) {
    // A concurrent login may already have created this same account.
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
  }
}
