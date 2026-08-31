'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  ExternalLink,
  ArrowRight,
  Clock,
  BookOpen,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Scale,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { LegalEffect } from '@/types';

interface ProvisionEffectPopoverProps {
  effect: LegalEffect;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onOpenDiffModal?: (effect: LegalEffect) => void;
  onSelectDocument?: (documentId: string) => void;
}

export function ProvisionEffectPopover({
  effect,
  anchorRect,
  onClose,
  onOpenDiffModal,
  onSelectDocument,
}: ProvisionEffectPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [onClose]);

  if (!anchorRect) return null;

  // Calculate smart floating position anchored to targetRect
  const popoverWidth = 380;
  const padding = 16;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  let left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
  left = Math.max(padding, Math.min(viewportWidth - popoverWidth - padding, left));

  // Determine top or bottom placement
  const showBelow = anchorRect.top < 260;
  const top = showBelow ? anchorRect.bottom + 8 : anchorRect.top - 8;

  const effDateFormatted = effect.effectiveFrom ? formatDate(effect.effectiveFrom) : 'Đang cập nhật';

  const isGuiding = effect.effectType === 'guides' || effect.effectType === 'implements' || effect.effectType === 'references';
  const isAmending = effect.effectType === 'amends' || effect.effectType === 'replaces' || effect.effectType === 'repeals' || effect.effectType === 'partially_repeals';
  const isSupplementing = effect.effectType === 'supplements' || effect.effectType === 'extends';

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        transform: showBelow ? 'translateY(0)' : 'translateY(-100%)',
        width: `${popoverWidth}px`,
        zIndex: 50,
      }}
      className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 p-4 text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150 select-text text-slate-800"
      role="tooltip"
      aria-label="Thông tin sửa đổi / hướng dẫn điều khoản"
    >
      {/* ── Header Badge Line ── */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5">
          {isGuiding ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <BookOpen className="w-3 h-3 text-amber-700" />
              Được hướng dẫn thi hành
            </span>
          ) : isAmending ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-700" />
              Được sửa đổi / thay thế
            </span>
          ) : isSupplementing ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-700" />
              Được bổ sung nội dung
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Đính chính / Hiệu lực
            </span>
          )}

          {effect.clauseLabel && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded font-mono">
              {effect.clauseLabel} {effect.pointLabel ? `• ${effect.pointLabel}` : ''}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
          aria-label="Đóng popover"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Source Document Citation ── */}
      <div className="space-y-1">
        <div className="text-slate-900 font-bold text-xs leading-snug">
          {effect.sourceDocumentNumber || effect.sourceDocumentTitle}
        </div>
        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
          {effect.sourceDocumentTitle}
        </p>

        <div className="pt-1 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
          <span>{effect.sourceProvisionCitation || effect.legalCitation}</span>
          <span className="text-[10px] text-slate-500 font-mono font-normal">
            Hiệu lực: <strong>{effDateFormatted}</strong>
          </span>
        </div>
      </div>

      {/* ── Explanation / Excerpt ── */}
      {effect.explanationSummary ? (
        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-[11.5px] text-slate-700 leading-relaxed font-sans">
          {effect.explanationSummary}
        </div>
      ) : effect.sourceExcerpt ? (
        <blockquote className="p-2.5 bg-slate-50 border-l-2 border-blue-500 text-slate-700 rounded-r text-[11px] italic leading-relaxed">
          &ldquo;{effect.sourceExcerpt}&rdquo;
        </blockquote>
      ) : null}

      {/* ── Action Buttons ── */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        {onOpenDiffModal && (effect.previousContent || effect.replacementContent || isAmending) ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDiffModal(effect);
            }}
            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Scale className="w-3.5 h-3.5 text-blue-700" />
            <span>Đối chiếu trước / sau</span>
          </button>
        ) : (
          <span className="text-[10.5px] text-slate-400 font-mono">
            Căn cứ hướng dẫn chính thức
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            onClose();
            if (effect.sourceDocumentId && onSelectDocument) {
              onSelectDocument(effect.sourceDocumentId);
            } else if (effect.sourceUrl) {
              window.open(effect.sourceUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          className="text-slate-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 cursor-pointer py-1 px-2 rounded hover:bg-slate-50 transition-colors"
        >
          <span>Mở văn bản nguồn</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
