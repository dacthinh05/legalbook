'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Menu, ChevronDown, CheckSquare, RefreshCw, Database, Layers, Plus, Bell } from 'lucide-react';
import { PacoLogo } from '@/components/common/PacoLogo';
interface AppHeaderProps {
  onSearchClick: () => void;
  unreadCount: number;
  onMobileSidebarToggle: () => void;
  onOpenImportModal?: () => void;
}

export function AppHeader({
  onSearchClick,
  unreadCount,
  onMobileSidebarToggle,
  onOpenImportModal,
}: AppHeaderProps) {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex items-center h-12 px-4 bg-white border-b border-slate-200 gap-3 shrink-0 z-30">
      {/* Left: Mobile Menu & Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          className="md:hidden p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          onClick={onMobileSidebarToggle}
          title="Mở danh mục văn bản"
          aria-label="Mở danh mục văn bản"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/" className="flex items-center group transition-opacity hover:opacity-90">
          <PacoLogo size="sm" />
        </Link>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xl mx-auto px-2">
        <button
          className="w-full flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded text-xs border border-slate-200 transition-colors text-left group"
          onClick={onSearchClick}
          title="Tìm kiếm văn bản (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-700 transition-colors shrink-0" />
          <span className="flex-1 truncate text-slate-500">
            Tìm số hiệu, tên luật, nghị định, thông tư...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-400">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* Admin Menu Dropdown */}
        <div className="relative" ref={adminMenuRef}>
          <button
            onClick={() => setAdminMenuOpen(!adminMenuOpen)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <span>Quản trị</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {adminMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs">
              <a
                href="/admin/verification-queue"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Kiểm duyệt văn bản</span>
              </a>
              <a
                href="/admin/crawler"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Thu thập & Crawl</span>
              </a>
              <a
                href="/admin/categories"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                <span>Cấu trúc danh mục</span>
              </a>
              <a
                href="/admin/upload"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Nguồn & Tải lên tệp</span>
              </a>
            </div>
          )}
        </div>

        {/* Primary Action: Nhập văn bản */}
        {onOpenImportModal ? (
          <button
            type="button"
            onClick={onOpenImportModal}
            className="px-2.5 sm:px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Nhập văn bản mới (Word, PDF)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Nhập văn bản</span>
          </button>
        ) : (
          <a
            href="/admin/upload"
            className="px-2.5 sm:px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Nhập văn bản mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Nhập văn bản</span>
          </a>
        )}

        <div className="w-px h-4 bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Notifications */}
        <button
          className="relative p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
          title={`${unreadCount} văn bản mới`}
          aria-label="Thông báo văn bản"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full" />
          )}
        </button>

        {/* User avatar */}
        <div className="w-7 h-7 bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-xs ml-0.5">
          PA
        </div>
      </div>
    </header>
  );
}
