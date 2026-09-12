'use client';

import React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your account information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={user.fullName} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="flex items-center gap-2">
              <Input value={user.email} disabled className="flex-1" />
              <Badge className="bg-green-100 text-green-700">Verified</Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={user.timezone || 'Asia/Ho_Chi_Minh'} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
