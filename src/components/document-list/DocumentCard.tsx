'use client';

import React from 'react';
import { Bookmark, GripVertical } from 'lucide-react';
import {
  cn,
  DOCUMENT_TYPE_ABBREV,
  DOCUMENT_TYPE_COLORS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  getEffectiveStatus,
  formatDate,
  formatShortTitle,
} from '@/lib/utils';
import type { LegalDocument } from '@/types';

interface DocumentCardProps {
  document: LegalDocument;
  isSelected: boolean;
  isBookmarked: boolean;
  hideTypeBadge?: boolean;
  onSelect: () => void;
}

export function DocumentCard({
  document: doc,
  isSelected,
  isBookmarked,
  hideTypeBadge = false,
  onSelect,
}: DocumentCardProps) {
  const displayTitle = formatShortTitle(doc.title, doc.document_type, doc.document_number);
  const effStatus = getEffectiveStatus(doc);

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', doc.id);
        e.dataTransfer.setData('application/json', JSON.stringify({ id: doc.id, document_number: doc.document_number, title: doc.title }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={cn(
        'px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all border-b border-slate-100 relative text-left select-text group',
        isSelected
          ? 'bg-blue-50/90 border-l-2 border-l-blue-600'
          : 'hover:bg-slate-50/90 bg-white'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      {/* DÒNG 1: ĐỊNH DANH (SỐ HIỆU + TYPE) BÊN TRÁI + TRẠNG THÁI DUY NHẤT BÊN PHẢI */}
      <div className="flex items-center justify-between gap-1.5 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span title="Kéo để thả vào danh mục" className="shrink-0 flex items-center">
            <GripVertical className="w-3 h-3 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
          </span>
          {!hideTypeBadge && (
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0',
                DOCUMENT_TYPE_COLORS[doc.document_type]
              )}
            >
              {DOCUMENT_TYPE_ABBREV[doc.document_type]}
            </span>
          )}

          {doc.document_number && (
            <span className="text-[11px] font-mono font-semibold text-slate-700 truncate">
              {doc.document_number}
            </span>
          )}
        </div>

        {/* Trạng thái: Chỉ làm nổi bật trạng thái bất thường, 'Hiệu lực' hiển thị tối giản */}
        {effStatus === 'hieu_luc' ? (
          <span className="text-[10px] text-slate-400 font-medium shrink-0">
            Hiệu lực
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border shrink-0 whitespace-nowrap',
              DOCUMENT_STATUS_COLORS[effStatus]
            )}
          >
            {DOCUMENT_STATUS_LABELS[effStatus]}
          </span>
        )}
      </div>
      {/* DÒNG 2: TÊN VĂN BẢN (NỔI BẬT NHẤT) */}
      <h3
        className={cn(
          'text-[12.5px] leading-snug line-clamp-2 transition-colors mb-1',
          isSelected
            ? 'text-blue-900 font-semibold'
            : 'text-slate-800 font-medium group-hover:text-blue-800'
        )}
        title={doc.title}
      >
        {displayTitle}
      </h3>

      {/* DÒNG 3: METADATA CƠ QUAN & NGÀY THÁNG */}
      <div className="flex items-center justify-between text-[10.5px] text-slate-400 gap-1.5">
        <span className="truncate max-w-[140px] text-slate-500">
          {doc.issuing_body || ''}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {doc.effective_date ? (
            <span>HL: {formatDate(doc.effective_date)}</span>
          ) : doc.issued_date ? (
            <span>BH: {formatDate(doc.issued_date)}</span>
          ) : null}

          {isBookmarked && (
            <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}
