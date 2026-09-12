'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Globe } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-500" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notification settings will be available in a future update. Currently, all interview reminders (1 day, 2 hours, 30 minutes before) are enabled by default.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            Language & Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Language and timezone settings will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
