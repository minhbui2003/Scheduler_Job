'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, MapPin, Monitor, X } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

interface NotificationItem {
  _id: string;
  interviewId: string;
  type: string;
  scheduledAt: string;
  read: boolean;
  title: string;
  message: string;
  interview?: {
    scheduledStart: string;
    companyName: string;
    position: string;
    type: string;
    location: string;
  };
}

interface Props {
  onClose: () => void;
  onNotificationClick: (interviewId: string, scheduledStart: string) => void;
  onRefreshCount: () => void;
}

export function NotificationDropdown({ onClose, onNotificationClick, onRefreshCount }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/upcoming');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data?.notifications || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notification-dropdown]')) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('click', handleClick), 0);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      onRefreshCount();
    } catch {
      // silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      onRefreshCount();
    } catch {
      // silently fail
    }
  };

  const groupedNotifications = React.useMemo(() => {
    const groups: { today: NotificationItem[]; tomorrow: NotificationItem[]; later: NotificationItem[] } = {
      today: [],
      tomorrow: [],
      later: [],
    };

    notifications.forEach((n) => {
      const interviewDate = n.interview?.scheduledStart
        ? new Date(n.interview.scheduledStart)
        : new Date(n.scheduledAt);

      if (isToday(interviewDate)) {
        groups.today.push(n);
      } else if (isTomorrow(interviewDate)) {
        groups.tomorrow.push(n);
      } else {
        groups.later.push(n);
      }
    });

    return groups;
  }, [notifications]);

  const renderNotificationItem = (notification: NotificationItem) => {
    const interviewDate = notification.interview?.scheduledStart
      ? new Date(notification.interview.scheduledStart)
      : new Date(notification.scheduledAt);

    return (
      <button
        key={notification._id}
        onClick={() => {
          if (!notification.read) markAsRead(notification._id);
          if (notification.interview) {
            onNotificationClick(notification.interviewId, notification.interview.scheduledStart);
          }
        }}
        className={`w-full text-left p-3 rounded-lg transition-colors hover:bg-accent/50 ${
          !notification.read ? 'bg-indigo-50/50' : ''
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
              !notification.read ? 'bg-indigo-500' : 'bg-transparent'
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {format(interviewDate, 'HH:mm')}
              </span>
              {notification.interview?.type === 'ONLINE' ? (
                <Monitor className="w-3 h-3 text-blue-500" />
              ) : (
                <MapPin className="w-3 h-3 text-orange-500" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {notification.interview?.companyName || notification.title}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {notification.interview?.position || notification.message}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const renderGroup = (title: string, items: NotificationItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <div className="px-3 py-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </span>
        </div>
        <div className="space-y-0.5">{items.map(renderNotificationItem)}</div>
      </div>
    );
  };

  return (
    <div
      data-notification-dropdown
      className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full mt-2 w-auto sm:w-[340px] max-h-[75dvh] overflow-y-auto bg-popover border rounded-xl shadow-xl shadow-black/10 overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold">Upcoming Interviews</h3>
        </div>
        <div className="flex items-center gap-1">
          {notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={markAllAsRead}
            >
              Mark all read
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="max-h-[400px]">
        <div className="p-2">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <BellOff className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming interviews</p>
            </div>
          ) : (
            <>
              {renderGroup('Today', groupedNotifications.today)}
              {renderGroup('Tomorrow', groupedNotifications.tomorrow)}
              {renderGroup('Later', groupedNotifications.later)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
