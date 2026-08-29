'use client';

import { CheckCircle2, Circle, Bookmark, Maximize2, Minimize2, ArrowLeft, Info, GitFork, StickyNote, Share2, Printer } from 'lucide-react';
import { cn, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, getEffectiveStatus, formatDate } from '@/lib/utils';
import type { LegalDocument } from '@/types';
import { useState } from 'react';

interface DocumentHeaderProps {
  document: LegalDocument;
  isRead: boolean;
  isBookmarked: boolean;
  onMarkRead: () => void;
  onToggleBookmark: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onBack?: () => void;
  activePanel: 'info' | 'relations' | 'notes' | null;
  onTogglePanel: (panel: 'info' | 'relations' | 'notes') => void;
}

export function DocumentHeader({
  document: doc,
  isRead,
  isBookmarked,
  onMarkRead,
  onToggleBookmark,
  onFullscreen,
  isFullscreen,
  onBack,
  activePanel,
  onTogglePanel,
}: DocumentHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Back button (on mobile/split) & Title info */}
        <div className="flex items-center gap-2.5 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-gray-600 hover:bg-gray-100 rounded-md md:hidden flex-shrink-0"
              title="Quay lại danh sách"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="font-mono text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {doc.document_number || 'Văn bản'}
              </span>

              {/* Status Badge */}
              {(() => {
                const effStatus = getEffectiveStatus(doc);
                return (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border',
                      DOCUMENT_STATUS_COLORS[effStatus]
                    )}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        effStatus === 'hieu_luc' && 'bg-green-500',
                        effStatus === 'chua_hieu_luc' && 'bg-amber-500',
                        effStatus === 'het_hieu_luc_mot_phan' && 'bg-orange-500',
                        effStatus === 'het_hieu_luc_toan_bo' && 'bg-red-500',
                        effStatus === 'chua_xac_dinh' && 'bg-gray-400'
                      )}
                    />
                    {DOCUMENT_STATUS_LABELS[effStatus]}
                    {doc.effective_date && (
                      <span className="text-[10px] opacity-80">
                        từ {formatDate(doc.effective_date)}
                      </span>
                    )}
                  </span>
                );
              })()}

              {doc.issuing_body && (
                <span className="text-[11px] text-gray-500 hidden sm:inline">
                  • {doc.issuing_body}
                </span>
              )}
            </div>

            <h1 className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {doc.title}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Read status button */}
          <button
            onClick={onMarkRead}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors',
              isRead
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            )}
            title={isRead ? 'Đã đánh dấu đã đọc' : 'Nhấn để đánh dấu đã đọc'}
          >
            {isRead ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="hidden sm:inline">Đã đọc</span>
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5 text-gray-400" />
                <span className="hidden sm:inline">Chưa đọc</span>
              </>
            )}
          </button>

          {/* Bookmark button */}
          <button
            onClick={onToggleBookmark}
            className={cn(
              'p-1.5 rounded-md border transition-colors',
              isBookmarked
                ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
            title={isBookmarked ? 'Bỏ ghim' : 'Ghim văn bản'}
          >
            <Bookmark className={cn('w-4 h-4', isBookmarked && 'fill-amber-500')} />
          </button>

          {/* Panel toggles */}
          <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />

          <button
            onClick={() => onTogglePanel('info')}
            className={cn(
              'p-1.5 rounded-md border transition-colors hidden sm:flex items-center gap-1 text-xs font-medium',
              activePanel === 'info'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
            title="Thẻ thông tin văn bản & Tóm tắt"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Thông tin</span>
          </button>

          <button
            onClick={() => onTogglePanel('relations')}
            className={cn(
              'p-1.5 rounded-md border transition-colors hidden sm:flex items-center gap-1 text-xs font-medium',
              activePanel === 'relations'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
            title="Sơ đồ quan hệ văn bản"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Quan hệ</span>
          </button>

          <button
            onClick={() => onTogglePanel('notes')}
            className={cn(
              'p-1.5 rounded-md border transition-colors hidden sm:flex items-center gap-1 text-xs font-medium',
              activePanel === 'notes'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
            title="Ghi chú cá nhân"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ghi chú</span>
          </button>

          {/* Quick tools */}
          <button
            onClick={handleShare}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
            title={copied ? 'Đã sao chép liên kết!' : 'Sao chép liên kết'}
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors hidden md:block"
            title="In văn bản"
          >
            <Printer className="w-4 h-4" />
          </button>

          {onFullscreen && (
            <button
              onClick={onFullscreen}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Mở toàn màn hình'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
