'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Copy,
  Check,
  Download,
  Share2,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ExternalLink,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import { cn, formatShortTitle } from '@/lib/utils';
import { summarizeDocumentWithAi, type LegalDocumentSummary } from '@/lib/ai/legal-rag';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import type { LegalDocument } from '@/types';

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
  const [summary, setSummary] = useState<LegalDocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'structured' | 'markdown'>('structured');
  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await summarizeDocumentWithAi(doc);
      setSummary(res);
    } catch (err) {
      console.error('Error generating AI summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [doc]);

  useEffect(() => {
    if (!isOpen || summary) return;
    let active = true;
    summarizeDocumentWithAi(doc)
      .then((res) => {
        if (active) {
          setSummary(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Error generating AI summary:', err);
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [isOpen, doc, summary]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary.fullMarkdown);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const shortTitle = formatShortTitle(doc.title, doc.document_type, doc.document_number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden text-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-summary-title"
      >
        {/* ── Modal Header ── */}
        <div className="px-5 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-blue-800/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                  AI Legal Summary
                </span>
                <span className="text-xs text-blue-200 font-mono hidden sm:inline">
                  {doc.document_number}
                </span>
              </div>
              <h2 id="ai-summary-title" className="text-sm sm:text-base font-bold text-white truncate max-w-xl">
                Tóm tắt chuyên sâu: {shortTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={fetchSummary}
              disabled={isLoading}
              title="Tạo lại tóm tắt"
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Subheader / Metadata Bar ── */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              {doc.issuing_body || 'Cơ quan ban hành'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Hiệu lực: <strong className="text-slate-800">{doc.effective_date || doc.issued_date || 'Theo quy định'}</strong>
            </span>
            {summary && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  {summary.source === 'gemini' ? 'Google Gemini 2.5 Flash' : 'LegalBook RAG Engine'}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md p-0.5 bg-slate-200 text-slate-700 font-medium text-xs">
              <button
                onClick={() => setActiveTab('structured')}
                className={cn(
                  'px-2.5 py-1 rounded transition-all cursor-pointer',
                  activeTab === 'structured' ? 'bg-white text-blue-900 font-semibold shadow-2xs' : 'hover:text-slate-900'
                )}
              >
                Cấu trúc bảng
              </button>
              <button
                onClick={() => setActiveTab('markdown')}
                className={cn(
                  'px-2.5 py-1 rounded transition-all cursor-pointer',
                  activeTab === 'markdown' ? 'bg-white text-blue-900 font-semibold shadow-2xs' : 'hover:text-slate-900'
                )}
              >
                Toàn văn Markdown
              </button>
            </div>
          </div>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4 text-slate-500">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-3 border-blue-100 border-t-blue-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute inset-0 m-auto" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Đang phân tích toàn văn văn bản bằng AI...
                </p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Trích xuất các điều khoản, phân tích điểm mới và đánh giá tác động tuân thủ.
                </p>
              </div>
            </div>
          ) : summary ? (
            activeTab === 'structured' ? (
              <div className="space-y-6">
                {/* 1. Tổng quan */}
                <div className="p-4 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 rounded-xl border border-blue-100/90 space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <h3>1. Tổng quan & Mục đích ban hành</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-sans">
                    {summary.overview?.normalize('NFC')}
                  </p>
                </div>

                {/* 2. Điểm mới nổi bật */}
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <h3>2. Các điểm mới & Thay đổi then chốt</h3>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-800 rounded border border-amber-200">
                      {summary.newPoints.length} Điểm mới
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {summary.newPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{point}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Căn cứ điều khoản then chốt */}
                  {summary.keyArticles.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Căn cứ một số Điều khoản nổi bật:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {summary.keyArticles.map((art, idx) => (
                          <div
                            key={idx}
                            onClick={() => onCitationClick?.(art.articleNumber)}
                            className={cn(
                              'p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-blue-50/70 hover:border-blue-300 transition-all text-left group',
                              onCitationClick && 'cursor-pointer'
                            )}
                          >
                            <div className="flex items-center justify-between gap-1 text-xs font-bold text-blue-900 group-hover:text-blue-700">
                              <span>{art.articleTitle}</span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                            </div>
                            <p className="text-[11.5px] text-slate-600 line-clamp-2 mt-1 font-sans leading-relaxed">
                              {art.summary?.normalize('NFC')}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Grid: Đối tượng áp dụng & Lộ trình */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Đối tượng */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <h3>3. Đối tượng áp dụng</h3>
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {summary.applicableTarget.map((target, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{target}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Lộ trình */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <h3>4. Hiệu lực & Lộ trình</h3>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {summary.effectiveTimeline}
                    </p>
                  </div>
                </div>

                {/* 5. Lưu ý thực thi & Rủi ro */}
                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3>5. Lưu ý thực thi & Rủi ro pháp lý cần tránh</h3>
                  </div>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {summary.complianceRisks.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              /* Full Markdown view */
              <div className="p-5 bg-slate-50/80 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-800">
                <MarkdownRenderer content={summary.fullMarkdown} className="text-sm" />
              </div>
            )
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm">
              Không thể tải nội dung tóm tắt. Vui lòng thử lại.
            </div>
          )}
        </div>

        {/* ── Modal Footer Controls ── */}
        <div className="px-5 py-3.5 bg-slate-100/90 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenAiChat && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAiChat('Hãy giải thích chi tiết các điểm mới của văn bản này.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <MessageSquareText className="w-3.5 h-3.5" />
                <span>Hỏi thêm Trợ lý AI</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!summary || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sao chép Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={!summary || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>In / Xuất PDF</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
