'use client';

import React, { useState, useMemo } from 'react';
import { Search, FileText, ChevronDown, ChevronLeft, X } from 'lucide-react';
import { DocumentCard } from './DocumentCard';
import { matchesDocumentQuery } from '@/lib/search';
import type { LegalDocument, DocumentType } from '@/types';

interface DocumentListProps {
  documents: LegalDocument[];
  selectedDocumentId: string | null;
  onSelectDocument: (id: string) => void;
  categoryName?: string;
  selectedDocType?: DocumentType | null;
  bookmarkedDocuments?: Set<string>;
  onCollapse?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Trạng thái' },
  { value: 'hieu_luc', label: 'Đang hiệu lực' },
  { value: 'chua_hieu_luc', label: 'Sắp hiệu lực' },
  { value: 'het_hieu_luc_mot_phan', label: 'Đổi hiệu lực' },
  { value: 'het_hieu_luc_toan_bo', label: 'Hết hiệu lực' },
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'Loại VB' },
  { value: 'luat', label: 'Luật / Bộ luật' },
  { value: 'nghi_dinh', label: 'Nghị định' },
  { value: 'thong_tu', label: 'Thông tư' },
  { value: 'cong_van', label: 'Công văn' },
  { value: 'quyet_dinh', label: 'Quyết định' },
  { value: 'khac', label: 'Khác' },
];

const UNIFIED_SORT_OPTIONS = [
  { value: 'effective_date:desc', label: 'HL: Mới → Cũ' },
  { value: 'effective_date:asc', label: 'HL: Cũ → Mới' },
  { value: 'issued_date:desc', label: 'BH: Mới → Cũ' },
  { value: 'issued_date:asc', label: 'BH: Cũ → Mới' },
  { value: 'title:asc', label: 'Tên A → Z' },
];

function FilterSelect({
  value,
  onChange,
  options,
  id,
  label,
  isFiltered,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  id: string;
  label: string;
  isFiltered?: boolean;
}) {
  const active = isFiltered ?? value !== 'all';
  const selectedOption = options.find((o) => o.value === value);
  return (
    <div className="relative flex-1 min-w-0" title={selectedOption ? `${label}: ${selectedOption.label}` : label}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`
          w-full min-w-0 appearance-none pl-2 pr-4 py-1
          border rounded text-[11px] font-medium cursor-pointer
          focus:outline-none focus:ring-1 focus:ring-blue-500
          transition-colors truncate
          ${
            active
              ? 'bg-blue-50 border-blue-300 text-blue-800'
              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
          }
        `}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 shrink-0"
        aria-hidden="true"
      />
    </div>
  );
}

export function DocumentList({
  documents,
  selectedDocumentId,
  onSelectDocument,
  categoryName,
  selectedDocType,
  bookmarkedDocuments,
  onCollapse,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [issuerFilter, setIssuerFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('effective_date:desc');

  // Check if all documents in the active scope share a single document type
  const isSingleType = useMemo(() => {
    if (selectedDocType) return true;
    if (documents.length === 0) return false;
    const firstType = documents[0].document_type;
    return documents.every((d) => d.document_type === firstType);
  }, [documents, selectedDocType]);

  // Dynamic Issuing Body Options when type filter is not needed
  const issuerOptions = useMemo(() => {
    const issuers = Array.from(new Set(documents.map((d) => d.issuing_body).filter(Boolean))) as string[];
    issuers.sort();
    return [
      { value: 'all', label: 'Cơ quan' },
      ...issuers.map((i) => ({ value: i, label: i })),
    ];
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        if (searchQuery.trim() && !matchesDocumentQuery(doc, searchQuery)) {
          return false;
        }
        if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
        if (!isSingleType && typeFilter !== 'all' && doc.document_type !== typeFilter) return false;
        if (isSingleType && issuerFilter !== 'all' && doc.issuing_body !== issuerFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const [field, dir] = sortKey.split(':');
        const valA = String(a[field as keyof LegalDocument] || '');
        const valB = String(b[field as keyof LegalDocument] || '');
        if (dir === 'desc') return valA < valB ? 1 : valA > valB ? -1 : 0;
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      });
  }, [documents, searchQuery, statusFilter, isSingleType, typeFilter, issuerFilter, sortKey]);

  const totalCount = filteredDocuments.length;
  const hasActiveFilter =
    statusFilter !== 'all' ||
    (!isSingleType && typeFilter !== 'all') ||
    (isSingleType && issuerFilter !== 'all') ||
    searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setIssuerFilter('all');
    setSearchQuery('');
  };

  // Clean title without redundant "Loại:" prefix
  const displayCategoryTitle = useMemo(() => {
    if (!categoryName) return 'Tất cả văn bản';
    return categoryName.replace(/^Loại:\s*/i, '').trim();
  }, [categoryName]);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden text-xs">
      {/* ── 3-Row Compact Filter Header ── */}
      <div className="shrink-0 border-b border-slate-200 bg-white p-2.5 space-y-2">
        {/* Row 1: Title & count */}
        <div className="flex items-baseline justify-between gap-2">
          <h2
            className="font-bold text-xs text-slate-900 truncate leading-tight"
            title={displayCategoryTitle}
          >
            {displayCategoryTitle}
          </h2>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-500 font-mono shrink-0 font-semibold">
              {totalCount} văn bản
            </span>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                title="Ẩn danh sách văn bản ( ] )"
                aria-label="Ẩn danh sách văn bản"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search input */}
        <div className="relative">
          <Search
            className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số hiệu, tên..."
            aria-label="Tìm kiếm trong danh sách"
            className="w-full pl-7 pr-6 py-1 bg-slate-50 border border-slate-200 rounded text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Row 3: Filter & Sort dropdowns */}
        <div className="flex items-center gap-1.5">
          <FilterSelect
            id="dl-status-filter"
            label="Trạng thái"
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
          />
          {isSingleType ? (
            <FilterSelect
              id="dl-issuer-filter"
              label="Cơ quan"
              value={issuerFilter}
              onChange={setIssuerFilter}
              options={issuerOptions}
            />
          ) : (
            <FilterSelect
              id="dl-type-filter"
              label="Loại VB"
              value={typeFilter}
              onChange={setTypeFilter}
              options={TYPE_OPTIONS}
            />
          )}
          <FilterSelect
            id="dl-sort-select"
            label="Sắp xếp"
            value={sortKey}
            onChange={setSortKey}
            options={UNIFIED_SORT_OPTIONS}
            isFiltered={sortKey !== 'effective_date:desc'}
          />
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="p-1 text-[11px] text-rose-600 hover:bg-rose-50 rounded cursor-pointer shrink-0"
              title="Xóa bộ lọc"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Document List Items ── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-1">
            <FileText className="w-6 h-6 mx-auto text-slate-300" aria-hidden="true" />
            <p className="font-medium text-xs">Không tìm thấy văn bản</p>
            {hasActiveFilter && (
              <button
                onClick={clearAllFilters}
                className="mt-2 text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedDocumentId === doc.id}
              isBookmarked={bookmarkedDocuments?.has(doc.id) || false}
              hideTypeBadge={isSingleType}
              onSelect={() => onSelectDocument(doc.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
