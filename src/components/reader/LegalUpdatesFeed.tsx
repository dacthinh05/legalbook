'use client';

import React, { useState, useMemo } from 'react';
import type { LegalDocument, Category, DocumentType } from '@/types';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  formatDate,
  formatShortTitle,
  getEffectiveStatus,
  cn,
} from '@/lib/utils';
import {
  analyzeDocumentChange,
  getDocumentTopicName,
  getImpactedDocuments,
  getDaysUntil,
} from '@/lib/legal-feed-utils';
import {
  Sparkles,
  Filter,
} from 'lucide-react';

interface LegalUpdatesFeedProps {
  allDocuments: LegalDocument[];
  categoryDocuments: LegalDocument[];
  activeCategory: Category | null;
  activeDocType?: DocumentType | null;
  categories: Category[];
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

type TimeFilterWindow = 'all' | '7' | '30' | '90';

interface CompactFeedRowProps {
  doc: LegalDocument;
  allDocs: LegalDocument[];
  categories: Category[];
  activeCategoryName?: string | null;
  onSelect: () => void;
}

function CompactFeedRow({
  doc,
  allDocs,
  categories,
  activeCategoryName,
  onSelect,
}: CompactFeedRowProps) {
  const effStatus = getEffectiveStatus(doc);
  const changeInfo = analyzeDocumentChange(doc, allDocs);
  const topicName = getDocumentTopicName(doc.id, categories);
  const impactedList = getImpactedDocuments(doc.id, allDocs);

  // Clean title without repeating document type or number in the title line
  const displayTitle = formatShortTitle(doc.title, doc.document_type, doc.document_number);

  const typeLabel = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className="group p-3.5 md:p-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/90 hover:border-blue-400 hover:shadow-2xs transition-all cursor-pointer text-left select-text space-y-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {/* DÒNG 1 — ĐỊNH DANH BÊN TRÁI + TRẠNG THÁI DUY NHẤT BÊN PHẢI */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Loại văn bản */}
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
            {typeLabel}
          </span>

          {/* Số hiệu văn bản */}
          {doc.document_number && (
            <span className="text-[12px] font-semibold text-slate-700 font-mono shrink-0 group-hover:text-blue-700 transition-colors">
              {doc.document_number}
            </span>
          )}
        </div>

        {/* Duy nhất 1 badge trạng thái chuẩn bên phải */}
        <span
          className={cn(
            'inline-flex items-center shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-medium border leading-tight',
            effStatus === 'hieu_luc' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
            effStatus === 'chua_hieu_luc' && 'bg-amber-50 text-amber-800 border-amber-200',
            effStatus === 'het_hieu_luc_mot_phan' && 'bg-orange-50 text-orange-800 border-orange-200',
            effStatus === 'het_hieu_luc_toan_bo' && 'bg-slate-100 text-slate-600 border-slate-200',
            effStatus === 'chua_xac_dinh' && 'bg-slate-50 text-slate-500 border-slate-200'
          )}
        >
          {effStatus === 'chua_hieu_luc' && changeInfo.countdownDays && changeInfo.countdownDays > 0
            ? `Sắp có hiệu lực · còn ${changeInfo.countdownDays} ngày`
            : DOCUMENT_STATUS_LABELS[effStatus] || 'Chưa xác định'}
        </span>
      </div>

      {/* DÒNG 2 — TÊN VĂN BẢN (NỘI DUNG NỔI BẬT NHẤT) */}
      <h2 className="text-[14px] md:text-[14.5px] font-semibold text-slate-900 group-hover:text-blue-900 leading-snug line-clamp-2 transition-colors">
        {displayTitle}
      </h2>

      {/* DÒNG 3 — QUAN HỆ PHÁP LÝ (CHỈ KHI CÓ, GỌN GÀNG, KHÔNG VIỀN ĐẬM) */}
      {impactedList.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200/60 truncate">
          <span className="text-slate-400 shrink-0">↳</span>
          <span className="font-medium text-slate-700 shrink-0">{impactedList[0].actionLabel}:</span>
          {impactedList[0].docNumber && (
            <span className="font-mono font-semibold text-slate-800 shrink-0">{impactedList[0].docNumber}</span>
          )}
          {impactedList[0].docTitle && (
            <span className="truncate text-slate-500 italic">({impactedList[0].docTitle})</span>
          )}
          {impactedList.length > 1 && (
            <span className="text-blue-600 font-medium text-[10.5px] shrink-0">
              · +{impactedList.length - 1} văn bản
            </span>
          )}
        </div>
      )}

      {/* DÒNG 4 — METADATA (MÀU TRUNG TÍNH) */}
      <div className="flex items-center gap-2 text-[11px] text-slate-500 flex-wrap pt-0.5">
        {doc.issuing_body && (
          <span className="font-medium text-slate-600 truncate">{doc.issuing_body}</span>
        )}

        {doc.issued_date && (
          <>
            <span className="text-slate-300">·</span>
            <span>
              Ban hành: <strong className="text-slate-700 font-medium">{formatDate(doc.issued_date)}</strong>
            </span>
          </>
        )}

