'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays,
  Bell,
  User,
  Settings,
  LogOut,
  Sparkles,
  Briefcase,
  BarChart3,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/notifications/notification-dropdown';

const navItems = [
  { href: '/scheduler', label: 'Scheduler', icon: Calendar },
  { href: '/applications', label: 'Applications', icon: Briefcase },
  { href: '/reviews', label: 'Reviews', icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotificationCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/upcoming');
      if (res.ok) {
        const data = await res.json();
        setNotificationCount(data.data?.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchNotificationCount]);

  useEffect(() => {
    const titleMap: Record<string, string> = {
      '/scheduler': 'Lịch phỏng vấn | Scheduler Job',
      '/applications': 'Hồ sơ ứng tuyển | Scheduler Job',
      '/reviews': 'Đánh giá phỏng vấn | Scheduler Job',
      '/profile': 'Hồ sơ cá nhân | Scheduler Job',
      '/settings': 'Cài đặt | Scheduler Job',
    };
    document.title = titleMap[pathname] || 'Scheduler Job — Quản lý lịch phỏng vấn & Hồ sơ ứng tuyển';
  }, [pathname]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left — Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/scheduler" className="flex items-center gap-2.5 shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
                <CalendarDays className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                Scheduler Job
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined} className={buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size: 'sm', className: `gap-2 ${isActive ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'text-muted-foreground hover:text-foreground'}` })}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Center — AI Import (prominent button) */}
          <div className={`${pathname === '/scheduler' || pathname === '/applications' ? 'hidden sm:flex' : 'hidden'} items-center`}>
            <Button
              onClick={() => {
                const event = new CustomEvent('open-ai-import');
                window.dispatchEvent(event);
              }}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/20 transition-all duration-200 hover:shadow-indigo-500/30"
              size="sm"
            >
              <Sparkles className="w-4 h-4" />
              AI Import
            </Button>
          </div>

          {/* Right — Notifications + User */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Thông báo"
                aria-expanded={showNotifications}
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-[10px] bg-red-500 hover:bg-red-500 text-white border-2 border-background flex items-center justify-center">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Badge>
                )}
              </Button>

              {showNotifications && (
                <NotificationDropdown
                  onClose={() => setShowNotifications(false)}
                  onNotificationClick={(interviewId, scheduledStart) => {
                    setShowNotifications(false);
                    // Navigate to scheduler with the right week and highlight
                    const date = new Date(scheduledStart);
                    router.push(`/scheduler?highlight=${interviewId}&date=${date.toISOString()}`);
                  }}
                  onRefreshCount={fetchNotificationCount}
                />
              )}
            </div>

            {/* Mobile nav */}
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button aria-label="Menu điều hướng" variant="ghost" size="icon">
                      <CalendarDays className="w-5 h-5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-48">
                  {navItems.map((item) => (
                    <DropdownMenuItem
                      key={item.href}
                      onClick={() => router.push(item.href)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (pathname === '/scheduler' || pathname === '/applications') {
                        window.dispatchEvent(new CustomEvent('open-ai-import'));
                      } else {
                        router.push('/scheduler?import=ai');
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Import
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button aria-label="Tài khoản" variant="ghost" className="gap-2 px-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-xs font-bold">
                        {user ? getInitials(user.fullName) : '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-sm font-medium max-w-[120px] truncate">
                      {user?.fullName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden lg:block" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-2">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push('/profile')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <nav aria-label="Điều hướng chính" className="fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t bg-background/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.map((item) => <Link key={item.href} href={item.href} aria-current={pathname.startsWith(item.href) ? 'page' : undefined} className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${pathname.startsWith(item.href) ? 'text-indigo-600 bg-indigo-50/70' : 'text-muted-foreground hover:bg-muted'}`}><item.icon className="w-5 h-5" />{item.label}</Link>)}
      </nav>
      {/* Main Content */}
      <main className={`max-w-[1400px] min-w-0 mx-auto px-4 sm:px-6 ${pathname === '/scheduler' ? 'flex min-h-[calc(100dvh-4rem-1px)] flex-col py-4 pb-24 md:pb-4' : 'py-5 sm:py-8 pb-28 md:pb-8'}`}>{children}</main>
    </div>
  );
}
