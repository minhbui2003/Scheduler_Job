'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Users,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';

interface UserItem {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING_VERIFICATION: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700' },
  DISABLED: { label: 'Disabled', color: 'bg-red-100 text-red-700' },
  DELETED: { label: 'Deleted', color: 'bg-gray-100 text-gray-700' },
};

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteUser, setDeleteUser] = useState<UserItem | null>(null);

  useEffect(() => {
    document.title = 'Quản trị hệ thống | Scheduler Job';
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin/login');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search, router]);

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [fetchUsers]);

  const handleAction = async (userId: string, action: 'activate' | 'disable') => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/${action}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success(`User ${action === 'activate' ? 'activated' : 'disabled'}`);
        fetchUsers();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch {
      toast.error('Action failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteUser._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('User and all related data deleted');
        setDeleteUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Delete failed');
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">Admin Panel</span>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-slate-400 hover:text-white gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
              <Users className="w-4 h-4" />
              {users.length} user{users.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="mb-4 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-slate-800" />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-slate-900/50">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Verified</TableHead>
                  <TableHead className="text-slate-400">Last Login</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const config = STATUS_CONFIG[user.status] || STATUS_CONFIG.ACTIVE;
                  return (
                    <TableRow key={user._id} className="border-slate-800 hover:bg-slate-900/50">
                      <TableCell className="font-medium text-white">{user.fullName}</TableCell>
                      <TableCell className="text-slate-300">{user.email}</TableCell>
                      <TableCell>
                        <Badge className={config.color}>{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {user.emailVerifiedAt ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-slate-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'dd MMM yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {format(new Date(user.createdAt), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.role !== 'ADMIN' && (
                          <div className="flex justify-end gap-1">
                            {user.status === 'ACTIVE' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(user._id, 'disable')}
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 h-8 text-xs"
                              >
                                Disable
                              </Button>
                            ) : user.status !== 'DELETED' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAction(user._id, 'activate')}
                                className="text-green-400 hover:text-green-300 hover:bg-green-500/10 h-8 text-xs"
                              >
                                Activate
                              </Button>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUser(user)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              All user data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Applications</li>
                <li>Interviews</li>
                <li>Companies</li>
                <li>Reviews</li>
                <li>Notifications</li>
              </ul>
              <p className="mt-2 text-red-400">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
