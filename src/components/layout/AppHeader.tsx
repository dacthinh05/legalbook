'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Menu,
  ChevronDown,
  CheckSquare,
  RefreshCw,
  Database,
  Layers,
  Plus,
  Bell,
  ExternalLink,
  FileText,
  ChevronRight,
  ArrowRight,
  X,
  BookOpen,
  Shield,
} from 'lucide-react';
import { PacoLogo } from '@/components/common/PacoLogo';
import {
  cn,
  NOTEBOOKLM_URL,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  getEffectiveStatus,
  formatDate,
} from '@/lib/utils';
import type { LegalDocument } from '@/types';

interface AppHeaderProps {
  onSearchClick: () => void;
  newUpdatesCount?: number;
  recentUpdatedDocs?: LegalDocument[];
  onSelectDocument?: (id: string) => void;
  onOpenUpdatesFeed?: () => void;
  onMobileSidebarToggle: () => void;
  onOpenImportModal?: () => void;
  onLogoClick?: () => void;
}

export function AppHeader({
  onSearchClick,
  newUpdatesCount = 0,
  recentUpdatedDocs = [],
  onSelectDocument,
  onOpenUpdatesFeed,
  onMobileSidebarToggle,
  onOpenImportModal,
  onLogoClick,
}: AppHeaderProps) {
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
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

        <Link
          href="/"
          onClick={(e) => {
            if (onLogoClick) {
              onLogoClick();
            }
          }}
          className="flex items-center group transition-opacity hover:opacity-90 cursor-pointer"
          title="Trang chủ PACO LegalBook"
        >
          <PacoLogo size="sm" />
        </Link>
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xl mx-auto px-2">
        <button
          className="w-full flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100/80 text-slate-500 hover:text-slate-800 rounded-lg text-xs border border-slate-200/90 transition-all text-left group shadow-2xs hover:border-slate-300"
          onClick={onSearchClick}
          title="Tìm kiếm văn bản (Ctrl+K hoặc ⌘K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
          <span className="flex-1 truncate text-slate-500 group-hover:text-slate-700">
            Tìm số hiệu, tên luật, nghị định, thông tư...
          </span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[10.5px] font-mono text-slate-500 shadow-2xs group-hover:border-slate-300">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>
      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        {/* NotebookLM Assistant */}
        <a
          href={NOTEBOOKLM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-all cursor-pointer shadow-2xs group"
          title="Mở Sổ tay NotebookLM tổng quan pháp luật"
        >
          <BookOpen className="w-3.5 h-3.5 text-slate-600" />
          <span className="truncate">Sổ tay NotebookLM</span>
          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
        </a>
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
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                Trung tâm Quản trị
              </div>
              <Link
                href="/admin"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer rounded-md font-medium"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Quản lý văn bản (Tổng quan)</span>
              </Link>
              <Link
                href="/admin/verification-queue"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer rounded-md font-medium"
              >
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Kiểm duyệt quan hệ & Metadata</span>
              </Link>
              <Link
                href="/admin/data-quality"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer rounded-md font-medium"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Chất lượng dữ liệu & Toàn văn</span>
              </Link>
              <Link
                href="/admin/categories"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer rounded-md font-medium"
              >
                <Layers className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span>Cấu trúc danh mục pháp luật</span>
              </Link>
              <Link
                href="/admin/crawler"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer rounded-md font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Thu thập & Crawl tự động</span>
              </Link>
              <Link
                href="/admin/upload"
                onClick={() => setAdminMenuOpen(false)}
                className="w-full px-3 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-900 flex items-center gap-2.5 transition-colors cursor-pointer rounded-md font-medium"
              >
                <Database className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Nguồn & Tải lên tệp (OCR)</span>
              </Link>
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
          <Link
            href="/admin/upload"
            className="px-2.5 sm:px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Nhập văn bản mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Nhập văn bản</span>
          </Link>
        )}
        <div className="w-px h-4 bg-slate-200 mx-0.5 hidden sm:block" />

        {/* Notifications Popover Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={cn(
              'relative p-1.5 rounded transition-colors cursor-pointer',
              notificationsOpen
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            )}
            title={newUpdatesCount > 0 ? `${newUpdatesCount} văn bản mới cập nhật trong 30 ngày` : 'Cập nhật pháp luật'}
            aria-label="Thông báo văn bản mới"
          >
            <Bell className="w-4 h-4" />
            {newUpdatesCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 text-xs select-text overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Văn bản mới cập nhật</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[10.5px] font-mono">
                  {newUpdatesCount} mới (30 ngày)
                </span>
              </div>

              {/* List of recent documents */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {recentUpdatedDocs.length > 0 ? (
                  recentUpdatedDocs.slice(0, 6).map((doc) => {
                    const effStatus = getEffectiveStatus(doc);
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setNotificationsOpen(false);
                          onSelectDocument?.(doc.id);
                        }}
                        className="w-full p-3 text-left hover:bg-blue-50/60 transition-colors flex items-start gap-2.5 group cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-700">
                              {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-900 group-hover:text-blue-700">
                              {doc.document_number}
                            </span>
                            <span className={cn('px-1.5 py-0.2 rounded text-[9.5px] font-medium border ml-auto', DOCUMENT_STATUS_COLORS[effStatus])}>
                              {DOCUMENT_STATUS_LABELS[effStatus]}
                            </span>
                          </div>
                          <p className="text-[11.5px] font-medium text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-950">
                            {doc.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-1">
                            <span className="truncate max-w-[140px]">{doc.issuing_body}</span>
                            <span>·</span>
                            <span>Hiệu lực: {formatDate(doc.effective_date || doc.issued_date)}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0 mt-2 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Không có văn bản mới trong 30 ngày qua
                  </div>
                )}
              </div>

              {/* Footer button */}
              <div className="p-2 bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    onOpenUpdatesFeed?.();
                  }}
                  className="w-full py-1.5 px-3 text-center text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Mở Bảng tin Cập nhật pháp luật</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
        {/* User avatar */}
        <div className="w-7 h-7 bg-slate-200 text-slate-700 rounded flex items-center justify-center font-bold text-xs ml-0.5">
          PA
        </div>
      </div>
    </header>
  );
}
