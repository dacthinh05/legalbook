'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Plus,
  ArrowRight,
  BookOpen,
  Scale,
  Building2,
  FileWarning,
  Layers,
  Copy,
  Download,
  RotateCcw,
  Check,
  HelpCircle,
  ExternalLink,
  Loader2,
  GitCompare,
  Sliders,
  Send,
  History,
  Bookmark,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { LegalDocument, DocumentRelation } from '@/types';
import { DEMO_DOCUMENTS, DEMO_RELATIONS } from '@/lib/demo-data';
import type {
  AnalysisObjective,
  CrossDocAnalysisResult,
  DocumentSuggestion,
  StoredAnalysisSession,
} from '@/lib/cross-document-analysis/types';
import { getRelatedDocumentSuggestions } from '@/lib/cross-document-analysis/suggestion-engine';
import {
  analyzeMultipleDocuments,
  analyzeMultipleDocumentsLocal,
  computeDocumentContentHash,
} from '@/lib/cross-document-analysis/analysis-engine';
import {
  useAnalysisSessions,
  checkIsSessionStale,
  exportAnalysisReport,
} from '@/lib/cross-document-analysis/persistence';
import { verifyExactAmendmentEligibility } from '@/lib/cross-document-analysis/verifier';
import { MarkdownRenderer } from '@/components/common/MarkdownRenderer';

interface CrossDocAnalysisModalProps {
  primaryDocument: LegalDocument;
  initialSelectedDocuments?: LegalDocument[];
  isOpen: boolean;
  onClose: () => void;
  onSelectDocument?: (id: string, targetNodeId?: string) => void;
  onOpenExactDiff?: (docA: LegalDocument, docB: LegalDocument) => void;
}

const OBJECTIVE_OPTIONS: Array<{
  id: AnalysisObjective;
  label: string;
  description: string;
  icon: typeof Sparkles;
}> = [
  {
    id: 'overview',
    label: 'Tổng quan điểm giống và khác',
    description: 'Đối chiếu các tiêu chí then chốt, sự tương đồng và điểm khác biệt cơ bản giữa các văn bản.',
    icon: Layers,
  },
  {
    id: 'applicable_rule',
    label: 'Văn bản nào đang áp dụng',
    description: 'Phân tích thứ bậc hiệu lực pháp lý, nguyên tắc ưu tiên áp dụng giữa văn bản chung và chuyên ngành.',
    icon: Scale,
  },
  {
    id: 'amendment_replacement',
    label: 'Nội dung sửa đổi hoặc bị thay thế',
    description: 'Rà soát các quy định được kế thừa, sửa đổi, bổ sung hoặc bãi bỏ qua các thời kỳ.',
    icon: RotateCcw,
  },
  {
    id: 'scope_conditions',
    label: 'Điều kiện, đối tượng và phạm vi áp dụng',
    description: 'Làm rõ đối tượng chịu tác động, điều kiện hưởng chính sách và phạm vi điều chỉnh.',
    icon: Building2,
  },
  {
    id: 'accounting_tax_impact',
    label: 'Tác động đến kế toán, thuế hoặc kiểm toán',
    description: 'Đánh giá tác động đến hạch toán chứng từ, chi phí được trừ, rủi ro thanh tra và quyết toán.',
    icon: FileText,
  },
  {
    id: 'conflicts_crosscheck',
    label: 'Mâu thuẫn và điểm cần đối chiếu',
    description: 'Phát hiện các điểm chưa đồng nhất, khoảng trống quy định và khuyến nghị đối chiếu bổ sung.',
    icon: AlertTriangle,
  },
  {
    id: 'custom_question',
    label: 'Đặt câu hỏi cụ thể',
    description: 'Tập trung trả lời trực diện câu hỏi nghiệp vụ thực tế với căn cứ dẫn chiếu Điều/Khoản.',
    icon: HelpCircle,
  },
];

