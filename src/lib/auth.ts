import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import type { UserPayload } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || '';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || '';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Generate JWT tokens
export function generateTokens(payload: UserPayload): TokenPair {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ id: payload.id }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

// Verify access token
export function verifyAccessToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): { id: string } | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as { id: string };
  } catch {
    return null;
  }
}

// Set auth cookies
export async function setAuthCookies(tokens: TokenPair): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 15 * 60, // 15 minutes
    path: '/',
  });

  cookieStore.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
  });
}

// Clear auth cookies
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}

// Get current user from request (for API routes)
export async function getCurrentUser(request?: NextRequest): Promise<UserPayload | null> {
  let token: string | undefined;

  if (request) {
    token = request.cookies.get('access_token')?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get('access_token')?.value;
  }

  if (!token) return null;

  return verifyAccessToken(token);
}

// Get current user or throw (for protected API routes)
export async function requireAuth(request?: NextRequest): Promise<UserPayload> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthError('Account is not active', 403);
  }
  return user;
}

// Require admin role
export async function requireAdmin(request?: NextRequest): Promise<UserPayload> {
  const user = await requireAuth(request);
  if (user.role !== 'ADMIN') {
    throw new AuthError('Admin access required', 403);
  }
  return user;
}

// Custom auth error
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

// Generate random token for email verification
export function generateVerificationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
