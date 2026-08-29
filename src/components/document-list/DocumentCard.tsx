'use client';

import { Bookmark, CheckCircle2, Circle } from 'lucide-react';
import { cn, DOCUMENT_TYPE_ABBREV, DOCUMENT_TYPE_COLORS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, getEffectiveStatus, formatDate, formatShortTitle, isNewDocument } from '@/lib/utils';
import type { LegalDocument } from '@/types';

interface DocumentCardProps {
  document: LegalDocument;
  isSelected: boolean;
  isRead: boolean;
  isBookmarked: boolean;
  hideTypeBadge?: boolean;
  onSelect: () => void;
}

export function DocumentCard({ document: doc, isSelected, isRead, isBookmarked, hideTypeBadge = false, onSelect }: DocumentCardProps) {
  const isNew = isNewDocument(doc.updated_at, 90);
  const displayTitle = hideTypeBadge ? formatShortTitle(doc.title, doc.document_type) : doc.title;
  
  return (
    <div
      className={cn(
        'px-3 py-3 cursor-pointer transition-colors hover:bg-gray-50 relative',
        isSelected && 'bg-blue-50 hover:bg-blue-50 border-l-2 border-l-blue-600'
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onSelect()}
    >
      {/* Top row: unread indicator + doc number + title */}
      <div className="flex items-start gap-2 mb-1.5">
        {/* Unread / read indicator */}
        <span className="flex-shrink-0 mt-0.5" title={isRead ? 'Đã đọc' : 'Chưa đọc'}>
          {isRead
            ? <CheckCircle2 className="w-3.5 h-3.5 text-gray-300" />
            : <Circle className="w-3.5 h-3.5 text-blue-500" />
          }
        </span>

        <div className="flex-1 min-w-0">
          {/* Document number */}
          {doc.document_number && (
            <p className="text-[10px] text-gray-500 font-mono mb-0.5 font-bold">{doc.document_number}</p>
          )}

          {/* Title */}
          <p className={cn(
            'text-xs leading-snug line-clamp-2',
            isSelected ? 'text-blue-800 font-medium' : 'text-gray-800 font-medium',
            isRead && !isSelected && 'text-gray-600'
          )}>
            {displayTitle}
          </p>
        </div>

        {/* Bookmark */}
        {isBookmarked && (
          <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Bottom row: type (if not hidden) + status + date */}
      <div className="flex items-center gap-1.5 pl-5 flex-wrap">
        {/* Document type badge (only if mixed types) */}
        {!hideTypeBadge && (
          <span className={cn(
            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
            DOCUMENT_TYPE_COLORS[doc.document_type]
          )}>
            {DOCUMENT_TYPE_ABBREV[doc.document_type]}
          </span>
        )}

        {/* Status badge */}
        {(() => {
          const effStatus = getEffectiveStatus(doc);
          return (
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium shrink-0 whitespace-nowrap',
              DOCUMENT_STATUS_COLORS[effStatus]
            )}>
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                effStatus === 'hieu_luc' && 'bg-green-500',
                effStatus === 'chua_hieu_luc' && 'bg-amber-500',
                effStatus === 'het_hieu_luc_mot_phan' && 'bg-orange-500',
                effStatus === 'het_hieu_luc_toan_bo' && 'bg-red-500',
                effStatus === 'chua_xac_dinh' && 'bg-gray-400',
              )} />
              {DOCUMENT_STATUS_LABELS[effStatus]}
            </span>
          );
        })()}

        {/* New badge */}
        {isNew && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px] font-semibold">
            Mới
          </span>
        )}

        {/* Effective date */}
        {doc.effective_date && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {formatDate(doc.effective_date)}
          </span>
        )}
      </div>

      {/* Issuing body */}
      {doc.issuing_body && (
        <p className="text-[10px] text-gray-400 pl-5 mt-1 truncate">{doc.issuing_body}</p>
      )}
    </div>
  );
}