export function CrossDocAnalysisModal({
  primaryDocument,
  initialSelectedDocuments = [],
  isOpen,
  onClose,
  onSelectDocument,
  onOpenExactDiff,
}: CrossDocAnalysisModalProps) {
  // ── State ───────────────────────────────────────────────────────────────────
  const [selectedDocs, setSelectedDocs] = useState<LegalDocument[]>(() => {
    return initialSelectedDocuments.length > 0
      ? initialSelectedDocuments.filter((d) => d.id !== primaryDocument.id)
      : [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [objective, setObjective] = useState<AnalysisObjective>('overview');
  const [customQuestion, setCustomQuestion] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'citations' | 'qa'>('overview');
  const [analysisResult, setAnalysisResult] = useState<CrossDocAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSessionView, setActiveSessionView] = useState<'analysis' | 'history'>('analysis');

  // Follow-up Q&A state
  const [qaMessages, setQaMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [qaInput, setQaInput] = useState('');
  const [qaLoading, setQaLoading] = useState(false);

  // Persistence Hook
  const { savedSessionsForDoc, saveSession, deleteSession, exportReport } =
    useAnalysisSessions(primaryDocument.id);

  // Reset when primary document changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    setSelectedDocs(
      initialSelectedDocuments && initialSelectedDocuments.length > 0
        ? initialSelectedDocuments.filter((d) => d.id !== primaryDocument.id)
        : []
    );
    setAnalysisResult(null);
    setQaMessages([]);
  }, [primaryDocument.id, isOpen]);
  // Suggestions based on 8-level signal priority
  const suggestions: DocumentSuggestion[] = useMemo(() => {
    return getRelatedDocumentSuggestions(primaryDocument, DEMO_DOCUMENTS as unknown as LegalDocument[], DEMO_RELATIONS);
  }, [primaryDocument]);

  // Filtered documents from search
  const filteredSearchDocs = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const alreadySelectedIds = new Set([primaryDocument.id, ...selectedDocs.map((d) => d.id)]);

    return (DEMO_DOCUMENTS as unknown as LegalDocument[])
      .filter((d) => !alreadySelectedIds.has(d.id))
      .filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.document_number?.toLowerCase().includes(q) ||
          d.issuing_body?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [searchQuery, primaryDocument.id, selectedDocs]);

  // Check if current 2-doc selection is eligible for exact diff
  const exactDiffEligibility = useMemo(() => {
    if (selectedDocs.length === 1) {
      return verifyExactAmendmentEligibility(primaryDocument, selectedDocs[0], DEMO_RELATIONS);
    }
    return null;
  }, [primaryDocument, selectedDocs]);

  // Stale detection
  const isStale = useMemo(() => {
    if (!analysisResult) return false;
    const allCurrent = [primaryDocument, ...selectedDocs];
    return checkIsSessionStale(analysisResult, allCurrent);
  }, [analysisResult, primaryDocument, selectedDocs]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleToggleDocument = (doc: LegalDocument) => {
    if (selectedDocs.some((d) => d.id === doc.id)) {
      setSelectedDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } else {
      if (selectedDocs.length >= 4) {
        alert('Tối đa chọn 5 văn bản (1 văn bản chính + 4 văn bản liên quan) để đảm bảo chất lượng phân tích.');
        return;
      }
      setSelectedDocs((prev) => [...prev, doc]);
    }
  };

  const handleRunAnalysis = async () => {
    if (selectedDocs.length === 0) {
      alert('Vui lòng chọn ít nhất 1 văn bản liên quan để tiến hành phân tích.');
      return;
    }
    setIsAnalyzing(true);
    setActiveSessionView('analysis');

    try {
      const res = await analyzeMultipleDocuments({
        primaryDoc: primaryDocument,
        selectedDocs,
        objective,
        customQuestion: objective === 'custom_question' ? customQuestion : undefined,
      });
      setAnalysisResult(res);
      setActiveTab('overview');
      // Auto save session
      saveSession(res);
    } catch {
      // Fallback
      const fallback = analyzeMultipleDocumentsLocal({
        primaryDoc: primaryDocument,
        selectedDocs,
        objective,
        customQuestion: objective === 'custom_question' ? customQuestion : undefined,
      });
      setAnalysisResult(fallback);
      saveSession(fallback);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;
    const md = exportReport(analysisResult, 'markdown');
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportDownload = (format: 'markdown' | 'text' | 'json') => {
    if (!analysisResult) return;
    const content = exportReport(analysisResult, format);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Phan-tich-lien-van-ban-${analysisResult.id}.${format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleQaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaInput.trim() || qaLoading || !analysisResult) return;
    const q = qaInput.trim();
    setQaInput('');
    setQaMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setQaLoading(true);

    try {
      const res = await analyzeMultipleDocuments({
        primaryDoc: primaryDocument,
        selectedDocs,
        objective: 'custom_question',
        customQuestion: q,
      });
      setQaMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.executiveConclusion || 'Đã phân tích dựa trên các văn bản đã chọn.',
        },
      ]);
    } catch {
      setQaMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Không thể kết nối đến máy chủ AI. Vui lòng thử lại sau giây lát.',
        },
      ]);
    } finally {
      setQaLoading(false);
    }
  };

  if (!isOpen) return null;

  const allSelectedDocuments = [primaryDocument, ...selectedDocs];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-6xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-900 select-text">
        {/* ── 1. Top Header Bar ── */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  PHÂN TÍCH LIÊN VĂN BẢN
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  AI Legal Engine 2.5
                </span>
                {savedSessionsForDoc.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveSessionView((v) => (v === 'history' ? 'analysis' : 'history'))}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer',
                      activeSessionView === 'history'
                        ? 'bg-purple-100 text-purple-900 border-purple-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    <History className="w-3 h-3" />
                    <span>Lịch sử ({savedSessionsForDoc.length})</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 pt-0.5">
                <span className="font-medium text-slate-700">Văn bản chính:</span>
                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  {primaryDocument.document_number || 'Văn bản gốc'}
                </span>
                <span className="text-slate-400 truncate max-w-md hidden sm:inline">
                  — {primaryDocument.title}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Switch to Exact Diff if eligible */}
            {exactDiffEligibility?.isEligibleForExactDiff && onOpenExactDiff && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExactDiff(primaryDocument, selectedDocs[0]);
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Hai văn bản có quan hệ sửa đổi chính thức đã xác minh. Mở đối chiếu điều khoản."
              >
                <GitCompare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Mở Đối chiếu sửa đổi ({exactDiffEligibility.relationType})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
              title="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. Modal Body Grid ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Document Selection & Configuration (4 cols) */}
          <div className="lg:col-span-4 flex flex-col bg-slate-50/70 overflow-hidden h-full">
            <div className="p-4 border-b border-slate-200 bg-white space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Chọn văn bản để phân tích</span>
                </span>
                <span
                  className={cn(
                    'text-[11px] font-bold px-2 py-0.5 rounded-full border',
                    allSelectedDocuments.length > 5
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  )}
                >
                  Đã chọn {allSelectedDocuments.length}/5 văn bản
                </span>
              </div>

              {/* Selected Document Chips */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {/* Primary Doc Chip */}
                <div className="p-2 bg-blue-50/90 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-bold">
                        Chính
                      </span>
                      <span className="font-mono font-bold text-blue-950 truncate">
                        {primaryDocument.document_number || 'Văn bản gốc'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {primaryDocument.title}
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-700 shrink-0">Cố định</span>
                </div>

                {/* Selected Related Docs Chips */}
                {selectedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 truncate">
                          {doc.document_number || 'Văn bản'}
                        </span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                          {doc.document_type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate mt-0.5">{doc.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleDocument(doc)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Bỏ văn bản này"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm thêm theo số hiệu, tên, cơ quan..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions or Search Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {searchQuery.trim() ? (
                /* Search Results */
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Kết quả tìm kiếm ({filteredSearchDocs.length})
                  </span>
                  {filteredSearchDocs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Không tìm thấy văn bản phù hợp.
                    </div>
                  ) : (
                    filteredSearchDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => handleToggleDocument(doc)}
                        className="w-full text-left p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200 rounded-lg transition-all text-xs space-y-1 cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-900 group-hover:text-blue-700">
                            {doc.document_number || 'Văn bản'}
                          </span>
                          <span className="p-1 rounded bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Plus className="w-3 h-3" />
                          </span>
                        </div>
                        <p className="text-[11.5px] text-slate-700 font-medium line-clamp-2">
                          {doc.title}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              ) : (
                /* AI Prioritized Suggestions */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Gợi ý liên quan theo tín hiệu</span>
                    </span>
                    <span className="text-[10.5px] text-slate-400 font-medium">Ưu tiên từ 1-8</span>
                  </div>

                  {suggestions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      Chưa có văn bản gợi ý tự động. Hãy dùng ô tìm kiếm bên trên.
                    </div>
                  ) : (
                    suggestions.map((sug, idx) => {
                      const isSelected = selectedDocs.some((d) => d.id === sug.document.id);
                      return (
                        <div
                          key={sug.document.id}
                          className={cn(
                            'p-3 rounded-xl border transition-all text-xs space-y-2',
                            isSelected
                              ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono font-bold text-slate-950 truncate">
                                {sug.document.document_number || 'Văn bản'}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.2 rounded font-semibold',
                                  sug.signalCategory === 'verified_relation'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : sug.signalCategory === 'rule_detected'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-purple-50 text-purple-800 border border-purple-200'
                                )}
                              >
                                {sug.signalCategory === 'verified_relation'
                                  ? 'Đã xác minh'
                                  : sug.signalCategory === 'rule_detected'
                                  ? 'Rule Engine'
                                  : 'AI Gợi ý'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleToggleDocument(sug.document)}
                              className={cn(
                                'px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0',
                                isSelected
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
                              )}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Đã chọn</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  <span>Thêm</span>
                                </>
                              )}
                            </button>
                          </div>

                          <p className="text-[11.5px] font-medium text-slate-800 line-clamp-2">
                            {sug.document.title}
                          </p>

                          {/* Reason tag */}
                          <div className="text-[10.5px] text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100 flex items-center gap-1">
                            <span className="font-semibold text-slate-700">Lý do:</span>
                            <span className="text-slate-600 truncate">{sug.reason}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Objective Selector & Action Button */}
            <div className="p-4 border-t border-slate-200 bg-white space-y-3 shrink-0">
              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Mục tiêu phân tích:
                </label>
                <select
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as AnalysisObjective)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {OBJECTIVE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom question input if selected */}
              {objective === 'custom_question' && (
                <div className="space-y-1 animate-in fade-in duration-100">
                  <label className="text-[11px] font-bold text-blue-900 block">
                    Câu hỏi nghiệp vụ cụ thể:
                  </label>
                  <textarea
                    rows={2}
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ví dụ: Doanh nghiệp thanh toán hóa đơn trên 5 triệu bằng tiền mặt thì chi phí có được trừ không?"
                    className="w-full p-2 bg-slate-50 border border-blue-200 rounded-lg text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Run button */}
              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || selectedDocs.length === 0}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs shadow-md disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>AI đang phân tích & đối chiếu quy phạm...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Phân tích bằng AI ({allSelectedDocuments.length} văn bản)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Structured Results (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-white overflow-hidden h-full">
            {activeSessionView === 'history' ? (
              /* History Sessions View */
              <div className="flex-1 flex flex-col min-h-0 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-purple-600" />
                    <span>Các phiên phân tích đã lưu ({savedSessionsForDoc.length})</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveSessionView('analysis')}
                    className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Quay lại phiên phân tích hiện tại
                  </button>
                </div>

                <div className="space-y-3">
                  {savedSessionsForDoc.map((sess) => (
                    <div
                      key={sess.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900">{sess.title}</h4>
                        <span className="text-[11px] text-slate-400">
                          {new Date(sess.savedAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 line-clamp-2">
                        {sess.result.executiveConclusion}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10.5px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                          Mục tiêu: {sess.objective}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAnalysisResult(sess.result);
                              setActiveSessionView('analysis');
                            }}
                            className="px-2.5 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                          >
                            Mở phiên này
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSession(sess.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa phiên"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isAnalyzing ? (
              /* Analyzing Loading Screen */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl animate-pulse">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 p-1 bg-amber-400 rounded-full">
                    <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                  </div>
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h3 className="text-sm font-bold text-slate-900">
                    Đang phân tích và đối chiếu liên văn bản...
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Hệ thống đang trích xuất Chương/Điều/Khoản, phân loại vai trò, đối chiếu điều kiện áp
                    dụng và kiểm chứng nguồn dẫn chiếu.
                  </p>
                </div>
              </div>
            ) : !analysisResult ? (
              /* Empty Ready State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Layers className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-sm font-bold text-slate-900">Sẵn sàng phân tích liên văn bản</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Chọn thêm các văn bản liên quan từ cột bên trái và bấm{' '}
                    <strong>&quot;Phân tích bằng AI&quot;</strong> để khởi chạy đối chiếu đa văn bản có cấu trúc.
                  </p>
                </div>
              </div>
            ) : (
              /* Structured Result Display */
              <div className="flex-1 flex flex-col min-h-0">
                {/* Result Subheader Toolbar */}
                <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
                  {/* Tabs */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('overview')}
                      className={cn(
                        'px-3 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1.5',
                        activeTab === 'overview'
                          ? 'bg-white text-blue-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Tổng quan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('matrix')}
                      className={cn(
                        'px-3 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1.5',
                        activeTab === 'matrix'
                          ? 'bg-white text-blue-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Theo chủ đề ({analysisResult.comparisonMatrix.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('citations')}
                      className={cn(
                        'px-3 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1.5',
                        activeTab === 'citations'
                          ? 'bg-white text-blue-900 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dẫn chiếu ({analysisResult.citations.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('qa')}
                      className={cn(
                        'px-3 py-1 rounded-md text-[11.5px] transition-all cursor-pointer flex items-center gap-1.5',
                        activeTab === 'qa'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Hỏi đáp</span>
                    </button>
                  </div>

                  {/* Actions: Copy & Export */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyReport}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11.5px] font-semibold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Sao chép toàn bộ kết quả phân tích dạng Markdown"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportDownload('markdown')}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md text-[11.5px] font-semibold text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Tải tệp báo cáo .md"
                    >
                      <Download className="w-3 h-3" />
                      <span>Xuất Markdown</span>
                    </button>
                  </div>
                </div>

                {/* Stale Warning Banner if document changed */}
                {isStale && (
                  <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        <strong>Cảnh báo:</strong> Kết quả này được tạo từ phiên bản nội dung cũ của một
                        trong các văn bản nguồn.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunAnalysis}
                      className="px-2.5 py-1 bg-amber-600 text-white rounded font-semibold hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
                    >
                      Chạy lại phân tích
                    </button>
                  </div>
                )}

                {/* Tab Content Panels */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-100">
                      {/* Section A: KẾT LUẬN NGẮN */}
                      <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/40 border border-blue-200 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                          <span className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            <span>A. KẾT LUẬN NGẮN</span>
                          </span>
                          <span className="text-[10.5px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                            {analysisResult.model}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          {analysisResult.executiveConclusion}
                        </p>
                      </div>

                      {/* Section B: VAI TRÒ CỦA TỪNG VĂN BẢN */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          <span>B. VAI TRÒ CỦA TỪNG VĂN BẢN TRONG HỆ THỐNG</span>
                        </span>

                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                                <th className="p-3 w-1/4">Văn bản</th>
                                <th className="p-3 w-1/3">Vai trò pháp lý</th>
                                <th className="p-3">Phạm vi áp dụng</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {analysisResult.documentRoles.map((role, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="p-3 align-top">
                                    <span className="font-mono font-bold text-blue-900 block">
                                      {role.documentNumber}
                                    </span>
                                    <span className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                      {role.title}
                                    </span>
                                  </td>
                                  <td className="p-3 align-top font-medium text-slate-800">
                                    {role.role}
                                  </td>
                                  <td className="p-3 align-top text-slate-600">{role.scope}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Section D: TÁC ĐỘNG THỰC TẾ */}
                      <div className="space-y-3">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          <span>D. TÁC ĐỘNG THỰC TẾ & KHUYẾN NGHỊ THI HÀNH</span>
                        </span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {/* Card 1: Điều kiện & Đối tượng */}
                          <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                            <span className="text-xs font-bold text-emerald-950 block">
                              ✅ Điều kiện phải đáp ứng:
                            </span>
                            <ul className="list-disc pl-4 space-y-1 text-[11.5px] text-emerald-900/90 leading-relaxed">
                              {analysisResult.practicalImpact.conditionsToMeet.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Card 2: Hồ sơ & Chứng từ */}
                          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
                            <span className="text-xs font-bold text-blue-950 block">
                              📁 Hồ sơ chứng từ cần lưu trữ:
                            </span>
                            <ul className="list-disc pl-4 space-y-1 text-[11.5px] text-blue-900/90 leading-relaxed">
                              {analysisResult.practicalImpact.requiredDossier.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Card 3: Rủi ro pháp lý */}
                          <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2 md:col-span-2">
                            <span className="text-xs font-bold text-rose-950 block">
                              ⚠️ Rủi ro nếu áp dụng sai hoặc thiếu chứng từ:
                            </span>
                            <ul className="list-disc pl-4 space-y-1 text-[11.5px] text-rose-900/90 leading-relaxed">
                              {analysisResult.practicalImpact.complianceRisks.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>

                      {/* Section E: ĐIỂM CHƯA CHẮC CHẮN & CẢNH BÁO */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span>E. ĐIỂM CHƯA CHẮC CHẮN & LƯU Ý PHÁP LÝ</span>
                        </span>

                        <div className="space-y-2">
                          {analysisResult.uncertaintiesAndWarnings.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-bold text-amber-950">{item.title}:</span>{' '}
                                <span className="text-amber-900">{item.description}</span>
                                {item.suggestedAction && (
                                  <p className="text-[11px] text-amber-800 font-medium italic pt-0.5">
                                    Khuyến nghị: {item.suggestedAction}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'matrix' && (
                    /* Section C: ĐIỂM GIỐNG VÀ KHÁC MATRIX */
                    <div className="space-y-4 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>C. BẢNG ĐỐI CHIẾU ĐIỂM GIỐNG & KHÁC THEO CHỦ ĐỀ</span>
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {analysisResult.comparisonMatrix.length} tiêu chí phân tích
                        </span>
                      </div>

                      <div className="space-y-3.5">
                        {analysisResult.comparisonMatrix.map((row, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-slate-50/60 border border-slate-200 rounded-xl space-y-3 shadow-2xs hover:border-slate-300 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-bold text-slate-900">{row.topic}</h5>
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                  row.confidence === 'fact'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                )}
                              >
                                {row.confidence === 'fact' ? 'Căn cứ quy phạm' : 'Nhận định suy luận'}
                              </span>
                            </div>

                            {/* Doc Column values */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                              {analysisResult.selectedDocuments.map((doc) => {
                                const val = row.docValues[doc.id] || 'Không đề cập trực tiếp.';
                                return (
                                  <div
                                    key={doc.id}
                                    className="p-3 bg-white border border-slate-200 rounded-lg space-y-1"
                                  >
                                    <span className="font-mono text-[11px] font-bold text-blue-900 block">
                                      {doc.document_number || doc.title}
                                    </span>
                                    <p className="text-[11.5px] text-slate-700 leading-relaxed">{val}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Remarks */}
                            <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-lg text-xs text-blue-950 flex items-start gap-2">
                              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <p className="text-[11.5px] leading-relaxed">
                                <strong>Nhận xét:</strong> {row.remarks}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'citations' && (
                    /* Section F: NGUỒN DẪN CHIẾU */
                    <div className="space-y-4 animate-in fade-in duration-100">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>F. NGUỒN DẪN CHIẾU & LIÊN KẾT ĐẾN READER</span>
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {analysisResult.citations.length} căn cứ quy phạm
                        </span>
                      </div>

                      <div className="space-y-3">
                        {analysisResult.citations.map((cit, idx) => (
                          <div
                            key={cit.id || idx}
                            className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-blue-300 transition-colors shadow-2xs group"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {cit.documentNumber}
                                </span>
                                {cit.articleNumber && (
                                  <span className="text-xs font-bold text-slate-800">
                                    · {cit.articleNumber}
                                  </span>
                                )}
                              </div>

                              {onSelectDocument && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onSelectDocument(cit.documentId, cit.targetNodeId);
                                  }}
                                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-md text-[11px] font-semibold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Mở đúng Điều trong Reader</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <blockquote className="p-2.5 bg-slate-50 border-l-2 border-blue-500 rounded text-xs text-slate-700 italic leading-relaxed">
                              &quot;{cit.snippet}&quot;
                            </blockquote>

                            <p className="text-[11px] text-slate-500 font-medium">
                              Văn bản: {cit.documentTitle}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'qa' && (
                    /* Interactive Q&A Thread */
                    <div className="space-y-4 animate-in fade-in duration-100 flex flex-col h-full">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>HỎI ĐÁP AI TRỰC TIẾP TRÊN CÁC VĂN BẢN ĐÃ CHỌN</span>
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Gắn liền với ngữ cảnh {allSelectedDocuments.length} văn bản
                        </span>
                      </div>

                      {/* Messages list */}
                      <div className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-[220px]">
                        {/* Initial summary prompt suggestion */}
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 space-y-2">
                          <span className="font-bold block">💡 Gợi ý câu hỏi đào sâu:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {analysisResult.suggestedFollowUps?.map((fUp, fIdx) => (
                              <button
                                key={fIdx}
                                type="button"
                                onClick={() => setQaInput(fUp)}
                                className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-md text-[11px] font-medium transition-colors text-left cursor-pointer"
                              >
                                {fUp}
                              </button>
                            ))}
                          </div>
                        </div>

                        {qaMessages.map((msg, mIdx) => (
                          <div
                            key={mIdx}
                            className={cn(
                              'p-3.5 rounded-xl text-xs leading-relaxed max-w-[88%]',
                              msg.sender === 'user'
                                ? 'bg-blue-600 text-white ml-auto font-medium shadow-xs'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 mr-auto shadow-2xs'
                            )}
                          >
                            {msg.sender === 'user' ? (
                              msg.text
                            ) : (
                              <MarkdownRenderer content={msg.text} className="text-xs text-slate-800" />
                            )}
                          </div>
                        ))}

                        {qaLoading && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 max-w-[60%]">
                            <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                            <span>AI đang tra cứu và suy luận căn cứ...</span>
                          </div>
                        )}
                      </div>

                      {/* QA Input Form */}
                      <form onSubmit={handleQaSubmit} className="flex items-center gap-2 pt-2">
                        <input
                          type="text"
                          value={qaInput}
                          onChange={(e) => setQaInput(e.target.value)}
                          placeholder="Đặt câu hỏi chi tiết về quy định giữa các văn bản này..."
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          disabled={!qaInput.trim() || qaLoading}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-40 transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
