'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { LegalDocument } from '@/types';
import { Columns2, X, Search, BookOpen, ArrowUpDown, ChevronRight } from 'lucide-react';
import { formatShortTitle } from '@/lib/utils';
import { HTMLViewer } from './HTMLViewer';

interface DualCompareSplitViewProps {
  documentA: LegalDocument;
  allDocuments: LegalDocument[];
  onClose: () => void;
  onSelectDocumentA?: (docId: string) => void;
}

export function DualCompareSplitView({
  documentA,
  allDocuments,
  onClose,
  onSelectDocumentA,
}: DualCompareSplitViewProps) {
  // Select secondary document
  const [selectedDocB, setSelectedDocB] = useState<LegalDocument | null>(() => {
    // Auto-suggest related document
    // If docA is dispatch mentioning 132/2020, default to 132/2020
    const html = (documentA.html_content || '').toLowerCase();
    if (html.includes('132/2020')) {
      const match = allDocuments.find((d) => d.document_number?.includes('132/2020'));
      if (match) return match;
    }
    if (html.includes('125/2020')) {
      const match = allDocuments.find((d) => d.document_number?.includes('125/2020'));
      if (match) return match;
    }
    if (html.includes('123/2020')) {
      const match = allDocuments.find((d) => d.document_number?.includes('123/2020'));
      if (match) return match;
    }
    // Default to first decree or circular different from docA
    return allDocuments.find((d) => d.id !== documentA.id && (d.document_type === 'nghi_dinh' || d.document_type === 'luat')) || null;
  });

  const [searchQueryB, setSearchQueryB] = useState('');
  const [isSelectingDocB, setIsSelectingDocB] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  // References for synchronized scroll
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  // Filter available documents for side B
  const filteredCandidatesB = useMemo(() => {
    const q = searchQueryB.toLowerCase().trim();
    if (!q) return allDocuments.filter((d) => d.id !== documentA.id).slice(0, 15);
    return allDocuments.filter((d) => {
      if (d.id === documentA.id) return false;
      return (
        d.document_number?.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q)
      );
    }).slice(0, 20);
  }, [allDocuments, documentA.id, searchQueryB]);

  // Sync scroll handler
  const handleScroll = (source: 'left' | 'right') => {
    if (!syncScroll || isSyncingRef.current) return;
    isSyncingRef.current = true;

    const sourceEl = source === 'left' ? leftColRef.current : rightColRef.current;
    const targetEl = source === 'left' ? rightColRef.current : leftColRef.current;

    if (sourceEl && targetEl) {
      const scrollPercent = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight || 1);
      targetEl.scrollTop = scrollPercent * (targetEl.scrollHeight - targetEl.clientHeight);
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 50);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100 overflow-hidden min-w-0">
      {/* Top Split-View Control Bar */}
      <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between shrink-0 shadow-md z-20">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400">
            <Columns2 className="w-4 h-4 text-blue-400" />
            Đọc Đối Chiếu Song Song (50% - 50%)
          </span>
          <span className="text-slate-400 text-xs hidden md:inline">|</span>
          <button
            type="button"
            onClick={() => setSyncScroll(!syncScroll)}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              syncScroll
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Đồng bộ cuộn trang giữa 2 văn bản"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Cuộn đồng bộ: {syncScroll ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Thoát đối chiếu</span>
          </button>
        </div>
      </div>

      {/* Main Split Grid (50% / 50%) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-300">
        {/* LEFT COLUMN: DOCUMENT A */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden min-w-0 shadow-xs">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold shrink-0">
                GỐC (A)
              </span>
              <span className="font-bold text-slate-800 truncate" title={documentA.title}>
                {documentA.document_number} — {documentA.title}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 shrink-0 ml-2">
              {documentA.issued_date || 'Chính thức'}
            </span>
          </div>

          <div
            ref={leftColRef}
            onScroll={() => handleScroll('left')}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white"
          >
            <div className="max-w-3xl mx-auto">
              <HTMLViewer
                document={documentA}
                fontSize={15}
                searchQuery=""
                showOutline={false}
                allDocuments={allDocuments}
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCUMENT B */}
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden min-w-0 shadow-xs relative">
          <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold shrink-0">
                ĐỐI CHIẾU (B)
              </span>
              {selectedDocB ? (
                <span className="font-bold text-slate-800 truncate" title={selectedDocB.title}>
                  {selectedDocB.document_number} — {selectedDocB.title}
                </span>
              ) : (
                <span className="italic text-slate-400">Chưa chọn văn bản đối chiếu</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsSelectingDocB(!isSelectingDocB)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-300 rounded font-semibold text-xs transition-colors shrink-0 ml-2 flex items-center gap-1 cursor-pointer"
            >
              <Search className="w-3 h-3" />
              <span>{isSelectingDocB ? 'Đóng chọn' : 'Đổi văn bản B'}</span>
            </button>
          </div>

          {/* Document B Selector Overlay */}
          {isSelectingDocB && (
            <div className="absolute top-10 left-0 right-0 z-30 bg-white border-b border-slate-300 shadow-xl p-3 animate-in fade-in duration-100">
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQueryB}
                  onChange={(e) => setSearchQueryB(e.target.value)}
                  placeholder="Gõ số hiệu (132/2020, 125/2020...) hoặc tên văn bản..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                {filteredCandidatesB.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDocB(doc);
                      setIsSelectingDocB(false);
                      setSearchQueryB('');
                    }}
                    className="w-full text-left p-2 hover:bg-blue-50/80 flex items-start justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {doc.document_number} — {doc.title}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{doc.issuing_body}</p>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            ref={rightColRef}
            onScroll={() => handleScroll('right')}
            className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white"
          >
            {selectedDocB ? (
              <div className="max-w-3xl mx-auto">
                <HTMLViewer
                  document={selectedDocB}
                  fontSize={15}
                  searchQuery=""
                  showOutline={false}
                  allDocuments={allDocuments}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                <BookOpen className="w-8 h-8 text-slate-300" />
                <p className="text-xs">Vui lòng chọn một văn bản để bắt đầu đối chiếu song song</p>
                <button
                  type="button"
                  onClick={() => setIsSelectingDocB(true)}
                  className="px-3 py-1.5 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700"
                >
                  Chọn văn bản đối chiếu
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
