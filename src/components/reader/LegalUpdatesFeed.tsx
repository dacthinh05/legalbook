'use client';

import { useState, useMemo } from 'react';
import type { LegalDocument, Category, DocumentType } from '@/types';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
  DOCUMENT_TYPE_ABBREV,
  formatDate,
  formatShortTitle,
  getEffectiveStatus,
} from '@/lib/utils';
import {
  analyzeDocumentChange,
  getDocumentTopicName,
  getImpactedDocuments,
  getDaysUntil,
} from '@/lib/legal-feed-utils';
import {
  Sparkles,
  Clock,
  Zap,
  Filter,
  Layers,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

interface LegalUpdatesFeedProps {
  allDocuments: LegalDocument[];
  categoryDocuments: LegalDocument[];
  activeCategory: Category | null;
  activeDocType?: DocumentType | null;
  categories: Category[];
  readDocuments: Set<string>;
  bookmarkedDocuments: Set<string>;
  onSelectDocument: (docId: string) => void;
  onResetCategoryFilter?: () => void;
}

type FeedFilterTab =
  | 'all'             // Tất cả
  | 'new_issued'      // Mới ban hành
  | 'new_updated'     // Mới cập nhật
  | 'upcoming'        // Sắp có hiệu lực
  | 'expired_changed';// Thay đổi hiệu lực

type UpcomingWindow = 'all' | '30' | '60' | '90';

function StatusBadge({ status, countdownDays }: { status: LegalDocument['status']; countdownDays?: number }) {
  const label = status === 'chua_hieu_luc' && countdownDays && countdownDays > 0
    ? `Sắp có hiệu lực (còn ${countdownDays} ngày)`
    : DOCUMENT_STATUS_LABELS[status] || status;

  return (
    <span
      className={`inline-flex items-center gap-1 shrink-0 whitespace-nowrap px-1.5 py-0.2 rounded text-[10.5px] font-semibold border leading-tight ${
        DOCUMENT_STATUS_COLORS[status]
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status === 'hieu_luc'
            ? 'bg-green-500'
            : status === 'chua_hieu_luc'
            ? 'bg-amber-500'
            : status === 'het_hieu_luc_mot_phan'
            ? 'bg-orange-500'
            : status === 'het_hieu_luc_toan_bo'
            ? 'bg-red-500'
            : 'bg-gray-400'
        }`}
      />
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: LegalDocument['document_type'] }) {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10.5px] font-semibold ${
        DOCUMENT_TYPE_COLORS[type] || 'text-slate-700 bg-slate-100'
      }`}
    >
      {DOCUMENT_TYPE_LABELS[type] || DOCUMENT_TYPE_ABBREV[type] || type}
    </span>
  );
}

interface CompactFeedRowProps {
  doc: LegalDocument;
  allDocs: LegalDocument[];
  categories: Category[];
  isSingleType: boolean;
  activeCategoryName: string | null;
  isRead: boolean;
  onSelect: () => void;
}

function CompactFeedRow({
  doc,
  allDocs,
  categories,
  isSingleType,
  activeCategoryName,
  isRead,
  onSelect,
}: CompactFeedRowProps) {
  const effStatus = getEffectiveStatus(doc);
  const changeInfo = analyzeDocumentChange(doc, allDocs);
  const topicName = getDocumentTopicName(doc.id, categories);
  const impactedList = getImpactedDocuments(doc.id, allDocs);

  // Clean title without repeating document type or number if shown in Line 1
  const displayTitle = formatShortTitle(doc.title, doc.document_type);

  // Extract concise bullet point or summary
  const summarySnippet = useMemo(() => {
    if (doc.summary_new_points) {
      const first = doc.summary_new_points
        .split('\n')
        .map((p) => p.trim())
        .find((p) => p.length > 0);
      if (first) return first.replace(/^[0-9]+[.)]\s*/, '');
    }
    return doc.summary_main || null;
  }, [doc.summary_new_points, doc.summary_main]);

  // Hide topic pill if user is already browsing this specific category
  const showTopicPill = topicName && topicName !== 'Chung' && topicName !== activeCategoryName;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className="group p-3 md:p-3.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50/90 hover:border-blue-400 hover:shadow-2xs transition-all cursor-pointer text-left select-text space-y-1.5"
    >
      {/* Line 1: Type, Number, Topic, New Badge, Authoritative Status on Right */}
      <div className="flex items-center justify-between gap-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {!isSingleType && <TypeBadge type={doc.document_type} />}

          {doc.document_number && (
            <span className="text-[12px] font-bold text-slate-900 font-mono group-hover:text-blue-700 transition-colors">
              {doc.document_number}
            </span>
          )}

          {showTopicPill && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
              <Layers className="w-2.5 h-2.5 text-slate-400" />
              <span>{topicName}</span>
            </span>
          )}

          {changeInfo.type === 'newly_issued' && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] border bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
              <span>Mới ban hành</span>
            </span>
          )}

          {!isRead && (
            <span
              className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"
              role="img"
              aria-label="Chưa đọc"
              title="Chưa đọc"
            />
          )}
        </div>

        <StatusBadge status={effStatus} countdownDays={changeInfo.countdownDays} />
      </div>

      {/* Line 2: Title (Concise, no duplicate document type or number) */}
      <h3 className="text-[13px] font-bold text-slate-900 group-hover:text-blue-900 leading-snug line-clamp-1">
        {displayTitle}
      </h3>

      {/* Line 3: Impacted Documents / Snippet if any (compact single line) */}
      {impactedList.length > 0 ? (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-900 bg-amber-50/80 px-2 py-1 rounded border border-amber-200/70 truncate">
          <Zap className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="font-semibold shrink-0">{impactedList[0].actionLabel}:</span>
          {impactedList[0].docNumber && (
            <span className="font-mono font-bold shrink-0">{impactedList[0].docNumber}</span>
          )}
          {impactedList[0].docTitle && (
            <span className="truncate italic text-amber-800">({impactedList[0].docTitle})</span>
          )}
          {impactedList[0].notes && (
            <span className="text-slate-500 text-[10.5px] truncate">— {impactedList[0].notes}</span>
          )}
        </div>
      ) : summarySnippet ? (
        <p className="text-[11.5px] text-slate-500 line-clamp-1 leading-tight">
          <span className="font-medium text-slate-600">Tóm tắt: </span>
          {summarySnippet}
        </p>
      ) : null}

      {/* Line 4: Issuer, Dates, Action Link */}
      <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-2 truncate">
          {doc.issuing_body && (
            <span className="font-medium text-slate-600 truncate">{doc.issuing_body}</span>
          )}

          {doc.issued_date && (
            <>
              <span className="text-slate-300">·</span>
              <span className="shrink-0">
                Ban hành: <strong className="text-slate-600 font-semibold">{formatDate(doc.issued_date)}</strong>
              </span>
            </>
          )}

          {doc.effective_date && (
            <>
              <span className="text-slate-300">·</span>
              <span className="shrink-0">
                Hiệu lực: <strong className="text-slate-700 font-semibold">{formatDate(doc.effective_date)}</strong>
              </span>
            </>
          )}
        </div>

        <span className="inline-flex items-center text-blue-600 group-hover:text-blue-800 font-semibold text-[11.5px] shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform">
          Đọc ngay <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
}

// ─── Main Feed Component ──────────────────────────────────────────────────────

export function LegalUpdatesFeed({
  allDocuments,
  categoryDocuments,
  activeCategory,
  activeDocType,
  categories,
  readDocuments,
  onSelectDocument,
  onResetCategoryFilter,
}: LegalUpdatesFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedFilterTab>('all');
  const [upcomingDays, setUpcomingDays] = useState<UpcomingWindow>('all');

  // Check if current scope has a uniform document type
  const isSingleType = useMemo(() => {
    if (activeDocType) return true;
    if (categoryDocuments.length === 0) return false;
    const firstType = categoryDocuments[0].document_type;
    return categoryDocuments.every((d) => d.document_type === firstType);
  }, [categoryDocuments, activeDocType]);

  // Target scope of documents: strictly from categoryDocuments (single source of truth)
  const baseScope = categoryDocuments;

  // Single source metrics computed directly from baseScope
  const totalInScope = baseScope.length;

  const newIssuedInScope = useMemo(() => {
    return baseScope.filter((d) => {
      const days = getDaysUntil(d.issued_date);
      return days !== null && days >= -180 && days <= 0;
    });
  }, [baseScope]);

  const upcomingInScope = useMemo(() => {
    return baseScope.filter((d) => getEffectiveStatus(d) === 'chua_hieu_luc');
  }, [baseScope]);

  const changedInScope = useMemo(() => {
    return baseScope.filter((d) => {
      const eff = getEffectiveStatus(d);
      const impacted = getImpactedDocuments(d.id, allDocuments);
      return (
        eff === 'het_hieu_luc_toan_bo' ||
        eff === 'het_hieu_luc_mot_phan' ||
        impacted.length > 0
      );
    });
  }, [baseScope, allDocuments]);

  // Filtered list based on active tab
  const displayDocuments = useMemo(() => {
    let list = [...baseScope];

    if (activeTab === 'new_issued') {
      list = list.filter((d) => {
        const days = getDaysUntil(d.issued_date);
        return days !== null && days >= -180 && days <= 0;
      });
      list.sort((a, b) => (b.issued_date || '').localeCompare(a.issued_date || ''));
    } else if (activeTab === 'new_updated') {
      list.sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
    } else if (activeTab === 'upcoming') {
      list = list.filter((d) => getEffectiveStatus(d) === 'chua_hieu_luc');
      if (upcomingDays !== 'all') {
        const maxDays = parseInt(upcomingDays, 10);
        list = list.filter((d) => {
          const days = getDaysUntil(d.effective_date);
          return days !== null && days > 0 && days <= maxDays;
        });
      }
      list.sort((a, b) => (a.effective_date || '').localeCompare(b.effective_date || ''));
    } else if (activeTab === 'expired_changed') {
      list = list.filter((d) => {
        const eff = getEffectiveStatus(d);
        const impacted = getImpactedDocuments(d.id, allDocuments);
        return (
          eff === 'het_hieu_luc_toan_bo' ||
          eff === 'het_hieu_luc_mot_phan' ||
          impacted.length > 0
        );
      });
      list.sort((a, b) => (b.effective_date || b.issued_date || '').localeCompare(a.effective_date || a.issued_date || ''));
    } else {
      list.sort((a, b) => {
        const da = a.effective_date || a.issued_date || a.updated_at || '';
        const db = b.effective_date || b.issued_date || b.updated_at || '';
        return db.localeCompare(da);
      });
    }

    return list;
  }, [baseScope, activeTab, upcomingDays, allDocuments]);

  // Clean Header Title
  const headerTitle = useMemo(() => {
    if (activeDocType) {
      return `${DOCUMENT_TYPE_LABELS[activeDocType] || activeDocType} mới cập nhật`;
    }
    if (activeCategory) {
      return `Cập nhật: ${activeCategory.name}`;
    }
    return 'Cập nhật pháp luật';
  }, [activeDocType, activeCategory]);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 select-text">
      <div className="max-w-[980px] mx-auto px-3 sm:px-5 md:px-7 py-3 md:py-4 space-y-2.5">

        {/* ── 1. Compact Header Strip ── */}
        <div className="bg-white border border-slate-200/90 rounded-xl px-3.5 py-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-[15px] md:text-[17px] font-black text-slate-950 tracking-tight leading-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>{headerTitle}</span>
            </h1>

            <span className="text-[11px] text-slate-500 font-mono">
              Tổng số: <strong className="text-slate-800 font-bold">{totalInScope}</strong> văn bản
            </span>
          </div>
        </div>

        {/* ── 2. Unified Single Filter Bar (Single Source of Truth) ── */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200/90 shadow-2xs overflow-x-auto text-[11.5px]">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tất cả {totalInScope}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new_issued')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                activeTab === 'new_issued'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Mới ban hành {newIssuedInScope.length > 0 ? newIssuedInScope.length : ''}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('new_updated')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                activeTab === 'new_updated'
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Mới cập nhật
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              Sắp có hiệu lực {upcomingInScope.length > 0 ? upcomingInScope.length : ''}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('expired_changed')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === 'expired_changed'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-purple-800 hover:text-purple-950 hover:bg-purple-50'
              }`}
            >
              <Zap className="w-3 h-3" />
              Thay đổi hiệu lực {changedInScope.length > 0 ? changedInScope.length : ''}
            </button>
          </div>

          {/* Sub-pills for Upcoming Tab */}
          {activeTab === 'upcoming' && (
            <div className="flex items-center gap-1 bg-amber-50/90 border border-amber-200/80 p-0.5 rounded-lg text-[11px]">
              <span className="text-amber-900 font-semibold px-1">Lọc:</span>
              {(
                [
                  { id: 'all', label: 'Tất cả' },
                  { id: '30', label: '30 ngày' },
                  { id: '60', label: '60 ngày' },
                  { id: '90', label: '90 ngày' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setUpcomingDays(opt.id)}
                  className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium transition-colors ${
                    upcomingDays === opt.id
                      ? 'bg-amber-600 text-white font-bold'
                      : 'text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 3. High-Density Compact List of Documents ── */}
        <div className="space-y-2">
          {displayDocuments.length === 0 ? (
            <div className="py-8 px-4 bg-white border border-slate-200 rounded-xl text-center space-y-2 shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Filter className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 max-w-sm mx-auto">
                <h3 className="text-[13px] font-bold text-slate-800">
                  Không có văn bản phù hợp
                </h3>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">
                  Không có văn bản nào thỏa mãn điều kiện lọc hiện tại.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setActiveTab('all');
                    setUpcomingDays('all');
                  }}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11.5px] font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Xem tất cả
                </button>
                {(activeCategory || activeDocType) && onResetCategoryFilter && (
                  <button
                    onClick={onResetCategoryFilter}
                    className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white text-[11.5px] font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
            </div>
          ) : (
            displayDocuments.map((doc) => (
              <CompactFeedRow
                key={doc.id}
                doc={doc}
                allDocs={allDocuments}
                categories={categories}
                isSingleType={isSingleType}
                activeCategoryName={activeCategory?.name || null}
                isRead={readDocuments.has(doc.id)}
                onSelect={() => onSelectDocument(doc.id)}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}
