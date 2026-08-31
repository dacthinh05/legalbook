'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useDeferredValue,
} from 'react';
import {
  Search,
  X,
  Loader2,
  ChevronDown,
  SlidersHorizontal,
  ExternalLink,
  FileText,
  History,
  AlertCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES } from '@/lib/demo-data';
import { getDeletedDocumentIds } from '@/lib/data-service';
import {
  executeSearchWithScopeCounts,
  createSafeHighlightSegments,
  removeVietnameseTones,
  preindexDocuments,
  SearchScopeCounts,
} from '@/lib/search';
import { formatDate } from '@/lib/utils';
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
  { value: 'all', label: 'Tất cả loại văn bản' },
  { value: 'luat', label: 'Luật / Bộ luật' },
  { value: 'nghi_dinh', label: 'Nghị định' },
  { value: 'thong_tu', label: 'Thông tư' },
  { value: 'quyet_dinh', label: 'Quyết định' },
  { value: 'cong_van', label: 'Công văn' },
  { value: 'chuan_muc', label: 'Chuẩn mực (VAS/VFRS)' },
  { value: 'huong_dan', label: 'Hướng dẫn' },
  { value: 'khac', label: 'Khác / Bản tin' },
];

const STATUS_OPTIONS: Array<{ value: EffectiveStatusType | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả hiệu lực' },
  { value: 'active', label: 'Đang có hiệu lực' },
  { value: 'upcoming', label: 'Sắp có hiệu lực' },
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
  '118/2026/TT-BTC',
  'chi phí được trừ',
  '58/2026/TT-BTC',
  'hóa đơn điện tử',
  'giảm thuế GTGT',
  'giao dịch liên kết',
  'Nghị định 144/2026',
];

const STORAGE_KEY_RECENT = 'lb_recent_searches';
const INITIAL_VISIBLE_COUNT = 30;
const PAGE_SIZE = 25;

