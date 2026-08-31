'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { ShieldCheck } from 'lucide-react';

const VerificationWorkspace = dynamic(
  () => import('@/components/admin/verification/VerificationWorkspace').then((mod) => mod.VerificationWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-slate-50 text-slate-500 space-y-3">
        <ShieldCheck className="w-10 h-10 text-blue-600 animate-pulse" />
        <p className="text-xs font-semibold text-slate-700">Đang khởi tạo bàn kiểm duyệt pháp lý...</p>
      </div>
    ),
  }
);

export default function VerificationQueuePage() {
  return <VerificationWorkspace />;
}
