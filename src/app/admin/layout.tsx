'use client';

import Link from 'next/link';
import { BookOpen, FolderTree, Upload, Users, ArrowLeft, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Admin Header */}
      <header className="bg-slate-900 text-white h-14 px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
            LB
          </div>
          <div>
            <span className="font-bold text-sm">LegalBook Quản Trị</span>
            <span className="ml-2 text-[10px] bg-slate-800 text-blue-300 px-2 py-0.5 rounded border border-slate-700">
              Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về ứng dụng Ebook
          </Link>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6">
        {/* Admin Navigation */}
        <aside className="w-60 bg-white border border-gray-200 rounded-xl p-3 shadow-xs h-fit space-y-1 text-xs">
          <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Nghiệp vụ quản lý
          </p>
          <Link
            href="/admin"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
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
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
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
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
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
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
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
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
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
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg font-medium transition-colors ${
              pathname === '/admin/crawler'
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center font-bold text-amber-600 text-xs">⚡</span>
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
        <main className="flex-1 bg-white border border-gray-200 rounded-xl p-6 shadow-xs overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
