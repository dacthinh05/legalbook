'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Sparkles,
  FileText,
  Clock,
  Users,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Printer,
  Download,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ListTree,
  MessageSquareText,
  Loader2,
  Info,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { summarizeDocumentWithAi, type LegalDocumentSummary, type SummaryCitation } from '@/lib/ai/legal-rag';
import type { LegalDocument } from '@/types';

interface DocumentSummaryViewProps {
  document: LegalDocument;
  onNavigateToArticle?: (articleNumber: string) => void;
  onOpenToc?: () => void;
  onOpenAiChat?: (initialQuery?: string) => void;
  className?: string;
  isModal?: boolean;
}

export function DocumentSummaryView({
  document: doc,
  onNavigateToArticle,
  onOpenToc,
  onOpenAiChat,
  className,
  isModal = false,
}: DocumentSummaryViewProps) {
  const [summary, setSummary] = useState<LegalDocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [copyMode, setCopyMode] = useState<'text' | 'markdown'>('text');

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await summarizeDocumentWithAi(doc);
      setSummary(res);
    } catch (err) {
      console.error('Error generating document overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, [doc]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    summarizeDocumentWithAi(doc)
      .then((res) => {
        if (active) {
          setSummary(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('Error loading summary:', err);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [doc]);

  const handleCopy = (mode: 'text' | 'markdown' = 'text') => {
    if (!summary) return;
    const content = mode === 'markdown' ? summary.fullMarkdown : `${summary.documentNumber} — ${summary.documentTitle}\n\n1. VĂN BẢN QUY ĐỊNH GÌ?\n${summary.scopeAndPurpose}\n\n2. NỘI DUNG ĐÁNG CHÚ Ý\n${summary.notableProvisions.map((p, i) => `${i + 1}. ${p.title}: ${p.text}`).join('\n')}\n\n3. ĐỐI TƯỢNG ÁP DỤNG\n${summary.impactedEntities.map((e) => `- ${e.name}`).join('\n')}\n\n4. VIỆC CẦN LƯU Ý\n${summary.complianceNotes.map((n) => `- ${n.title}: ${n.content}`).join('\n')}`;

    navigator.clipboard.writeText(content);
    setIsCopied(true);
    setCopyMode(mode);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const docNumber = doc.document_number || 'Văn bản';
  const effectiveDateFormatted = doc.effective_date ? formatDate(doc.effective_date) : (doc.issued_date ? formatDate(doc.issued_date) : 'Theo quy định');
  const issuedDateFormatted = doc.issued_date ? formatDate(doc.issued_date) : 'Chưa cập nhật';

  return (
    <div className={cn('w-full max-w-4xl mx-auto space-y-6 select-text', className)}>
      {/* ── HEADER CARD: Tổng quan văn bản ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        {/* Top Badges & Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs rounded-md uppercase tracking-wider">
              Tổng quan văn bản
            </span>
            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded">
              {docNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSummary}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Phân tích lại nội dung"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              <span>{isLoading ? 'Đang phân tích...' : 'Phân tích lại'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopy('text')}
              disabled={!summary || isLoading}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Sao chép bản tóm tắt"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isCopied ? 'Đã sao chép' : 'Sao chép'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={!summary || isLoading}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="In hoặc xuất PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">In / PDF</span>
            </button>
          </div>
        </div>

        {/* Document Title (Fully readable, max 2-3 lines, no ellipsis cutoff) */}
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-950 leading-snug break-words">
            {doc.title}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-600 mt-2 flex-wrap">
            <span className="font-medium text-slate-800">{doc.issuing_body || 'Bộ Tài chính'}</span>
            <span className="text-slate-300">•</span>
            <span>Hiệu lực từ ngày: <strong className="text-slate-900 font-semibold">{effectiveDateFormatted}</strong></span>
            {doc.signer && (
              <>
                <span className="text-slate-300">•</span>
                <span>Người ký: <strong className="text-slate-800">{doc.signer}</strong></span>
              </>
            )}
          </div>
        </div>

        {/* Status / Provenance Line */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs flex-wrap gap-2">
          {summary?.reviewStatus === 'verified' ? (
            <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tóm tắt đã kiểm duyệt · {summary.verifiedBy || 'Ban Pháp chế'} · {summary.verifiedAt || '29/08/2026'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Tóm tắt hỗ trợ bởi AI · Chưa kiểm duyệt — Cần đối chiếu văn bản gốc trước khi áp dụng.</span>
            </div>
          )}

          {summary && (
            <span className="text-[11px] text-slate-400 font-mono">
              Cập nhật lúc {new Date(summary.generatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, {new Date(summary.generatedAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
      </div>

      {/* ── LOADING SKELETON STATE ── */}
      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>
          <div className="p-5 bg-white rounded-xl border border-slate-200 space-y-3">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-16 bg-slate-100 rounded" />
            <div className="h-16 bg-slate-100 rounded" />
          </div>
        </div>
      )}

      {/* ── MAIN STRUCTURED SECTIONS ── */}
      {!isLoading && summary && (
        <div className="space-y-5">
          {/* SECTION 1: Văn bản quy định gì? */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base border-b border-slate-100 pb-2">
              <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
              <h3>1. Văn bản quy định gì?</h3>
            </div>
            <p className="text-slate-800 text-[14.5px] sm:text-[15px] leading-relaxed">
              {summary.scopeAndPurpose}
            </p>
          </section>

          {/* SECTION 2: Nội dung đáng chú ý */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                <Sparkles className="w-4 h-4 text-blue-700 shrink-0" />
                <h3>2. Nội dung đáng chú ý</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {summary.notableProvisions.length} nội dung trọng yếu
              </span>
            </div>

            <div className="space-y-3">
              {summary.notableProvisions.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-bold text-xs sm:text-[13.5px] text-slate-900">
                      {idx + 1}. {item.title}
                    </h4>

                    {item.citations?.[0] && (
                      <button
                        type="button"
                        onClick={() => onNavigateToArticle?.(item.citations[0].articleNumber || item.citations[0].label)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer shrink-0"
                        title={`Chuyển tới ${item.citations[0].label} trong toàn văn`}
                      >
                        <span>{item.citations[0].label}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs sm:text-[13px] text-slate-700 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 3 & 4: Grid 2 Columns (Đối tượng tác động + Việc cần lưu ý) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* SECTION 3: Đối tượng chịu tác động */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs flex flex-col">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                <h3>3. Đối tượng chịu tác động</h3>
              </div>

              <ul className="space-y-2.5 text-xs sm:text-[13px] text-slate-700 flex-1">
                {summary.impactedEntities.map((entity, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">{entity.name}</span>
                      {entity.description && (
                        <p className="text-slate-600 text-[12px] mt-0.5 leading-snug">{entity.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* SECTION 4: Việc cần lưu ý */}
            <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-2xs flex flex-col">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <h3>4. Việc cần lưu ý</h3>
              </div>

              <div className="space-y-2.5 text-xs sm:text-[13px] flex-1">
                {summary.complianceNotes.map((note, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-2.5 rounded-lg border text-xs leading-relaxed space-y-1',
                      note.type === 'statutory'
                        ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    )}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-[11px] uppercase tracking-wider text-slate-700 font-bold">
                        {note.type === 'statutory' ? '📌 Quy định trong văn bản' : '💡 Gợi ý rà soát (Tham khảo)'}
                      </span>
                      {note.citation && (
                        <button
                          type="button"
                          onClick={() => onNavigateToArticle?.(note.citation?.articleNumber || note.citation?.label || '')}
                          className="text-[10.5px] text-blue-700 hover:underline font-bold"
                        >
                          {note.citation.label} →
                        </button>
                      )}
                    </div>
                    <p className="text-[12px]">{note.content}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* SECTION 5: Căn cứ chính */}
          {summary.primaryProvisions && summary.primaryProvisions.length > 0 && (
            <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm sm:text-base">
                  <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                  <h3>5. Căn cứ chính trong văn bản</h3>
                </div>

                {onOpenToc && (
                  <button
                    type="button"
                    onClick={onOpenToc}
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <ListTree className="w-3.5 h-3.5" />
                    <span>Xem toàn bộ Mục lục</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                {summary.primaryProvisions.map((prov, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onNavigateToArticle?.(prov.articleNumber)}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-left transition-all group cursor-pointer flex items-center justify-between gap-1.5"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-blue-950 group-hover:text-blue-700 block truncate">
                        {prov.articleNumber}
                      </span>
                      <span className="text-[11.5px] text-slate-600 truncate block mt-0.5">
                        {prov.articleTitle.replace(/^Điều\s+\d+[a-z]?[.:\s]*/i, '') || prov.articleTitle}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* ── FOOTER ACTIONS & AI ASSISTANT PROMPT ── */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 text-center sm:text-left">
              <span>Bạn cần làm rõ thêm các quy định cụ thể của văn bản này?</span>
              {onOpenAiChat && (
                <button
                  type="button"
                  onClick={() => onOpenAiChat('Hãy phân tích thêm các câu hỏi thường gặp về văn bản này.')}
                  className="font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <span>Hỏi trợ lý AI</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopy('text')}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-700 shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-2xs transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>In / Xuất PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
