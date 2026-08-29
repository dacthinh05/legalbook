'use client';

import React, { useEffect, useMemo } from 'react';
import {
  Scale,
  X,
  ArrowRight,
  ExternalLink,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  FileText,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { diffWords, type DiffToken } from '@/lib/diff-engine';
import type { LegalEffect } from '@/types';

interface ProvisionDiffModalProps {
  effect: LegalEffect | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument?: (documentId: string) => void;
}

export function ProvisionDiffModal({
  effect,
  isOpen,
  onClose,
  onSelectDocument,
}: ProvisionDiffModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const diffTokens = useMemo<DiffToken[]>(() => {
    if (!effect || !effect.previousContent || !effect.replacementContent) return [];
    try {
      return diffWords(effect.previousContent, effect.replacementContent);
    } catch {
      return [];
    }
  }, [effect]);

  if (!isOpen || !effect) return null;

  const effDateFormatted = effect.effectiveFrom ? formatDate(effect.effectiveFrom) : 'Đang cập nhật';
  const isAmending = effect.effectType === 'amends' || effect.effectType === 'replaces' || effect.effectType === 'repeals';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 select-text">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="provision-diff-title"
      >
        {/* ── Modal Header (Height <= 72px) ── */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 id="provision-diff-title" className="font-bold text-sm sm:text-base text-slate-900 truncate">
                Đối chiếu sửa đổi · {effect.targetProvisionLabel || effect.targetProvisionId}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>{effect.clauseLabel || 'Quy định'} {effect.pointLabel ? `• ${effect.pointLabel}` : ''}</span>
                <span>•</span>
                <span>Áp dụng từ: <strong className="text-slate-800">{effDateFormatted}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Citation Context Banner ── */}
        <div className="px-5 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs text-blue-950 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold shrink-0">Văn bản sửa đổi / hướng dẫn:</span>
            <span className="font-semibold text-blue-900 truncate">{effect.sourceDocumentNumber || effect.sourceDocumentTitle}</span>
          </div>

          <span className="text-[11px] font-mono text-blue-800 font-bold bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200 shrink-0">
            {effect.sourceProvisionCitation || effect.legalCitation}
          </span>
        </div>

        {/* ── Scrollable Diff Comparison Body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Explanation if available */}
          {effect.explanationSummary && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-sans">
              <strong className="block text-slate-900 font-semibold mb-1">Tóm lược tác động:</strong>
              {effect.explanationSummary}
            </div>
          )}

          {/* Side-by-Side Comparison Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-[13px]">
            {/* Left: Previous / Repealed Content */}
            <div className="p-4 bg-red-50/60 border border-red-200/90 rounded-xl space-y-2 flex flex-col">
              <div className="flex items-center justify-between border-b border-red-200/80 pb-2">
                <span className="font-bold text-red-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  Nội dung cũ (Trước khi sửa đổi)
                </span>
                <span className="text-red-700 font-mono text-[10px] font-bold bg-red-100 px-1.5 py-0.2 rounded">
                  [CŨ]
                </span>
              </div>

              <div className="flex-1 text-red-950 font-serif leading-relaxed text-justify pt-1">
                {effect.previousContent || (
                  <span className="text-slate-400 italic font-sans text-xs">
                    (Quy định ban đầu được áp dụng trước thời điểm có hiệu lực của văn bản sửa đổi)
                  </span>
                )}
              </div>
            </div>

            {/* Right: New / Replacement Content */}
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/90 rounded-xl space-y-2 flex flex-col">
              <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                <span className="font-bold text-emerald-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Nội dung mới (Sau sửa đổi / Áp dụng mới)
                </span>
                <span className="text-emerald-700 font-mono text-[10px] font-bold bg-emerald-100 px-1.5 py-0.2 rounded">
                  [MỚI]
                </span>
              </div>

              <div className="flex-1 text-emerald-950 font-serif leading-relaxed text-justify pt-1">
                {effect.replacementContent || (
                  <span className="text-slate-400 italic font-sans text-xs">
                    (Nội dung hướng dẫn chi tiết có hiệu lực thi hành từ ngày {effDateFormatted})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Token-level Detailed Diff (If tokens available) */}
          {diffTokens.length > 0 && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center justify-between">
                <span>So sánh chi tiết từng cụm từ (Token-level Diff):</span>
                <span className="text-[10.5px] text-slate-500 font-normal">
                  <span className="text-red-700 bg-red-100 px-1.5 py-0.2 rounded font-semibold line-through mr-1">Đỏ: Bị thay</span>
                  <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold">Xanh: Mới</span>
                </span>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-[13px] font-serif leading-relaxed text-justify select-text">
                {diffTokens.map((token, i) => {
                  if (token.op === 'added') {
                    return (
                      <span key={i} className="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">
                        {token.text}
                      </span>
                    );
                  }
                  if (token.op === 'deleted') {
                    return (
                      <span key={i} className="bg-red-100 text-red-900 line-through decoration-red-500 px-0.5 rounded-xs opacity-75">
                        {token.text}
                      </span>
                    );
                  }
                  return <span key={i}>{token.text}</span>;
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Modal Footer Controls ── */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 font-mono text-[11px]">
            Hệ thống Đối chiếu Điều khoản Pháp lý Tự động · LegalBook Engine
          </div>

          <div className="flex items-center gap-2">
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
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Xem văn bản nguồn</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
