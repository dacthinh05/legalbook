'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react';
import {
  Search,
  X,
  Loader2,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Landmark,
} from 'lucide-react';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES } from '@/lib/demo-data';
import {
  executeSearch,
  createSafeHighlightSegments,
  removeVietnameseTones,
  preindexDocuments,
} from '@/lib/search';
import { formatDate, getMultiSourceLookupUrls } from '@/lib/utils';
import type {
  LegalDocument,
  DocumentType,
  EffectiveStatusType,
  SearchResultViewModel,
  SearchSortOption,
  Category,
} from '@/types';

interface SearchModalProps {
  onClose: () => void;
  onSelectDocument: (
    id: string,
    navTarget?: {
      targetNodeId?: string;
      locationLabel?: string;
      query?: string;
      tab?: 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';
    }
  ) => void;
  initialQuery?: string;
  categories?: Category[];
  allDocuments?: LegalDocument[];
}

const DOCUMENT_TYPE_OPTIONS: Array<{ value: DocumentType | 'all'; label: string }> = [
  { value: 'all', label: 'Loại: Tất cả' },
  { value: 'luat', label: 'Luật / Bộ luật' },
  { value: 'nghi_dinh', label: 'Nghị định' },
  { value: 'thong_tu', label: 'Thông tư' },
  { value: 'quyet_dinh', label: 'Quyết định' },
  { value: 'cong_van', label: 'Công văn' },
  { value: 'chuan_muc', label: 'Chuẩn mực' },
  { value: 'huong_dan', label: 'Hướng dẫn' },
  { value: 'khac', label: 'Khác / Bản tin' },
];

const STATUS_OPTIONS: Array<{ value: EffectiveStatusType | 'all'; label: string }> = [
  { value: 'all', label: 'Hiệu lực: Tất cả' },
  { value: 'active', label: 'Đang hiệu lực' },
  { value: 'upcoming', label: 'Chưa có hiệu lực' },
  { value: 'partial', label: 'Hiệu lực một phần' },
  { value: 'expired', label: 'Hết hiệu lực' },
  { value: 'unknown', label: 'Chưa xác minh' },
];

const SORT_OPTIONS: Array<{ value: SearchSortOption; label: string }> = [
  { value: 'relevance', label: 'Liên quan nhất' },
  { value: 'issued_date', label: 'Mới ban hành' },
  { value: 'effective_date', label: 'Ngày hiệu lực mới nhất' },
  { value: 'updated_at', label: 'Mới cập nhật' },
];

const QUICK_SEARCH_SUGGESTIONS = [
  'chi phí được trừ',
  '99/2025/TT-BTC',
  'hóa đơn điện tử',
  '70/2025/NĐ-CP',
  'giảm thuế GTGT',
  'giao dịch liên kết',
];

const INITIAL_VISIBLE_COUNT = 30;
const PAGE_SIZE = 25;

/**
 * XSS-safe component to render text with highlighted keyword tokens.
 * Accented/unaccented and case-insensitive matching without innerHTML injection.
 */
