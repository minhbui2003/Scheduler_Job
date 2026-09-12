import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getLoginDestination } from '@/lib/auth-redirect';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || '');

// Routes that require authentication
const protectedPaths = ['/scheduler', '/applications', '/reviews', '/profile', '/settings'];

// Routes that require admin
const adminPaths = ['/admin'];

// Auth-only routes (redirect to dashboard if already logged in)
const authPaths = ['/login', '/register'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('access_token')?.value;

  let user: { id: string; email: string; role: string; status: string } | null = null;

  if (accessToken) {
    try {
      const { payload } = await jwtVerify(accessToken, JWT_SECRET);
      user = payload as unknown as { id: string; email: string; role: string; status: string };
    } catch {
      // Token invalid or expired - try refresh
      if (protectedPaths.some((p) => pathname.startsWith(p))) {
        // Attempt to redirect to refresh, then back
        const refreshToken = request.cookies.get('refresh_token')?.value;
        if (!refreshToken) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
        // Let the client handle refresh
      }
    }
  }

  // Protect dashboard routes
  if (protectedPaths.some((p) => pathname.startsWith(p))) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (user.status !== 'ACTIVE') {
      return NextResponse.redirect(new URL('/login?error=inactive', request.url));
    }
  }

  // Protect admin routes
  if (adminPaths.some((p) => pathname.startsWith(p)) && pathname !== '/admin/login') {
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (authPaths.some((p) => pathname === p) || pathname === '/admin/login') {
    if (user && user.status === 'ACTIVE') {
      return NextResponse.redirect(new URL(getLoginDestination(user.role), request.url));
    }
  }

  // Redirect root to scheduler or login
  if (pathname === '/') {
    if (user && user.status === 'ACTIVE') {
      return NextResponse.redirect(new URL(getLoginDestination(user.role), request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/scheduler/:path*', '/applications/:path*', '/reviews/:path*', '/profile/:path*', '/settings/:path*', '/admin/:path*'],
};
