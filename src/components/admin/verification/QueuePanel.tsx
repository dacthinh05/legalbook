'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import type { DocumentVerificationRecord } from '@/lib/verification/types';

interface QueuePanelProps {
  documents: DocumentVerificationRecord[];
  selectedDocId: string;
  onSelectDocument: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
}

export function QueuePanel({
  documents,
  selectedDocId,
  onSelectDocument,
  isCollapsed,
  onToggleCollapse,
  width,
}: QueuePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [issueFilter, setIssueFilter] = useState<'all' | 'errors' | 'warnings' | 'clean'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium'>('all');

  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const num = (doc.document.document_number || '').toLowerCase();
        const title = (doc.document.title || '').toLowerCase();
        const issuer = (doc.document.issuing_body || '').toLowerCase();
        if (!num.includes(q) && !title.includes(q) && !issuer.includes(q)) {
          return false;
        }
      }

      // Issue filter
      const errorCount = doc.conflicts.filter((c) => c.severity === 'error' && !c.isResolved).length;
      const warningCount = doc.conflicts.filter((c) => c.severity === 'warning' && !c.isResolved && !c.isConfirmed).length;

      if (issueFilter === 'errors' && errorCount === 0) return false;
      if (issueFilter === 'warnings' && warningCount === 0) return false;
      if (issueFilter === 'clean' && (errorCount > 0 || warningCount > 0)) return false;

      // Priority filter
      if (priorityFilter === 'high' && errorCount === 0 && doc.overallConfidence >= 85) return false;
      if (priorityFilter === 'medium' && (errorCount > 0 || doc.overallConfidence < 85)) return false;

      return true;
    });
  }, [documents, searchQuery, issueFilter, priorityFilter]);

  const currentIndex = documents.findIndex((d) => d.id === selectedDocId);
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : 1;
  const totalCount = documents.length;

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-r border-slate-200 flex flex-col items-center py-3 select-none shrink-0 transition-all">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 mb-4"
          title="Mở rộng hàng chờ"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="writing-mode-vertical text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 mb-1" />
          <span>HÀNG CHỜ ({totalCount})</span>
        </div>
      </div>
    );
  }

  return (
    <aside
      style={{ width: `${width}px` }}
      className="bg-white border-r border-slate-200 flex flex-col shrink-0 h-full select-none overflow-hidden transition-all"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-slate-900">Tài liệu chờ duyệt</span>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[11px] rounded-full border border-blue-100">
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700"
            title="Thu gọn hàng chờ"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm số hiệu hoặc tên..."
            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-1.5">
          <select
            value={issueFilter}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all' || val === 'errors' || val === 'warnings' || val === 'clean') {
                setIssueFilter(val);
              }
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">Tất cả lỗi</option>
            <option value="errors">Có lỗi chặn</option>
            <option value="warnings">Có cảnh báo</option>
            <option value="clean">Không cảnh báo</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'all' || val === 'high' || val === 'medium') {
                setPriorityFilter(val);
              }
            }}
            className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">Ưu tiên: Tất cả</option>
            <option value="high">Ưu tiên cao</option>
            <option value="medium">Bình thường</option>
          </select>
        </div>

        {/* Progress Display */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
          <span>
            Tài liệu <strong className="text-slate-800">{currentPosition}</strong>/{totalCount}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            Phím tắt: <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold">J</kbd> / <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold">K</kbd>
          </span>
        </div>
      </div>

      {/* Document Queue List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
        {filteredDocs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            Không tìm thấy tài liệu phù hợp tiêu chí lọc.
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocId;
            const errorCount = doc.conflicts.filter((c) => c.severity === 'error' && !c.isResolved).length;
            const warningCount = doc.conflicts.filter((c) => c.severity === 'warning' && !c.isResolved && !c.isConfirmed).length;

            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                className={`p-3 rounded-xl transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'bg-blue-50/80 border border-blue-400/80 shadow-2xs ring-1 ring-blue-400/30'
                    : 'bg-white border border-transparent hover:border-slate-200 hover:bg-slate-50/80'
                }`}
              >
                {/* Row 1: Document Number & Conflict Badges */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono font-bold text-xs text-slate-900 truncate">
                    {doc.document.document_number || 'Chưa có số hiệu'}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    {doc.reviewStatus === 'verified' ? (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded border border-emerald-200 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã duyệt
                      </span>
                    ) : errorCount > 0 ? (
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-200 flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3" />
                        {errorCount} lỗi
                      </span>
                    ) : warningCount > 0 ? (
                      <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[10px] font-bold rounded border border-amber-200 flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        {warningCount} cảnh báo
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                        Khớp 100%
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Title (max 2 lines) */}
                <p className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug">
                  {doc.document.title}
                </p>

                {/* Row 3: Issuer & Date */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span className="truncate max-w-[170px]" title={doc.document.issuing_body || 'Bộ Tài chính'}>
                    {doc.document.issuing_body || 'Bộ Tài chính'}
                  </span>
                  <span className="shrink-0 font-mono text-[10px]">
                    {doc.fields['issued_date']?.currentValue || doc.document.issued_date || 'Chưa ngày'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
