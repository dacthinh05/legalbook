'use client';

import Link from 'next/link';
import { BookOpen, FolderTree, Upload, Users, ArrowLeft, Shield, RefreshCw } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { PacoLogo } from '@/components/common/PacoLogo';
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isVerificationPage = pathname?.startsWith('/admin/verification-queue');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white h-14 px-6 flex items-center justify-between shadow-md sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center group transition-opacity hover:opacity-90 cursor-pointer" title="Về trang chủ LegalBook">
            <PacoLogo size="sm" />
          </Link>
          <div className="h-5 w-px bg-slate-700 mx-1 hidden sm:block" />
          <span className="text-[11px] font-bold bg-blue-900/60 text-blue-300 px-2.5 py-0.5 rounded border border-blue-700/60 uppercase tracking-wider hidden sm:inline-block">
            Bàn Quản Trị Hệ Thống
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors font-medium cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về ứng dụng Ebook</span>
          </Link>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className={`flex-1 flex w-full mx-auto gap-4 ${isVerificationPage ? 'max-w-[1920px] p-2 md:p-3' : 'max-w-7xl p-6'}`}>
        {/* Admin Navigation */}
        <aside className="w-60 bg-white border border-gray-200 rounded-xl p-3 shadow-xs h-fit space-y-1 text-xs">
          <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Nghiệp vụ quản lý
          </p>
          <Link
            href="/admin"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              pathname === '/admin'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-600" />
            Quản lý văn bản
          </Link>

          <Link
            href="/admin/categories"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              pathname === '/admin/categories'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FolderTree className="w-4 h-4 text-green-600" />
            Cây mục lục pháp luật
          </Link>

          <Link
            href="/admin/upload"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              pathname === '/admin/upload'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-4 h-4 text-purple-600" />
            Tải lên PDF & AI OCR
          </Link>

          <Link
            href="/admin/data-quality"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              pathname === '/admin/data-quality'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-600" />
            Chất lượng dữ liệu & Toàn văn
          </Link>

          <Link
            href="/admin/verification-queue"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              pathname === '/admin/verification-queue'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Kiểm duyệt quan hệ
          </Link>

          <Link
            href="/admin/crawler"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              pathname === '/admin/crawler'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-slate-600" />
            Tự tìm & Crawl luật mới
          </Link>

          <div className="pt-3 border-t border-gray-100 mt-2">
            <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Hệ thống
            </p>
            <div className="flex items-center gap-2.5 px-3 py-2 text-gray-400">
              <Users className="w-4 h-4" />
              <span>Phân quyền (RBAC)</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-2 text-gray-400">
              <Shield className="w-4 h-4" />
              <span>Nhật ký Audit Log</span>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className={`flex-1 bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden ${isVerificationPage ? 'p-0' : 'p-6'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
