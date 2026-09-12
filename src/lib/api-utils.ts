import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AuthError } from './auth';

export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function handleApiError(error: unknown) {
  console.error('API Error:', error);

  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode);
  }

  if (error instanceof ZodError) {
    const message = error.errors.map((e) => e.message).join(', ');
    return errorResponse(message, 400);
  }

  if (error instanceof Error) {
    // MongoDB duplicate key error
    if (error.message.includes('E11000')) {
      return errorResponse('This record already exists', 409);
    }
    return errorResponse(error.message, 500);
  }

  return errorResponse('Internal Server Error', 500);
}

// Rate limiter using in-memory store (suitable for single-instance deployment)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: maxRequests - record.count, resetAt: record.resetAt };
}

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
