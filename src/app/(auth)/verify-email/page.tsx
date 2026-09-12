'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'Xác thực Email | Scheduler Job';
    if (!token) {
      setStatus('error');
      setMessage('Liên kết thiếu mã xác minh. Vui lòng mở đầy đủ liên kết trong email.');
      return;
    }

    let active = true;
    setStatus('loading');
    const verify = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?${new URLSearchParams({ token })}`);
        const data = await res.json();
        if (!active) return;

        if (data.success) {
          setStatus('success');
          setMessage(data.data?.message || 'Email đã được xác minh. Bạn có thể đăng nhập ngay.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Không thể xác minh email. Vui lòng thử lại.');
        }
      } catch {
        if (!active) return;
        setStatus('error');
        setMessage('Không thể kết nối để xác minh email. Vui lòng tải lại trang.');
      }
    };

    verify();
    return () => { active = false; };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md relative shadow-xl shadow-indigo-500/5 border-indigo-100/50">
        <CardContent className="pt-8 pb-8 text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold mb-2">Đang xác minh email...</h2>
              <p className="text-muted-foreground">Vui lòng chờ trong khi xác minh tài khoản của bạn.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Email đã được xác minh!</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Đến trang đăng nhập
                </Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full bg-red-100">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Chưa thể xác minh email</h2>
              <p className="text-muted-foreground mb-6">{message}</p>
              <div className="space-y-2">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Về trang đăng nhập
                  </Button>
                </Link>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
