export function getLoginDestination(role: string, callbackUrl?: string | null): string {
  if (role === 'ADMIN') return '/admin';

  if (callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//') && !callbackUrl.includes('\\')) {
    const url = new URL(callbackUrl, 'https://local.invalid');
    const allowedPaths = ['/scheduler', '/applications', '/reviews', '/profile', '/settings'];
    if (url.origin === 'https://local.invalid' && allowedPaths.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  }
  return '/scheduler';
}
