'use client';

import React, { useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import type { LegalDocument } from '@/types';
import { DocumentSummaryView } from './DocumentSummaryView';

interface AiSummaryModalProps {
  document: LegalDocument;
  isOpen: boolean;
  onClose: () => void;
  onOpenAiChat?: (initialQuery?: string) => void;
  onCitationClick?: (articleNumber?: string) => void;
}

export function AiSummaryModal({
  document: doc,
  isOpen,
  onClose,
  onOpenAiChat,
  onCitationClick,
}: AiSummaryModalProps) {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-4xl max-h-[calc(100vh-64px)] bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="summary-modal-title"
      >
        {/* Compact Modal Header (Height <= 60px) */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-blue-700 shrink-0" />
            <h2 id="summary-modal-title" className="font-bold text-sm text-slate-900 truncate">
              Tổng quan pháp lý · {doc.document_number || doc.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Summary Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <DocumentSummaryView
            document={doc}
            isModal={true}
            onNavigateToArticle={(artNum) => {
              onClose();
              onCitationClick?.(artNum);
            }}
            onOpenAiChat={(query) => {
              onClose();
              onOpenAiChat?.(query);
            }}
          />
        </div>
      </div>
    </div>
  );
}
