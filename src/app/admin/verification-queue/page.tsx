'use client';

import React, { Suspense } from 'react';
import { VerificationWorkspace } from '@/components/admin/verification/VerificationWorkspace';
import { ShieldCheck } from 'lucide-react';

export default function VerificationQueuePage() {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 text-slate-500 space-y-3">
          <ShieldCheck className="w-10 h-10 text-blue-600 animate-pulse" />
          <p className="text-xs font-semibold text-slate-700">Đang khởi tạo bàn kiểm duyệt pháp lý...</p>
        </div>
      }
    >
      <VerificationWorkspace />
    </Suspense>
  );
}
