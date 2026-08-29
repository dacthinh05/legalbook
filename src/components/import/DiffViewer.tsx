'use client';

import React, { useState } from 'react';
import { NormalizationChange } from '@/lib/document-import/types';
import { Check, X, HelpCircle, Sparkles } from 'lucide-react';

interface DiffViewerProps {
  originalText: string;
  normalizedText: string;
  changes: NormalizationChange[];
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
}

export function DiffViewer({
  originalText,
  changes,
  onAcceptChange,
  onRejectChange,
}: DiffViewerProps) {
  const [selectedChange, setSelectedChange] = useState<NormalizationChange | null>(null);

  // Render text with inline highlighted diff tokens
  const renderInteractiveDiff = () => {
    if (!originalText) return <p className="text-slate-400 italic">Không có văn bản.</p>;
    if (changes.length === 0) {
      return <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed">{originalText}</div>;
    }

    // Build regex of all change originalTexts
    const patterns = changes.map((c) => c.originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const combinedRegex = new RegExp(`(${patterns.join('|')})`, 'gi');

    const parts = originalText.split(combinedRegex);

    return (
      <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed space-y-2">
        {parts.map((part, index) => {
          const matchedChange = changes.find(
            (c) => c.originalText.toLowerCase() === part.toLowerCase()
          );

          if (!matchedChange) {
            return <span key={index}>{part}</span>;
          }

          const isAccepted = matchedChange.status === 'accepted';
          const isRejected = matchedChange.status === 'rejected';

          return (
            <span
              key={index}
              onClick={() => setSelectedChange(matchedChange)}
              className={`inline-flex items-center gap-1 mx-0.5 px-1.5 py-0.5 rounded cursor-pointer transition-all border ${
                isAccepted
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : isRejected
                  ? 'bg-slate-100 border-slate-300 text-slate-500 line-through'
                  : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
              title={`Bấm để xem lý do: ${matchedChange.reason}`}
            >
              {isRejected ? (
                <span>{matchedChange.originalText}</span>
              ) : (
                <>
                  <span className="line-through text-red-600/70 text-[10px] mr-1">
                    {matchedChange.originalText}
                  </span>
                  <span className="font-semibold text-emerald-700">
                    {matchedChange.suggestedText}
                  </span>
                </>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Diff Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold text-slate-800">
            So sánh thay đổi ({changes.length} điểm đã chuẩn hóa)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-red-100 border border-red-300 rounded-xs inline-block" />
            <span>Gốc / Lỗi</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-300 rounded-xs inline-block" />
            <span>Đã chuẩn hóa</span>
          </span>
        </div>
      </div>

      {/* Main Diff Content */}
      <div className="flex-1 p-4 overflow-y-auto max-h-96">
        {renderInteractiveDiff()}
      </div>

      {/* Detail drawer when a specific change is selected */}
      {selectedChange && (
        <div className="p-3 bg-blue-50/70 border-t border-blue-200 flex items-center justify-between text-xs animate-in fade-in">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">Chi tiết chuẩn hóa:</span>
              <span className="line-through text-red-600 font-mono">
                {selectedChange.originalText}
              </span>
              <span>&rarr;</span>
              <span className="font-bold text-emerald-700 font-mono">
                {selectedChange.suggestedText}
              </span>
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px] font-semibold">
                Độ tin cậy: {(selectedChange.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 flex items-center gap-1">
              <HelpCircle className="w-3 h-3 text-slate-400" />
              <span>{selectedChange.reason}</span>
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onAcceptChange(selectedChange.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Chấp nhận</span>
            </button>
            <button
              type="button"
              onClick={() => onRejectChange(selectedChange.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-700 hover:text-rose-700 rounded font-semibold text-[11px] transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Giữ nguyên gốc</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