        {doc.effective_date && (
          <>
            <span className="text-slate-300">·</span>
            <span>
              Hiệu lực: <strong className="text-slate-700 font-medium">{formatDate(doc.effective_date)}</strong>
            </span>
          </>
        )}

        {topicName && topicName !== 'Chung' && topicName !== activeCategoryName && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600">{topicName}</span>
          </>
        )}

        {changeInfo.type === 'newly_issued' && doc.issued_date && (
          <>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 font-medium">Mới ban hành</span>
          </>
        )}
      </div>
    </div>
  );
}

export function LegalUpdatesFeed({
  allDocuments,
  categoryDocuments,
  activeCategory,
  activeDocType,
  categories,
  bookmarkedDocuments,
  onSelectDocument,
  onResetCategoryFilter,
}: LegalUpdatesFeedProps) {
  const [activeTab, setActiveTab] = useState<FeedFilterTab>('all');
  const [timeWindow, setTimeWindow] = useState<TimeFilterWindow>('all');

  // Target scope of documents
  const baseScope = categoryDocuments;

  // Compute single source counts for tabs
  const allCount = baseScope.length;

  const newlyIssuedCount = useMemo(() => {
    return baseScope.filter((d) => {
      const days = getDaysUntil(d.issued_date);
      return days !== null && days >= -180 && days <= 0;
    }).length;
  }, [baseScope]);

  const upcomingEffectiveCount = useMemo(() => {
    return baseScope.filter((d) => getEffectiveStatus(d) === 'chua_hieu_luc').length;
  }, [baseScope]);

  const effectChangedCount = useMemo(() => {
    return baseScope.filter((d) => {
      const eff = getEffectiveStatus(d);
      const impacted = getImpactedDocuments(d.id, allDocuments);
      return (
        eff === 'het_hieu_luc_toan_bo' ||
        eff === 'het_hieu_luc_mot_phan' ||
        impacted.length > 0
      );
    }).length;
  }, [baseScope, allDocuments]);

  // Filtered list based on active tab and time window
  const displayDocuments = useMemo(() => {
    let list = [...baseScope];

    // 1. Filter by Tab
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

    // 2. Filter by Time Window if selected
    if (timeWindow !== 'all') {
      const maxDays = parseInt(timeWindow, 10);
      list = list.filter((d) => {
        const dateStr = d.effective_date || d.issued_date || d.updated_at;
        if (!dateStr) return true;
        const days = Math.abs(getDaysUntil(dateStr) || 999);
        return days <= maxDays;
      });
    }

    return list;
  }, [baseScope, activeTab, timeWindow, allDocuments]);

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
      <div className="max-w-[1140px] mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-5 space-y-3.5">

        {/* ── 1. Clean Header Strip (No duplicate count) ── */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-[16px] md:text-[18px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{headerTitle}</span>
            </h1>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Theo dõi văn bản mới ban hành và thay đổi hiệu lực.
            </p>
          </div>

          {/* Time Window Filter */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] shadow-2xs">
            <span className="text-slate-400 pl-2 pr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" />
            </span>
            {(['all', '7', '30', '90'] as TimeFilterWindow[]).map((tw) => (
              <button
                key={tw}
                type="button"
                onClick={() => setTimeWindow(tw)}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  timeWindow === tw
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tw === 'all' ? 'Tất cả thời gian' : `${tw} ngày`}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Unified Filter Tabs (Height 38px, Single Count per tab) ── */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[12px]">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`h-9 px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Tất cả</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono ${activeTab === 'all' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              {allCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new_issued')}
            className={`h-9 px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'new_issued'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Mới ban hành</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono ${activeTab === 'new_issued' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              {newlyIssuedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('new_updated')}
            className={`h-9 px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'new_updated'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Mới cập nhật</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`h-9 px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'upcoming'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Sắp có hiệu lực</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono ${activeTab === 'upcoming' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              {upcomingEffectiveCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expired_changed')}
            className={`h-9 px-3.5 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'expired_changed'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span>Thay đổi hiệu lực</span>
            <span className={`px-1.5 py-0.2 rounded text-[11px] font-mono ${activeTab === 'expired_changed' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              {effectChangedCount}
            </span>
          </button>
        </div>
        {/* ── 3. Document Feed List ── */}
        {filteredDocuments.length > 0 ? (
          <div className="space-y-3">
            {filteredDocuments.map((doc) => {
              return (
                <CompactFeedRow
                  key={doc.id}
                  doc={doc}
                  allDocs={allDocuments}
                  categories={categories}
                  activeCategoryName={activeCategory?.name || null}
                  onSelect={() => onSelectDocument(doc.id)}
                />
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 text-center bg-white rounded-lg border border-slate-200 space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              Không có văn bản nào trong mục này.
            </p>
            <p className="text-[11px] text-slate-500">
              Vui lòng chọn tab khác hoặc xóa bộ lọc để xem toàn bộ danh mục văn bản.
            </p>
            {onResetCategoryFilter && (
              <button
                type="button"
                onClick={onResetCategoryFilter}
                className="mt-2 inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-semibold hover:bg-blue-100 transition-colors"
              >
                Xóa bộ lọc danh mục
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
