'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    document.title = 'Quản trị viên Đăng nhập | Scheduler Job';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Welcome, Admin!');
        router.push('/admin');
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 p-4">
      <Card className="w-full max-w-md bg-slate-900/50 border-slate-700/50 text-white">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Admin Login</CardTitle>
          <CardDescription className="text-slate-400">Scheduler Job Administration</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-600 text-white"
                placeholder="admin@schedulerjob.com"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-semibold"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Sign In
            </Button>
          </form>
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'outline',
              className: 'mt-3 w-full gap-2 border-slate-600 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white',
            })}
          >
            <ArrowLeft className="w-4 h-4" />
            Về đăng nhập thường
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