const HighlightedText = React.memo(function HighlightedText({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) {
  const segments = useMemo(
    () => createSafeHighlightSegments(text, query),
    [text, query]
  );

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.isHighlight ? (
          <mark
            key={i}
            className="bg-amber-100 text-amber-950 font-medium px-0.5 rounded-xs"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </span>
  );
});

/**
 * Memoized individual search result card to eliminate redundant DOM re-renders during keyboard navigation.
 */
const SearchResultCard = React.memo(function SearchResultCard({
  item,
  index,
  isSelected,
  searchQuery,
  onSelect,
}: {
  item: SearchResultViewModel;
  index: number;
  isSelected: boolean;
  searchQuery: string;
  onSelect: (item: SearchResultViewModel, openInNewTab?: boolean) => void;
}) {
  return (
    <div
      id={`search-result-${index}`}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(item, false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSelect(item, e.ctrlKey || e.metaKey);
        }
      }}
      className={`p-3.5 sm:p-4 cursor-pointer transition-colors select-text relative border-l-3 ${
        isSelected
          ? 'bg-blue-50/70 border-l-blue-700 shadow-2xs'
          : 'border-l-transparent hover:bg-slate-50'
      }`}
    >
      {/* Row 1: Document Number + Type + Status */}
      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tracking-tight ${item.documentTypeColor}`}
          >
            {item.documentTypeLabel}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-xs font-bold text-slate-900 truncate">
            <HighlightedText text={item.documentNumber} query={searchQuery} />
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          <span
            className={`px-1.5 py-0.5 rounded border text-[10.5px] font-medium ${item.effectiveStatusBadgeClass}`}
            title={item.effectiveStatusTooltip}
          >
            {item.effectiveStatusLabel}
          </span>
          {item.effectiveDate && (
            <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
              HL: {formatDate(item.effectiveDate)}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Title */}
      <h4 className="text-xs sm:text-[13px] font-semibold text-slate-900 leading-snug mb-1">
        <HighlightedText text={item.title} query={searchQuery} />
      </h4>

      {/* Row 3: Snippet */}
      {item.snippet && (
        <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans mt-1 bg-slate-50/80 p-2 rounded border border-slate-100/90">
          <HighlightedText text={item.snippet} query={searchQuery} />
        </p>
      )}

      {/* Row 4: Match Location & Action */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-1 border-t border-slate-100/80">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span className="text-slate-400 shrink-0">Khớp tại:</span>
          <span
            className={`font-semibold truncate px-1.5 py-0.5 rounded text-[10.5px] ${
              item.matchType === 'article'
                ? 'bg-blue-50 text-blue-900 border border-blue-200/80'
                : item.matchType === 'number'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200/80 font-mono'
                : 'text-slate-700 bg-slate-100/80 border border-slate-200/60'
            }`}
          >
            {item.locationLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {item.officialSourceUrl && (
            <a
              href={item.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-400 hover:text-blue-700 p-0.5 rounded flex items-center gap-0.5 transition-colors"
              title="Xem văn bản gốc trên TVPL"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="hidden md:inline text-[10.5px]">Nguồn TVPL</span>
            </a>
          )}
          <span className="text-blue-700 font-semibold flex items-center gap-0.5 hover:text-blue-900 transition-colors">
            {item.targetNodeId ? 'Đến điều khoản' : 'Xem ngay'}
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
});

export function SearchModal({
  onClose,
  onSelectDocument,
  initialQuery = '',
  categories = DEMO_CATEGORIES,
  allDocuments = DEMO_DOCUMENTS as LegalDocument[],
}: SearchModalProps) {
  // Decoupled Instant Input state (60fps immediate response)
  const [inputValue, setInputValue] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EffectiveStatusType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SearchSortOption>('relevance');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus search input on modal open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Pre-index document cache on mount once
  useEffect(() => {
    if (allDocuments.length > 0) {
      preindexDocuments(allDocuments);
    }
  }, [allDocuments]);

  // Micro-debounce query (80ms) for ultra-responsive search without typing lag
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(inputValue);
      setSelectedIndex(0);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    }, 80);

    return () => clearTimeout(handler);
  }, [inputValue]);

  const isSearching = inputValue !== debouncedQuery;
  const deferredSearchQuery = useDeferredValue(debouncedQuery);

  // Compute category document links if category filter active
  const categoryDocIds = useMemo<Set<string> | null>(() => {
    if (categoryFilter === 'all') return null;
    const cat = categories.find((c) => c.id === categoryFilter || c.slug === categoryFilter);
    if (!cat) return null;

    const ids = new Set<string>();
    const catKeywords = removeVietnameseTones(cat.name).toLowerCase();
    for (const doc of allDocuments) {
      const title = removeVietnameseTones(doc.title || '').toLowerCase();
      const num = removeVietnameseTones(doc.document_number || '').toLowerCase();
      if (title.includes(catKeywords) || num.includes(catKeywords)) {
        if (doc.id) ids.add(doc.id);
      }
    }
    return ids;
  }, [categoryFilter, categories, allDocuments]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== 'all') count++;
    if (statusFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (sortBy !== 'relevance') count++;
    return count;
  }, [typeFilter, statusFilter, categoryFilter, sortBy]);

  const handleClearFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
    setCategoryFilter('all');
    setSortBy('relevance');
    setSelectedIndex(0);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, []);

  const handleTypeFilterChange = (val: DocumentType | 'all') => {
    setTypeFilter(val);
    setSelectedIndex(0);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleStatusFilterChange = (val: EffectiveStatusType | 'all') => {
    setStatusFilter(val);
    setSelectedIndex(0);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleCategoryFilterChange = (val: string) => {
    setCategoryFilter(val);
    setSelectedIndex(0);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleSortByChange = (val: SearchSortOption) => {
    setSortBy(val);
    setSelectedIndex(0);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  // Ultra-Fast Search Execution (< 2ms)
  const { results, searchError } = useMemo<{
    results: SearchResultViewModel[];
    searchError: string | null;
  }>(() => {
    try {
      const res = executeSearch(allDocuments, deferredSearchQuery, {
        typeFilter,
        statusFilter,
        categoryDocIds,
        sortBy,
      });
      return { results: res, searchError: null };
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err);
      return {
        results: [],
        searchError: 'Đã xảy ra sự cố khi xử lý kết quả tìm kiếm.',
      };
    }
  }, [allDocuments, deferredSearchQuery, typeFilter, statusFilter, categoryDocIds, sortBy]);

  // Bounded visible slice for 60fps DOM scrolling
  const visibleResults = useMemo(() => {
    return results.slice(0, visibleCount);
  }, [results, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(results.length, prev + PAGE_SIZE));
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(results.length - 1, prev + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSelectedIndex(Math.max(0, results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleItemSelect(results[selectedIndex], e.ctrlKey || e.metaKey);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (inputValue) {
        setInputValue('');
      } else {
        onClose();
      }
    }
  };

  // Select document and navigate
  const handleItemSelect = useCallback(
    (item: SearchResultViewModel, openInNewTab = false) => {
      if (!item) return;

      if (openInNewTab) {
        if (item.officialSourceUrl) {
          window.open(item.officialSourceUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.open(`/?doc=${encodeURIComponent(item.documentId)}`, '_blank');
        }
        return;
      }

      onSelectDocument(item.documentId, {
        targetNodeId: item.targetNodeId,
        locationLabel: item.locationLabel,
        query: deferredSearchQuery,
        tab: 'noidung',
      });
      onClose();
    },
    [onSelectDocument, deferredSearchQuery, onClose]
  );

  const selectedResult = results[selectedIndex] || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm toàn hệ thống LegalBook"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-none sm:rounded-xl shadow-2xl border-0 sm:border border-slate-200 w-full sm:w-[min(900px,calc(100vw-48px))] h-full sm:h-auto sm:max-h-[min(760px,calc(100vh-64px))] overflow-hidden flex flex-col focus:outline-none"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ============================================================
            1. FIXED SEARCH INPUT HEADER (Height 54px, Immediate Feedback)
            ============================================================ */}
        <div className="h-14 px-4 sm:px-5 border-b border-slate-200 flex items-center gap-3 bg-white shrink-0">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results-list"
            aria-activedescendant={selectedResult ? `search-result-${selectedIndex}` : undefined}
            placeholder="Tìm số hiệu, tên văn bản, điều khoản hoặc nội dung..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 text-base sm:text-[16px] bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-medium tracking-tight"
          />

          {/* Loading Spinner */}
          {isSearching && (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
          )}

          {/* Clear Query Button */}
          {inputValue && (
            <button
              onClick={() => {
                setInputValue('');
                inputRef.current?.focus();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
              aria-label="Xóa từ khóa tìm kiếm"
              title="Xóa từ khóa"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Close / ESC Button */}
          <button
            onClick={onClose}
            className="hidden sm:inline-flex items-center px-2 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-xs font-mono font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            aria-label="Đóng hộp tìm kiếm"
            title="Đóng (Esc)"
          >
            Esc
          </button>
          <button
            onClick={onClose}
            className="sm:hidden px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 active:bg-slate-200 rounded-md transition-colors min-h-[44px] flex items-center"
            aria-label="Đóng tìm kiếm"
          >
            Đóng
          </button>
        </div>

        {/* ============================================================
            2. FIXED FILTER BAR (Clean Dropdowns, Clear Filter Action)
            ============================================================ */}
        <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 flex-wrap text-xs shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Filter: Loại văn bản */}
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => handleTypeFilterChange(e.target.value as DocumentType | 'all')}
                aria-label="Lọc theo loại văn bản"
                className="appearance-none pr-7 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs transition-colors min-h-[36px] sm:min-h-0"
              >
                {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter: Hiệu lực */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value as EffectiveStatusType | 'all')}
                aria-label="Lọc theo tình trạng hiệu lực"
                className="appearance-none pr-7 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs transition-colors min-h-[36px] sm:min-h-0"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter: Chủ đề */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                aria-label="Lọc theo chủ đề danh mục"
                className="appearance-none pr-7 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs transition-colors max-w-[160px] truncate min-h-[36px] sm:min-h-0"
              >
                <option value="all">Chủ đề: Tất cả</option>
                {categories
                  .filter((c) => !c.parent_id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter: Sắp xếp */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortByChange(e.target.value as SearchSortOption)}
                aria-label="Sắp xếp kết quả"
                className="appearance-none pr-7 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 font-medium hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-xs transition-colors min-h-[36px] sm:min-h-0"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    Xếp theo: {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Active Filters Clear Action */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-[11.5px] font-medium text-slate-600">
                {activeFiltersCount} bộ lọc đang áp dụng
              </span>
              <span className="text-slate-300">·</span>
              <button
                onClick={handleClearFilters}
                className="text-[11.5px] font-semibold text-blue-700 hover:text-blue-900 underline transition-colors cursor-pointer"
                title="Xóa toàn bộ bộ lọc"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* ============================================================
            3. FIXED RESULT COUNT BAR
            ============================================================ */}
        {deferredSearchQuery.trim() && (
          <div className="px-4 sm:px-5 py-2 bg-slate-50/60 border-b border-slate-100 text-xs font-medium text-slate-600 flex items-center justify-between shrink-0">
            <span>
              {results.length} kết quả cho &ldquo;
              <span className="font-semibold text-slate-900">{deferredSearchQuery}</span>
              &rdquo;
            </span>
          </div>
        )}

        {/* ============================================================
            4. SCROLLABLE RESULTS LIST (Bounded 30 cards, 60fps scrolling)
            ============================================================ */}
        <div
          ref={resultsContainerRef}
          id="search-results-list"
          role="listbox"
          aria-label="Danh sách kết quả tìm kiếm"
          className="flex-1 overflow-y-auto min-h-0 bg-white divide-y divide-slate-100 pr-1"
        >
          {searchError ? (
            <div className="p-8 text-center text-xs text-red-600 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
              <p className="font-semibold">{searchError}</p>
            </div>
          ) : !deferredSearchQuery.trim() ? (
            /* STATE B: Empty Query — Suggestions */
            <div className="p-6 sm:p-8 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Gợi ý tra cứu nhanh
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {QUICK_SEARCH_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => {
                        setInputValue(sug);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800">Mẹo tìm kiếm chính xác:</div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>Tìm theo số hiệu: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">70/2025</code> hoặc <code className="bg-white px-1.5 py-0.5 rounded border font-mono">99/2025/TT-BTC</code></li>
                  <li>Tìm theo điều khoản: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Điều 19</code> hoặc <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Khoản 2 Điều 15</code></li>
                  <li>Tìm tiếng Việt không dấu: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">thue gtgt</code> hoặc <code className="bg-white px-1.5 py-0.5 rounded border font-mono">chi phi hop ly</code></li>
                </ul>
              </div>
            </div>
          ) : results.length === 0 ? (
            /* STATE C: No Results */
            <div className="p-8 text-center text-xs text-slate-500 space-y-4">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 text-sm">
                  Không tìm thấy văn bản phù hợp với &ldquo;{deferredSearchQuery}&rdquo; trong kho số hóa
                </p>
                <p className="text-slate-500">
                  Thử tìm kiếm với từ khóa ngắn hơn, không dấu hoặc tra cứu trực tiếp trên các Cổng Bộ Ngành chính thức dưới đây:
                </p>
              </div>

              {/* Multi-source Cross-check shortcuts */}
              <div className="pt-2 max-w-xl mx-auto">
                <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>Tra cứu nhanh &ldquo;{deferredSearchQuery}&rdquo; trên Cổng Bộ Ngành & Nguồn gốc:</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {getMultiSourceLookupUrls(deferredSearchQuery).map((src) => (
                      <a
                        key={src.id}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-100 hover:border-blue-400 hover:shadow-xs transition-all text-[11px] group"
                      >
                        <span className="font-medium text-slate-700 group-hover:text-blue-700 truncate">
                          {src.name}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 font-semibold rounded-md hover:bg-slate-200 transition-colors"
                >
                  Xóa tất cả bộ lọc ({activeFiltersCount})
                </button>
              )}
            </div>
          ) : (
            /* STATE D: Results List */
            <>
              {visibleResults.map((item, index) => (
                <SearchResultCard
                  key={item.id}
                  item={item}
                  index={index}
                  isSelected={selectedIndex === index}
                  searchQuery={deferredSearchQuery}
                  onSelect={handleItemSelect}
                />
              ))}

              {/* Multi-Source Quick Cross-Check Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Landmark className="w-3.5 h-3.5 text-blue-600" />
                    Mở rộng tra cứu &ldquo;{deferredSearchQuery}&rdquo; trên Cổng Bộ Ngành:
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getMultiSourceLookupUrls(deferredSearchQuery).slice(0, 4).map((src) => (
                      <a
                        key={src.id}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded bg-white border border-slate-200 hover:border-blue-400 text-[10px] font-semibold text-slate-700 hover:text-blue-600 inline-flex items-center gap-1 shadow-2xs transition-colors"
                      >
                        {src.name}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {/* Load More Button if results exceed initial slice */}
              {results.length > visibleCount && (
                <div className="p-3 text-center bg-slate-50/60 border-t border-slate-100">
                  <button
                    onClick={handleLoadMore}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    Xem thêm {results.length - visibleCount} kết quả còn lại
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================
            5. FIXED FOOTER TOOLBAR (Keyboard shortcuts & Summary)
            ============================================================ */}
        <div className="h-10 px-4 sm:px-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↓</kbd>
              di chuyển
            </span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Enter</kbd>
              chọn
            </span>
            <span className="text-slate-300">·</span>
            <span className="hidden md:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">Esc</kbd>
              đóng
            </span>
          </div>

          <div className="font-mono text-slate-400">
            {results.length > 0 && `Đang xem 1–${visibleResults.length} / ${results.length}`}
          </div>
        </div>
      </div>
    </div>
  );
}
