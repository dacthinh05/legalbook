'use client';

import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Columns2,
  Rows,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  X,
  FileText,
  Search,
  BookOpen,
  Sparkles,
  Layers,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Scale,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { askLegalAi } from '@/lib/ai/legal-rag';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';
import {
  compareLegalDocuments,
  buildCrossReferenceMatrix,
  type LegalDocumentDiffResult,
  type LegalCrossReferenceResult,
  type ArticleDiffItem,
} from '@/lib/diff-engine';
import type { LegalDocument } from '@/types';
import { verifyExactAmendmentEligibility } from '@/lib/cross-document-analysis/verifier';
import { DEMO_RELATIONS } from '@/lib/demo-data';

interface LegalDiffViewerProps {
  documentA: LegalDocument;
  documentB: LegalDocument;
  relationType?: string;
  onClose?: () => void;
  onSelectDocument?: (id: string) => void;
  onSwitchToAiAnalysis?: (docA: LegalDocument, docB: LegalDocument) => void;
}

export function LegalDiffViewer({
  documentA,
  documentB,
  relationType,
  onClose,
  onSelectDocument,
  onSwitchToAiAnalysis,
}: LegalDiffViewerProps) {
  // 1. Verify exact amendment eligibility
  const exactEligibility = useMemo(() => {
    return verifyExactAmendmentEligibility(documentA, documentB, DEMO_RELATIONS);
  }, [documentA, documentB]);

  // 2. Determine if this is a guiding relationship (Luật <-> Nghị định/Thông tư)
  const isGuidingPair = useMemo(() => {
    if (relationType === 'huong_dan' || relationType === 'can_cu') return true;
    if (
      relationType === 'sua_doi' ||
      relationType === 'thay_the' ||
      relationType === 'bai_bo_toan_bo' ||
      relationType === 'bai_bo_mot_phan'
    ) {
      return false;
    }

    // Auto-detect based on document types
    const typeA = documentA.document_type;
    const typeB = documentB.document_type;
    return (
      (typeA === 'luat' && (typeB === 'nghi_dinh' || typeB === 'thong_tu')) ||
      (typeB === 'luat' && (typeA === 'nghi_dinh' || typeA === 'thong_tu')) ||
      (typeA === 'nghi_dinh' && typeB === 'thong_tu')
    );
  }, [relationType, documentA, documentB]);

  // Order pair: Law on left, Guiding on right
  const [docLaw, docGuiding] = useMemo(() => {
    if (
      documentA.document_type === 'luat' ||
      (documentA.document_type === 'nghi_dinh' && documentB.document_type === 'thong_tu')
    ) {
      return [documentA, documentB];
    }
    return [documentB, documentA];
  }, [documentA, documentB]);

  // Order amending pair: Original doc on left, Amending doc on right
  const [sourceDoc, amendingDoc] = useMemo(() => {
    if (exactEligibility.sourceDoc && exactEligibility.amendingDoc) {
      return [exactEligibility.sourceDoc, exactEligibility.amendingDoc];
    }
    return [documentA, documentB];
  }, [exactEligibility, documentA, documentB]);

  const [activeTab, setActiveTab] = useState<'matrix' | 'diff' | 'ai_summary'>(
    isGuidingPair ? 'matrix' : exactEligibility.isEligibleForExactDiff ? 'diff' : 'ai_summary'
  );
  const [matrixSearch, setMatrixSearch] = useState('');
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('split');
  const [diffFilterMode, setDiffFilterMode] = useState<'all' | 'modified_only'>('modified_only');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);

  // Compute Cross-Reference Matrix (Guiding pair)
  const matrixResult: LegalCrossReferenceResult = useMemo(() => {
    return buildCrossReferenceMatrix(docLaw, docGuiding);
  }, [docLaw, docGuiding]);

  // Compute Token Diff (Exact Amendment pair)
  const diffResult: LegalDocumentDiffResult = useMemo(() => {
    return compareLegalDocuments(
      { title: sourceDoc.title, html: sourceDoc.html_content || '' },
      { title: amendingDoc.title, html: amendingDoc.html_content || '' }
    );
  }, [sourceDoc, amendingDoc]);

  // Filtered Matrix rows
  const filteredMatrixPairs = useMemo(() => {
    if (!matrixSearch.trim()) return matrixResult.pairs;
    const q = matrixSearch.toLowerCase().trim();
    return matrixResult.pairs.filter(
      (p) =>
        p.lawArticleNumber.toLowerCase().includes(q) ||
        p.lawArticleTitle.toLowerCase().includes(q) ||
        p.guidingArticleNumber.toLowerCase().includes(q) ||
        p.guidingArticleTitle.toLowerCase().includes(q) ||
        p.summaryTag.toLowerCase().includes(q) ||
        p.guidingSnippet.toLowerCase().includes(q)
    );
  }, [matrixResult.pairs, matrixSearch]);

  // Filtered Diff articles
  const filteredDiffArticles = useMemo(() => {
    if (diffFilterMode === 'modified_only') {
      return diffResult.articles.filter((a) => a.status !== 'unchanged');
    }
    return diffResult.articles;
  }, [diffResult.articles, diffFilterMode]);

  // If NOT a guiding pair AND NOT eligible for exact diff, render the GUARD SCREEN
  const isInvalidPairForDiff = !isGuidingPair && !exactEligibility.isEligibleForExactDiff;

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xl text-slate-900 select-text">
      {/* 1. Header Bar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs">
            {isGuidingPair ? (
              <Columns2 className="w-4 h-4" />
            ) : exactEligibility.isEligibleForExactDiff ? (
              <GitCompare className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-950 truncate flex items-center gap-2">
              <span>
                {activeTab === 'matrix'
                  ? 'Bảng Ma trận Đối chiếu Điều khoản'
                  : activeTab === 'diff'
                  ? 'ĐỐI CHIẾU SỬA ĐỔI CHÍNH XÁC'
                  : 'Phân tích Liên văn bản bằng AI'}
              </span>
            </h3>
            <div className="text-[11.5px] text-slate-500 flex items-center gap-1.5 truncate pt-0.5">
              <span className="font-semibold text-blue-900 font-mono">
                {sourceDoc.document_number || 'Văn bản gốc'}
              </span>
              <span className="text-slate-400">↔</span>
              <span className="font-semibold text-purple-900 font-mono">
                {amendingDoc.document_number || 'Văn bản đối chiếu'}
              </span>
            </div>
          </div>
        </div>

        {/* View Mode Switcher & Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
            {isGuidingPair && (
              <button
                type="button"
                onClick={() => setActiveTab('matrix')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1',
                  activeTab === 'matrix'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Đối chiếu ({matrixResult.totalMappedPairs})</span>
              </button>
            )}

            {exactEligibility.isEligibleForExactDiff && (
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1',
                  activeTab === 'diff'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Đối chiếu sửa đổi ({diffResult.modifiedArticlesCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (onSwitchToAiAnalysis) {
                  onClose?.();
                  onSwitchToAiAnalysis(documentA, documentB);
                } else {
                  setActiveTab('ai_summary');
                }
              }}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1',
                activeTab === 'ai_summary'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Phân tích bằng AI</span>
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer ml-1"
              title="Đóng cửa sổ"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Mode Content */}
      {isInvalidPairForDiff && activeTab === 'diff' ? (
        /* ── GUARD SCREEN FOR INVALID NON-AMENDMENT PAIR ── */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5 bg-slate-50/60">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-md">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-base font-bold text-slate-900">
              Không thể tạo diff sửa đổi đáng tin cậy
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Hai văn bản <strong>{documentA.document_number || documentA.title}</strong> và{' '}
              <strong>{documentB.document_number || documentB.title}</strong> không phải hai phiên bản
              trước–sau và không có quan hệ sửa đổi trực tiếp.
            </p>
            <p className="text-[11.5px] text-slate-500 italic">
              Việc diff từ ngữ giữa hai văn bản không tương ứng sẽ tạo kết quả nhiễu và gây hiểu nhầm về mặt
              pháp lý.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (onSwitchToAiAnalysis) {
                  onClose?.();
                  onSwitchToAiAnalysis(documentA, documentB);
                } else {
                  setActiveTab('ai_summary');
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Chuyển sang Phân tích bằng AI</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Đóng cửa sổ
              </button>
            )}
          </div>
        </div>
      ) : activeTab === 'matrix' ? (
        /* ── MODE 1: 2-COLUMN CROSS-REFERENCE MATRIX ── */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
          {/* Subheader Toolbar */}
          <div className="px-4 py-2 bg-white border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                placeholder="Lọc theo điều khoản hoặc từ khóa..."
                className="w-full pl-8 pr-7 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {matrixSearch && (
                <button
                  type="button"
                  onClick={() => setMatrixSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-2 text-[11.5px] text-slate-500 font-medium">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>
                  Đã ánh xạ: <strong>{matrixResult.totalMappedPairs - matrixResult.unmappedLawCount}</strong> điều
                </span>
              </span>
              {matrixResult.unmappedLawCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                  <span>
                    Quy định khung: <strong>{matrixResult.unmappedLawCount}</strong> điều
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* 2-Column Table Headers */}
          <div className="grid grid-cols-1 md:grid-cols-2 bg-slate-100/90 border-b border-slate-200 text-xs font-bold text-slate-700 shrink-0 divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-blue-900">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Quy định khung ({docLaw.document_number || 'Luật'})</span>
              </span>
              <span className="text-[10.5px] font-normal text-slate-500">Căn cứ pháp lý</span>
            </div>
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-purple-900">
                <Layers className="w-3.5 h-3.5" />
                <span>Quy định chi tiết ({docGuiding.document_number || 'Nghị định / Thông tư'})</span>
              </span>
              <span className="text-[10.5px] font-normal text-slate-500">Hướng dẫn thi hành</span>
            </div>
          </div>

          {/* Matrix Rows List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-200 bg-white">
            {filteredMatrixPairs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                <FileText className="w-6 h-6 mx-auto text-slate-300" />
                <p>Không tìm thấy điều khoản khớp với từ khóa tìm kiếm.</p>
              </div>
            ) : (
              filteredMatrixPairs.map((pair, idx) => {
                const isMapped = pair.guidingArticleNumber !== '—';
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 hover:bg-blue-50/20 transition-colors"
                  >
                    {/* Left Column: Law Article */}
                    <div className="p-3.5 sm:p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80">
                          {pair.lawArticleNumber}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">Luật gốc</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {pair.lawArticleTitle}
                      </h4>
                      <p className="text-[11.5px] text-slate-600 leading-relaxed line-clamp-4">
                        {pair.lawSnippet}
                      </p>
                    </div>

                    {/* Right Column: Guiding Article */}
                    <div className={cn('p-3.5 sm:p-4 space-y-1.5', !isMapped && 'bg-slate-50/50')}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={cn(
                              'font-mono text-xs font-bold px-2 py-0.5 rounded border',
                              isMapped
                                ? 'text-purple-900 bg-purple-50 border-purple-200/80'
                                : 'text-slate-500 bg-slate-100 border-slate-200'
                            )}
                          >
                            {pair.guidingArticleNumber}
                          </span>
                          {isMapped && (
                            <span
                              className={cn(
                                'text-[10.5px] px-1.5 py-0.2 rounded font-semibold',
                                pair.citationType === 'citation'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-800 border border-blue-200'
                              )}
                            >
                              {pair.citationType === 'citation' ? 'Viện dẫn chính thức' : 'Khớp chủ đề'}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-medium text-slate-400">Hướng dẫn</span>
                      </div>
                      <h4
                        className={cn(
                          'text-xs font-bold leading-snug',
                          isMapped ? 'text-slate-900' : 'text-slate-500 italic'
                        )}
                      >
                        {pair.guidingArticleTitle}
                      </h4>
                      <p
                        className={cn(
                          'text-[11.5px] leading-relaxed',
                          isMapped ? 'text-slate-700 line-clamp-4' : 'text-slate-400 italic'
                        )}
                      >
                        {pair.guidingSnippet}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : activeTab === 'diff' ? (
        /* ── MODE 2: EXACT AMENDMENT DIFF ── */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
          {/* Legal Basis Banner */}
          {exactEligibility.legalBasis && (
            <div className="px-4 py-2 bg-blue-50/80 border-b border-blue-200 flex items-center justify-between gap-3 text-xs text-blue-950">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Căn cứ sửa đổi:</strong> {exactEligibility.legalBasis}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                Quan hệ đã xác minh
              </span>
            </div>
          )}

          {/* Diff Stats Banner */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-700">
                Tổng số: <strong>{diffResult.totalArticlesCount}</strong> điều
              </span>
              <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>
                  Sửa đổi / Bổ sung: <strong>{diffResult.modifiedArticlesCount}</strong>
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                <PlusCircle className="w-3 h-3 text-emerald-600" />
                <span>
                  Thêm mới: <strong>{diffResult.addedArticlesCount}</strong> (+{diffResult.totalWordsAdded} từ)
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-medium">
                <MinusCircle className="w-3 h-3 text-rose-600" />
                <span>
                  Bãi bỏ: <strong>{diffResult.deletedArticlesCount}</strong> (-{diffResult.totalWordsDeleted} từ)
                </span>
              </span>
            </div>

            {/* Filter and View toggles */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setDiffFilterMode('modified_only')}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                    diffFilterMode === 'modified_only'
                      ? 'bg-white text-blue-900 font-semibold shadow-2xs'
                      : 'text-slate-600'
                  )}
                >
                  Chỉ xem điều khoản sửa đổi (
                  {diffResult.modifiedArticlesCount +
                    diffResult.addedArticlesCount +
                    diffResult.deletedArticlesCount}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setDiffFilterMode('all')}
                  className={cn(
                    'px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer',
                    diffFilterMode === 'all'
                      ? 'bg-white text-blue-900 font-semibold shadow-2xs'
                      : 'text-slate-600'
                  )}
                >
                  Tất cả ({diffResult.totalArticlesCount})
                </button>
              </div>

              <div className="flex items-center bg-slate-100 p-0.5 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('unified')}
                  className={cn(
                    'p-1.5 rounded transition-colors cursor-pointer',
                    viewMode === 'unified' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600'
                  )}
                  title="Gộp dòng"
                >
                  <Rows className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={cn(
                    'p-1.5 rounded transition-colors cursor-pointer',
                    viewMode === 'split' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600'
                  )}
                  title="Hai cột song song"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Articles Diff List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredDiffArticles.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-1 bg-white rounded-lg border border-slate-200">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="font-semibold text-slate-700">Không có điều khoản nào bị sửa đổi</p>
                <p className="text-slate-400 text-[11px]">
                  Các điều khoản đối chiếu có nội dung tương đồng.
                </p>
              </div>
            ) : (
              filteredDiffArticles.map((art) => (
                <ArticleDiffCard
                  key={art.articleId}
                  article={art}
                  viewMode={viewMode}
                  isSelected={selectedArticleId === art.articleId}
                  onSelect={() => setSelectedArticleId(art.articleId)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        /* ── MODE 3: AI COMPARISON SUMMARY & INTERACTIVE Q&A ── */
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/60 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
            {/* AI Executive Brief Card */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border border-blue-200/80 rounded-xl shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-600 text-white rounded-md shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Bản tóm tắt phân tích & Điểm khác biệt cốt lõi
                  </h4>
                </div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[11px]">
                  Tự động phân tích
                </span>
              </div>

              <div className="space-y-3 leading-relaxed text-slate-700">
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 shadow-2xs">
                  <span className="font-bold text-blue-900 block text-xs">
                    1. Bản chất quan hệ & Thứ bậc áp dụng
                  </span>
                  <p className="text-slate-600 text-[11.5px]">
                    {isGuidingPair
                      ? `${docGuiding.document_number || 'Nghị định hướng dẫn'} quy định chi tiết và hướng dẫn các biện pháp thi hành các điều khoản nguyên tắc, khung chính sách tại ${docLaw.document_number || 'Luật gốc'}.`
                      : exactEligibility.isEligibleForExactDiff
                      ? `${amendingDoc.document_number || 'Văn bản sửa đổi'} sửa đổi, bổ sung và thay thế một số điều khoản trọng yếu của ${sourceDoc.document_number || 'Văn bản gốc'}.`
                      : `Hai văn bản có mối liên hệ chuyên môn theo lĩnh vực quản lý. Doanh nghiệp cần xác định văn bản có hiệu lực cao hơn hoặc văn bản chuyên ngành điều chỉnh trực tiếp.`}
                  </p>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 shadow-2xs">
                  <span className="font-bold text-emerald-900 block text-xs">
                    2. Các nội dung hướng dẫn / thay đổi trọng yếu
                  </span>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11.5px]">
                    <li>
                      Quy định chi tiết ngưỡng điều kiện áp dụng, đối tượng thực hiện và hồ sơ bắt buộc.
                    </li>
                    <li>Cụ thể hóa hồ sơ, biểu mẫu và phương thức kê khai, khấu trừ chứng từ điện tử.</li>
                    <li>
                      Làm rõ trách nhiệm phối hợp của cơ quan quản lý và quyền lợi của người nộp thuế/doanh nghiệp.
                    </li>
                  </ul>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1 shadow-2xs">
                  <span className="font-bold text-amber-900 block text-xs">
                    3. Hành động cần thực hiện cho Kế toán & Doanh nghiệp
                  </span>
                  <p className="text-slate-600 text-[11.5px]">
                    Rà soát quy trình chứng từ, cập nhật hệ thống phần mềm kế toán/ERP và đối chiếu thời điểm hiệu
                    lực thi hành để áp dụng chính sách mới đúng hạn.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Q&A Thread */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                Hỏi đáp AI trực tiếp về 2 văn bản này
              </h4>

              {aiChatHistory.length > 0 && (
                <div className="space-y-3 pt-1">
                  {aiChatHistory.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className={cn(
                        'p-3 rounded-lg text-xs leading-relaxed',
                        item.sender === 'user'
                          ? 'bg-blue-600 text-white ml-6 font-medium'
                          : 'bg-slate-50 border border-slate-200 text-slate-800 mr-6'
                      )}
                    >
                      {item.sender === 'user' ? (
                        item.text
                      ) : (
                        <MarkdownRenderer content={item.text} className="text-xs text-slate-800" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {aiLoading && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  <span>AI đang phân tích và đối chiếu 2 văn bản...</span>
                </div>
              )}

              {/* Input Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!aiQuestion.trim() || aiLoading) return;
                  const q = aiQuestion.trim();
                  setAiQuestion('');
                  setAiChatHistory((prev) => [...prev, { sender: 'user', text: q }]);
                  setAiLoading(true);

                  try {
                    const res = await askLegalAi({
                      question: q,
                      docA: documentA,
                      docB: documentB,
                      mode: 'compare',
                    });
                    setAiChatHistory((prev) => [...prev, { sender: 'ai', text: res.answer }]);
                  } catch {
                    setAiChatHistory((prev) => [
                      ...prev,
                      { sender: 'ai', text: 'Có lỗi xảy ra khi truy vấn AI. Vui lòng thử lại.' },
                    ]);
                  } finally {
                    setAiLoading(false);
                  }
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder={`Đặt câu hỏi so sánh giữa ${documentA.document_number || 'văn bản 1'} và ${documentB.document_number || 'văn bản 2'}...`}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!aiQuestion.trim() || aiLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Hỏi AI
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArticleDiffCard({
  article,
  viewMode,
  isSelected,
  onSelect,
}: {
  article: ArticleDiffItem;
  viewMode: 'unified' | 'split';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isModified = article.status === 'modified';
  const isAdded = article.status === 'added';
  const isDeleted = article.status === 'deleted';

  // Status badge label and styling
  const statusLabel =
    article.status === 'modified'
      ? 'Sửa đổi, bổ sung'
      : article.status === 'added'
      ? 'Thêm mới'
      : article.status === 'deleted'
      ? 'Bãi bỏ'
      : 'Giữ nguyên';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border bg-white overflow-hidden transition-all shadow-2xs',
        isModified && 'border-amber-200',
        isAdded && 'border-emerald-200',
        isDeleted && 'border-rose-200',
        !isModified && !isAdded && !isDeleted && 'border-slate-200',
        isSelected && 'ring-2 ring-blue-500'
      )}
    >
      {/* Article Header */}
      <div
        className={cn(
          'px-4 py-2 border-b flex items-center justify-between text-xs font-semibold',
          isModified && 'bg-amber-50/80 border-amber-200 text-amber-950',
          isAdded && 'bg-emerald-50/80 border-emerald-200 text-emerald-950',
          isDeleted && 'bg-rose-50/80 border-rose-200 text-rose-950',
          !isModified && !isAdded && !isDeleted && 'bg-slate-50 border-slate-200 text-slate-800'
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold">{article.articleLabel}</span>
          <span className="truncate max-w-md font-medium text-slate-700">{article.articleTitleA || article.articleTitleB}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-[10.5px] font-bold',
              isModified && 'bg-amber-100 text-amber-900 border border-amber-300',
              isAdded && 'bg-emerald-100 text-emerald-900 border border-emerald-300',
              isDeleted && 'bg-rose-100 text-rose-900 border border-rose-300',
              !isModified && !isAdded && !isDeleted && 'bg-slate-200 text-slate-700'
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Diff Content */}
      <div className="p-4 text-xs leading-relaxed">
        {viewMode === 'unified' ? (
          <div className="space-y-1">
            <div className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap">
              {article.tokens.map((tok, idx) => (
                <span
                  key={idx}
                  className={cn(
                    tok.op === 'added' && 'bg-emerald-100 text-emerald-900 px-0.5 rounded font-semibold',
                    tok.op === 'deleted' && 'bg-rose-100 text-rose-900 line-through px-0.5 rounded',
                    tok.op === 'unchanged' && 'text-slate-800'
                  )}
                >
                  {tok.text}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Split View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Left: Original version */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Bản trước sửa đổi (Văn bản gốc)
              </span>
              <div className="font-mono text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                {article.tokens
                  .filter((t) => t.op !== 'added')
                  .map((tok, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        tok.op === 'deleted' && 'bg-rose-100 text-rose-900 line-through px-0.5 rounded'
                      )}
                    >
                      {tok.text}
                    </span>
                  ))}
              </div>
            </div>

            {/* Right: New/Amending version */}
            <div className="space-y-1 md:pl-3">
              <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Bản sau sửa đổi (Văn bản sửa đổi)
              </span>
              <div className="font-mono text-[11.5px] leading-relaxed text-slate-800 whitespace-pre-wrap">
                {article.tokens
                  .filter((t) => t.op !== 'deleted')
                  .map((tok, idx) => (
                    <span
                      key={idx}
                      className={cn(
                        tok.op === 'added' && 'bg-emerald-100 text-emerald-900 px-0.5 rounded font-semibold'
                      )}
                    >
                      {tok.text}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
