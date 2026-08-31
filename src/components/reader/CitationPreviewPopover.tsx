'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ExternalLink,
  BookOpen,
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Maximize2,
} from 'lucide-react';
import type { LegalDocument } from '@/types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  getEffectiveStatus,
  formatDate,
  cn,
} from '@/lib/utils';
import { extractStructuredArticles } from '@/lib/diff-engine';

export interface CitationPreviewData {
  documentId: string;
  documentNumber: string;
  targetDocument?: LegalDocument | null;
  targetProvisionId?: string; // e.g. "dieu-6"
  provisionCitation?: string; // e.g. "Khoản 1 Điều 6"
  rawText: string;
  anchorRect: DOMRect;
}

interface CitationPreviewPopoverProps {
  data: CitationPreviewData | null;
  onClose: () => void;
  onNavigate: (documentId: string, provisionId?: string) => void;
  onOpenDiff?: (docA: LegalDocument, docB: LegalDocument) => void;
  onTransclude?: (documentId: string, provisionId?: string) => void;
  currentDocument?: LegalDocument;
}

export function CitationPreviewPopover({
  data,
  onClose,
  onNavigate,
  onOpenDiff,
  onTransclude,
  currentDocument,
}: CitationPreviewPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Close on Escape or click outside
  useEffect(() => {
    if (!data) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [data, onClose]);

  const targetDoc = data?.targetDocument;

  // Extract targeted article or preamble from html_content
  const provisionExcerpt = useMemo(() => {
    if (!targetDoc?.html_content) {
      return targetDoc?.summary_main || 'Nội dung văn bản đang được cập nhật.';
    }

    if (data?.targetProvisionId) {
      const articles = extractStructuredArticles(targetDoc.html_content);
      const provNumMatch = data.targetProvisionId.replace('dieu-', '');
      const matched = articles.find(
        (a) =>
          a.id === data.targetProvisionId ||
          (a.number !== undefined && a.number.toString() === provNumMatch) ||
          a.title.toLowerCase().includes(`điều ${provNumMatch}`)
      );

      if (matched) {
        const fullBody = matched.body || '';
        return fullBody.slice(0, 500) + (fullBody.length > 500 ? '...' : '');
      }
    }

    // Fallback: Return summary or first 300 chars of body
    if (targetDoc.summary_main) return targetDoc.summary_main;
    const articles = extractStructuredArticles(targetDoc.html_content);
    if (articles.length > 0) {
      return `${articles[0].title}: ${articles[0].body.slice(0, 300)}...`;
    }

    return targetDoc.title;
  }, [targetDoc, data?.targetProvisionId]);

  if (!data || !targetDoc) return null;

  const effStatus = getEffectiveStatus(targetDoc);
  const statusColor = DOCUMENT_STATUS_COLORS[effStatus];
  const statusLabel = DOCUMENT_STATUS_LABELS[effStatus];

  // Calculate popover positioning with viewport boundary protection
  const rect = data.anchorRect;
  const popoverWidth = 380;
  let top = rect.bottom + 8;
  let left = rect.left + rect.width / 2 - popoverWidth / 2;

  // Viewport bounds clamping
  if (typeof window !== 'undefined') {
    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    // Flip to top if overflowing bottom
    if (top + 280 > window.innerHeight && rect.top > 300) {
      top = rect.top - 290;
    }
  }

  return (
    <div
      ref={popoverRef}
      style={{ top: `${top}px`, left: `${left}px` }}
      className="fixed z-50 w-[380px] bg-white rounded-xl shadow-2xl border border-slate-200/90 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-text"
    >
      {/* ── Header Bar ── */}
      <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="px-1.5 py-0.5 bg-blue-600/90 text-[10px] font-bold uppercase rounded tracking-wider">
            {DOCUMENT_TYPE_LABELS[targetDoc.document_type] || 'Văn bản'}
          </span>
          <span className="font-mono font-bold text-xs truncate text-blue-200">
            {targetDoc.document_number || '---'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${statusColor} bg-white/10 text-white border-white/20`}>
            {statusLabel}
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            title="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Document Title ── */}
      <div className="p-3.5 space-y-2.5 bg-slate-50/50">
        <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-2" title={targetDoc.title}>
          {targetDoc.title}
        </h4>

        {/* Metadata Badges */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
          {targetDoc.issuing_body && (
            <span>Cơ quan: <strong className="text-slate-700">{targetDoc.issuing_body}</strong></span>
          )}
          {targetDoc.effective_date && (
            <span>Hiệu lực: <strong className="text-slate-700">{formatDate(targetDoc.effective_date)}</strong></span>
          )}
        </div>

        {/* ── Targeted Provision Excerpt (Live Preview) ── */}
        <div className="p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-[10.5px] font-bold text-blue-900 uppercase">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{data.provisionCitation || (data.targetProvisionId ? `Điều ${data.targetProvisionId.replace('dieu-', '')}` : 'Trích đoạn quy định')}</span>
            </span>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-blue-700 font-normal normal-case flex items-center gap-0.5"
            >
              <span>{isExpanded ? 'Thu gọn' : 'Xem thêm'}</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          <p className={cn('text-slate-700 text-[11.5px] leading-relaxed font-serif', !isExpanded && 'line-clamp-4')}>
            {provisionExcerpt}
          </p>
        </div>
      </div>

      {/* ── Action Buttons Footer ── */}
      <div className="px-3.5 py-2.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onTransclude && (
            <button
              type="button"
              onClick={() => {
                onTransclude(targetDoc.id, data.targetProvisionId);
                onClose();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors cursor-pointer"
              title="Nhúng trực tiếp nội dung điều khoản này vào giữa trang đang đọc"
            >
              <span>[+] Nhúng tại chỗ</span>
            </button>
          )}

          {onOpenDiff && currentDocument && currentDocument.id !== targetDoc.id && (
            <button
              type="button"
              onClick={() => {
                onOpenDiff(currentDocument, targetDoc);
                onClose();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
              title="So sánh đối chiếu 2 văn bản này"
            >
              <GitCompare className="w-3 h-3 text-slate-600" />
              <span>Đối chiếu</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onNavigate(targetDoc.id, data.targetProvisionId);
            onClose();
          }}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-md text-[11.5px] font-bold transition-all shadow-xs cursor-pointer"
        >
          <span>Mở văn bản</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