/**
 * XSS-safe component to render text with intelligent multi-tier highlighted keyword tokens.
 * Exact phrases are highlighted with medium amber; secondary tokens with subtle underline/amber.
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
            className={
              seg.highlightLevel === 'exact'
                ? 'bg-amber-200/90 text-amber-950 font-semibold px-0.5 rounded-xs'
                : 'bg-amber-100/70 text-slate-800 font-medium px-0.5 rounded-xs underline decoration-amber-300 underline-offset-2'
            }
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
 * Compact 4-Row Search Result Card (~120–140px)
 * Designed for high scanning density: 7–9 results per 1440x900 viewport.
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
      className={`px-3.5 py-2.5 sm:px-4 sm:py-3 cursor-pointer transition-colors select-text relative border-l-3 border-b border-b-slate-100/80 ${
        isSelected
          ? 'bg-blue-50/70 border-l-blue-700 shadow-2xs'
          : 'border-l-transparent hover:bg-slate-50/80'
      }`}
    >
      {/* Row 1: Document Metadata (Type + Number + Provision / Status + Effective Date) */}
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap text-xs">
          <span
            className={`px-1.5 py-0.2 rounded text-[10.5px] font-semibold tracking-tight ${item.documentTypeColor}`}
          >
            {item.documentTypeLabel}
          </span>
          <span className="text-slate-300">·</span>
          <span className="font-mono text-xs font-bold text-slate-900 truncate">
            <HighlightedText text={item.documentNumber} query={searchQuery} />
          </span>
          {item.locationLabel &&
            item.locationLabel !== 'Toàn văn nội dung' &&
            item.locationLabel !== 'Trong văn bản' &&
            item.locationLabel !== 'Tiêu đề văn bản' &&
            item.locationLabel !== 'Số hiệu văn bản' &&
            item.locationLabel !== 'Trong tiêu đề' && (
              <>
                <span className="text-slate-300">·</span>
                <span className="font-medium text-[10.5px] text-blue-800 bg-blue-50/90 px-1.5 py-0.2 rounded border border-blue-200/60 truncate max-w-[200px]">
                  {item.locationLabel}
                </span>
              </>
            )}
          {item.issuer && (
            <>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-[11px] text-slate-500 truncate hidden sm:inline max-w-[220px]">
                {item.issuer}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-xs">
          <span
            className={`px-1.5 py-0.2 rounded border text-[10px] font-semibold ${item.effectiveStatusBadgeClass}`}
            title={item.effectiveStatusTooltip}
          >
            {item.effectiveStatusLabel}
          </span>
          {item.effectiveDate && (
            <span className="text-[10.5px] text-slate-400 font-mono tabular-nums hidden sm:inline">
              HL: {formatDate(item.effectiveDate)}
            </span>
          )}
          {item.officialSourceUrl && (
            <a
              href={item.officialSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-slate-400 hover:text-blue-700 p-0.5 rounded flex items-center gap-0.5 transition-colors hidden md:inline-flex"
              title="Xem văn bản gốc trên TVPL"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Row 2: Title */}
      <h4 className="text-[13.5px] sm:text-[14px] font-semibold text-slate-900 leading-snug mb-1 line-clamp-2">
        <HighlightedText text={item.displayTitle || item.title} query={searchQuery} />
      </h4>

      {/* Row 3: Snippet (1-2 lines with context) */}
      {item.snippet && (
        <p className="text-[11.5px] text-slate-600 leading-relaxed font-sans line-clamp-2 bg-slate-50/70 px-2.5 py-1 rounded border border-slate-100/90 mt-1">
          <HighlightedText text={item.snippet} query={searchQuery} />
        </p>
      )}
    </div>
  );
});

export function SearchModal({
  onClose,
  onSelectDocument,
  initialQuery = '',
  categories = DEMO_CATEGORIES,
  allDocuments = DEMO_DOCUMENTS as unknown as LegalDocument[],
}: SearchModalProps) {
  // Input state
  const [inputValue, setInputValue] = useState(initialQuery);
  // Scope state
  const [scopeFilter, setScopeFilter] = useState<'all' | 'document' | 'provision'>('all');

  // Filter state
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<EffectiveStatusType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SearchSortOption>('relevance');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  // Results & Navigation state
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RECENT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.slice(0, 6);
      }
    } catch {}
    return [];
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const saveRecentSearch = useCallback((q: string) => {
    const clean = q.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item !== clean)].slice(0, 6);
      try {
        localStorage.setItem(STORAGE_KEY_RECENT, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Focus input on mount & sync initialQuery
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (initialQuery !== undefined) {
      setInputValue(initialQuery);
      setSelectedIndex(0);
      setVisibleCount(INITIAL_VISIBLE_COUNT);
    }
  }, [initialQuery]);

  // Filter active documents (exclude locally or remotely deleted docs)
  const activeDocs = useMemo(() => {
    const deleted = getDeletedDocumentIds();
    const list = allDocuments && allDocuments.length > 0 ? allDocuments : (DEMO_DOCUMENTS as unknown as LegalDocument[]);
    return list.filter((d) => !deleted.has(d.id));
  }, [allDocuments]);

  // Pre-index document cache on mount
  useEffect(() => {
    if (activeDocs.length > 0) {
      preindexDocuments(activeDocs);
    }
  }, [activeDocs]);

  const effectiveQuery = inputValue.trim();
  // Compute category document links if category filter active
  const categoryDocIds = useMemo<Set<string> | null>(() => {
    if (categoryFilter === 'all') return null;
    const cat = categories.find((c) => c.id === categoryFilter || c.slug === categoryFilter);
    if (!cat) return null;

    const ids = new Set<string>();
    const catKeywords = removeVietnameseTones(cat.name).toLowerCase();
    for (const doc of activeDocs) {
      const title = removeVietnameseTones(doc.title || '').toLowerCase();
      const num = removeVietnameseTones(doc.document_number || '').toLowerCase();
      if (title.includes(catKeywords) || num.includes(catKeywords)) {
        if (doc.id) ids.add(doc.id);
      }
    }
    return ids;
  }, [categoryFilter, categories, activeDocs]);

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
    setScopeFilter('all');
    setSelectedIndex(0);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, []);

  // Execute Search with Scope Counts (< 2ms)
  const { results, scopeCounts, searchError } = useMemo<{
    results: SearchResultViewModel[];
    scopeCounts: SearchScopeCounts;
    searchError: string | null;
  }>(() => {
    try {
      const { results: res, scopeCounts: counts } = executeSearchWithScopeCounts(
        activeDocs,
        effectiveQuery,
        {
          typeFilter,
          statusFilter,
          scopeFilter,
          categoryDocIds,
          sortBy,
        }
      );
      return { results: res, scopeCounts: counts, searchError: null };
    } catch (err) {
      console.error('Lỗi tìm kiếm:', err);
      return {
        results: [],
        scopeCounts: { all: 0, document: 0, provision: 0 },
        searchError: 'Đã xảy ra sự cố khi xử lý kết quả tìm kiếm.',
      };
    }
  }, [activeDocs, effectiveQuery, typeFilter, statusFilter, scopeFilter, categoryDocIds, sortBy]);

  // Visible slice for DOM performance
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
      const el = document.getElementById(`search-result-${Math.min(results.length - 1, selectedIndex + 1)}`);
      el?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(0, prev - 1));
      const el = document.getElementById(`search-result-${Math.max(0, selectedIndex - 1)}`);
      el?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSelectedIndex(0);
      resultsContainerRef.current?.scrollTo({ top: 0 });
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
      if (filterPanelOpen) {
        setFilterPanelOpen(false);
      } else if (inputValue) {
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

      if (inputValue) {
        saveRecentSearch(inputValue);
      }

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
        query: effectiveQuery,
        tab: 'noidung',
      });
      onClose();
    },
    [onSelectDocument, effectiveQuery, inputValue, saveRecentSearch, onClose]
  );

  const selectedResult = results[selectedIndex] || null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tìm kiếm nhanh Spotlight LegalBook"
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md flex items-start justify-center pt-[6vh] sm:pt-[11vh] p-3 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white/98 backdrop-blur-2xl rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.35)] border border-slate-200/90 ring-1 ring-black/[0.05] w-full sm:w-[min(960px,calc(100vw-32px))] h-[86vh] sm:h-auto sm:max-h-[min(780px,80vh)] overflow-hidden flex flex-col focus:outline-none transition-all"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* ============================================================
            1. FIXED SEARCH INPUT HEADER (Height 64px, Instant Response)
            ============================================================ */}
        <div className="h-16 px-4 sm:px-6 border-b border-slate-200 flex items-center gap-3 bg-white shrink-0">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results-list"
            aria-activedescendant={selectedResult ? `search-result-${selectedIndex}` : undefined}
            placeholder="Tìm toàn bộ kho pháp luật theo số hiệu, điều khoản, từ khóa..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setSelectedIndex(0);
              setVisibleCount(INITIAL_VISIBLE_COUNT);
            }}
            onInput={(e) => {
              const val = (e.target as HTMLInputElement).value;
              if (val !== inputValue) {
                setInputValue(val);
                setSelectedIndex(0);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }
            }}
            onPaste={(e) => {
              const val = e.clipboardData?.getData('text');
              if (val) {
                setInputValue(val);
                setSelectedIndex(0);
                setVisibleCount(INITIAL_VISIBLE_COUNT);
              }
            }}
            onCompositionEnd={(e) => {
              setInputValue((e.target as HTMLInputElement).value);
              setSelectedIndex(0);
              setVisibleCount(INITIAL_VISIBLE_COUNT);
            }}
            className="flex-1 text-[16px] sm:text-[17px] bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-medium tracking-tight"
          />

          {/* Search Icon / Feedback */}
          {/* Clear Query Button */}
          {inputValue && (
            <button
              onClick={() => {
                setInputValue('');
                inputRef.current?.focus();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              aria-label="Xóa từ khóa tìm kiếm"
              title="Xóa từ khóa"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Spotlight Shortcut Badges */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <kbd className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200/80 rounded-md text-[11px] font-mono text-slate-500 shadow-2xs">
              <span className="text-[11.5px]">⌘</span>K
            </kbd>
            <button
              onClick={onClose}
              className="inline-flex items-center px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-md text-[11px] font-mono text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              aria-label="Đóng tìm kiếm"
              title="Đóng (Esc)"
            >
              esc
            </button>
          </div>
          <button
            onClick={onClose}
            className="sm:hidden px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 active:bg-slate-200 rounded-md transition-colors min-h-[44px] flex items-center cursor-pointer"
            aria-label="Đóng tìm kiếm"
          >
            Đóng
          </button>
        </div>

        {/* ============================================================
            2. SCOPE TABS & COMPACT FILTER BAR
            ============================================================ */}
        <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 py-2 flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Scope Tabs: [Tất cả] [Văn bản] [Điều khoản] */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setScopeFilter('all')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  scopeFilter === 'all'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Tất cả</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                  {scopeCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScopeFilter('document')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  scopeFilter === 'document'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Văn bản</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                  {scopeCounts.document}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setScopeFilter('provision')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  scopeFilter === 'provision'
                    ? 'bg-white text-blue-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Điều khoản</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                  {scopeCounts.provision}
                </span>
              </button>
            </div>

            {/* Right: Filter Toggle Button & Sort */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => setFilterPanelOpen((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFiltersCount > 0 || filterPanelOpen
                    ? 'bg-blue-50 text-blue-900 border-blue-300 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Bộ lọc</span>
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SearchSortOption)}
                  aria-label="Sắp xếp kết quả"
                  className="appearance-none pr-6 pl-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:border-slate-300 focus:outline-none text-xs cursor-pointer"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Đang lọc:
              </span>

              {typeFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100/70 text-blue-900 rounded-md text-[11px] font-medium border border-blue-200">
                  <span>Loại: {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label}</span>
                  <button onClick={() => setTypeFilter('all')} className="hover:text-blue-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {statusFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100/70 text-emerald-900 rounded-md text-[11px] font-medium border border-emerald-200">
                  <span>Hiệu lực: {STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label}</span>
                  <button onClick={() => setStatusFilter('all')} className="hover:text-emerald-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100/70 text-purple-900 rounded-md text-[11px] font-medium border border-purple-200">
                  <span>Chủ đề: {categories.find((c) => c.id === categoryFilter)?.name || categoryFilter}</span>
                  <button onClick={() => setCategoryFilter('all')} className="hover:text-purple-950 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline ml-1 cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          {/* Expandable Filter Panel */}
          {filterPanelOpen && (
            <div
              ref={filterPanelRef}
              className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm mt-1 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in"
            >
              <div>
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block mb-1">
                  Loại văn bản
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as DocumentType | 'all')}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                >
                  {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block mb-1">
                  Trạng thái hiệu lực
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as EffectiveStatusType | 'all')}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10.5px] font-bold text-slate-500 uppercase block mb-1">
                  Chủ đề danh mục
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none truncate"
                >
                  <option value="all">Tất cả chủ đề</option>
                  {categories
                    .filter((c) => !c.parent_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            3. SCROLLABLE RESULTS LIST
            ============================================================ */}
        <div
          ref={resultsContainerRef}
          id="search-results-list"
          role="listbox"
          aria-label="Danh sách kết quả tìm kiếm"
          className="flex-1 overflow-y-auto min-h-0 bg-white divide-y divide-slate-100 pr-0.5 select-text"
        >
          {searchError ? (
            <div className="p-8 text-center text-xs text-red-600 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-red-500" />
              <p className="font-semibold">{searchError}</p>
            </div>
          ) : !effectiveQuery ? (
            /* STATE A: Empty Query — Recent Searches & Suggestions */
            <div className="p-6 sm:p-8 space-y-6">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Tìm kiếm gần đây</span>
                    </h4>
                    <button
                      onClick={() => {
                        setRecentSearches([]);
                        try {
                          localStorage.removeItem(STORAGE_KEY_RECENT);
                        } catch {}
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Xóa lịch sử
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {recentSearches.map((rec) => (
                      <button
                        key={rec}
                        onClick={() => {
                          setInputValue(rec);
                          inputRef.current?.focus();
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-900 hover:border-blue-200 border border-slate-200/80 rounded-lg text-xs font-medium text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <History className="w-3 h-3 text-slate-400" />
                        <span>{rec}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick suggestions */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-600" />
                  <span>Gợi ý tra cứu nhanh</span>
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {QUICK_SEARCH_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      onClick={() => {
                        setInputValue(sug);
                        inputRef.current?.focus();
                      }}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search tips card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                  <span>Mẹo tra cứu chuẩn xác:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-600">
                  <li>
                    Tìm theo số hiệu: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">118/2026/TT-BTC</code> hoặc <code className="bg-white px-1.5 py-0.5 rounded border font-mono">144/2026</code>
                  </li>
                  <li>
                    Tìm theo điều khoản: <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Điều 19</code> hoặc <code className="bg-white px-1.5 py-0.5 rounded border font-mono">Khoản 2 Điều 15</code>
                  </li>
                  <li>
                    Tìm cụm từ chính xác: đặt trong dấu ngoặc kép <code className="bg-white px-1.5 py-0.5 rounded border font-mono">&ldquo;thuế GTGT&rdquo;</code>
                  </li>
                </ul>
              </div>
            </div>
          ) : results.length === 0 ? (
            /* STATE B: No results */
            <div className="py-16 px-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Không tìm thấy văn bản nào khớp với &ldquo;{effectiveQuery}&rdquo;
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Thử tìm theo số hiệu văn bản (VD: 58/2026, 144/2026) hoặc xóa bớt các bộ lọc đang chọn.
                </p>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold rounded-lg text-xs border border-blue-200 transition-colors cursor-pointer"
                >
                  Xóa toàn bộ bộ lọc ({activeFiltersCount})
                </button>
              )}
            </div>
          ) : (
            /* STATE C: Search Results List */
            <>
              {visibleResults.map((item, idx) => (
                <SearchResultCard
                  key={item.id}
                  item={item}
                  index={idx}
                  isSelected={idx === selectedIndex}
                  searchQuery={effectiveQuery}
                  onSelect={handleItemSelect}
                />
              ))}

              {/* Load More Button */}
              {results.length > visibleCount && (
                <div className="p-4 text-center border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={handleLoadMore}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                  >
                    Xem thêm {Math.min(PAGE_SIZE, results.length - visibleCount)} kết quả nữa ({results.length - visibleCount} còn lại)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================
            4. FIXED COMPACT FOOTER (Height 40px)
            ============================================================ */}
        <div className="h-10 px-4 sm:px-6 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between text-xs text-slate-500 shrink-0 select-none backdrop-blur-xs">
          <div className="hidden sm:flex items-center gap-3.5 text-[11.5px]">
            <span className="flex items-center gap-1 text-slate-600">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">↑↓</kbd> Di chuyển
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 text-slate-600">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">↵</kbd> Mở văn bản
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 text-slate-600">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">Ctrl+↵</kbd> Tab mới
            </span>
            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 text-slate-600">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">esc</kbd> Thoát
            </span>
          </div>

          <div className="text-[11.5px] font-medium ml-auto flex items-center gap-2">
            {effectiveQuery ? (
              <span className="text-slate-600">
                Tìm thấy <strong className="text-blue-700 font-bold">{results.length}</strong> kết quả
              </span>
            ) : (
              <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-400" /> Spotlight Search
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
