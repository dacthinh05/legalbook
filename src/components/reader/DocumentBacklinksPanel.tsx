'use client';

import React, { useState, useMemo } from 'react';
import {
  Link2,
  Search,
  ExternalLink,
  ChevronRight,
  GitFork,
  FileText,
  Sparkles,
  AlertCircle,
  Clock,
  BookOpen,
  Plus,
} from 'lucide-react';
import type { LegalDocument, DocumentRelation } from '@/types';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  formatDate,
  getEffectiveStatus,
  cn,
} from '@/lib/utils';
import { buildDocumentHierarchy, type HierarchyNode } from '@/lib/hierarchy';
import { DEMO_RELATIONS } from '@/lib/demo-data';

interface DocumentBacklinksPanelProps {
  document: LegalDocument;
  allDocuments: LegalDocument[];
  onSelectDocument: (id: string, targetNodeId?: string) => void;
  onOpenDiff?: (docA: LegalDocument, docB: LegalDocument) => void;
}

export function DocumentBacklinksPanel({
  document: doc,
  allDocuments,
  onSelectDocument,
  onOpenDiff,
}: DocumentBacklinksPanelProps) {
  const [activeTab, setActiveTab] = useState<'linked' | 'unlinked'>('linked');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Linked Backlinks (Official relations in hierarchy & relations graph)
  const linkedBacklinks = useMemo(() => {
    const hierarchy = buildDocumentHierarchy(doc.id);
    const results: Array<{
      doc: LegalDocument;
      relationType: string;
      relationLabel: string;
      notes?: string;
    }> = [];

    const seenIds = new Set<string>([doc.id]);

    // Check relations where target is doc.id
    DEMO_RELATIONS.forEach((r) => {
      if (r.target_document_id === doc.id && !seenIds.has(r.source_document_id)) {
        const srcDoc = allDocuments.find((d) => d.id === r.source_document_id);
        if (srcDoc) {
          seenIds.add(srcDoc.id);
          const label =
            r.relation_type === 'huong_dan'
              ? 'Hướng dẫn thi hành'
              : r.relation_type === 'sua_doi'
              ? 'Sửa đổi / Bổ sung'
              : r.relation_type === 'thay_the'
              ? 'Thay thế văn bản'
              : 'Dẫn chiếu nghiệp vụ';

          results.push({
            doc: srcDoc,
            relationType: r.relation_type,
            relationLabel: label,
            notes: (r as unknown as { notes?: string }).notes || '',
          });
        }
      }
    });

    // Check children in hierarchy tree
    const collectChildren = (node: HierarchyNode) => {
      if (node.document.id !== doc.id && !seenIds.has(node.document.id)) {
        seenIds.add(node.document.id);
        results.push({
          doc: node.document,
          relationType: 'huong_dan',
          relationLabel: node.document.document_type === 'cong_van' ? 'Giải đáp công văn' : 'Văn bản hướng dẫn',
          notes: node.relationNotes || undefined,
        });
      }
      if (node.children) {
        node.children.forEach(collectChildren);
      }
    };

    hierarchy.hierarchyTree.forEach(collectChildren);

    return results;
  }, [doc.id, allDocuments]);

  // 2. Unlinked Mentions (Occurrences of document number in other documents)
  const unlinkedMentions = useMemo(() => {
    const docNum = (doc.document_number || '').trim().toLowerCase();
    if (!docNum || docNum.length < 3) return [];

    const linkedDocIds = new Set(linkedBacklinks.map((b) => b.doc.id));
    linkedDocIds.add(doc.id);

    const mentions: Array<{
      doc: LegalDocument;
      snippet: string;
      matchCount: number;
    }> = [];

    for (const otherDoc of allDocuments) {
      if (linkedDocIds.has(otherDoc.id)) continue;

      const bodyText = (otherDoc.html_content || '').replace(/<[^>]+>/g, ' ');
      const summaryText = otherDoc.summary_main || '';
      const fullText = `${summaryText} ${bodyText}`.toLowerCase();

      const index = fullText.indexOf(docNum);
      if (index !== -1) {
        // Extract surrounding context snippet
        const start = Math.max(0, index - 80);
        const end = Math.min(fullText.length, index + docNum.length + 100);
        const snippet = '...' + fullText.slice(start, end).replace(/\s+/g, ' ') + '...';

        // Count occurrences
        const matches = (fullText.match(new RegExp(docNum.replace(/[\/\-\.]/g, '[\\/\\-\\.]'), 'g')) || []).length;

        mentions.push({
          doc: otherDoc,
          snippet,
          matchCount: matches || 1,
        });
      }
    }

    return mentions;
  }, [doc, allDocuments, linkedBacklinks]);

  const filteredLinked = useMemo(() => {
    if (!searchTerm.trim()) return linkedBacklinks;
    const q = searchTerm.toLowerCase();
    return linkedBacklinks.filter(
      (b) =>
        b.doc.title.toLowerCase().includes(q) ||
        (b.doc.document_number || '').toLowerCase().includes(q) ||
        b.relationLabel.toLowerCase().includes(q)
    );
  }, [linkedBacklinks, searchTerm]);

  const filteredUnlinked = useMemo(() => {
    if (!searchTerm.trim()) return unlinkedMentions;
    const q = searchTerm.toLowerCase();
    return unlinkedMentions.filter(
      (m) =>
        m.doc.title.toLowerCase().includes(q) ||
        (m.doc.document_number || '').toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q)
    );
  }, [unlinkedMentions, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 text-xs overflow-hidden select-text">
      {/* ── Top Tabs Bar ── */}
      <div className="p-2.5 bg-white border-b border-slate-200 space-y-2">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg font-semibold text-[11px]">
          <button
            type="button"
            onClick={() => setActiveTab('linked')}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              activeTab === 'linked' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Link2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Dẫn chiếu ({linkedBacklinks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('unlinked')}
            className={cn(
              'flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              activeTab === 'unlinked' ? 'bg-white text-purple-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Nhắc đến ({unlinkedMentions.length})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Lọc danh sách dẫn chiếu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Content List ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
        {activeTab === 'linked' ? (
          filteredLinked.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-1.5">
              <Link2 className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-xs">Chưa có liên kết ngược chính thức</p>
              <p className="text-[11px] leading-relaxed">
                Chưa có Nghị định, Thông tư hay Công văn nào trong thư viện thiết lập quan hệ dẫn chiếu đến văn bản này.
              </p>
            </div>
          ) : (
            filteredLinked.map((item) => {
              const effStatus = getEffectiveStatus(item.doc);
              return (
                <div
                  key={item.doc.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all space-y-1.5 group"
                >
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-bold font-mono rounded text-[10px] border border-blue-200">
                      {item.doc.document_number || '---'}
                    </span>
                    <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 font-semibold rounded text-[9.5px] border border-purple-200">
                      {item.relationLabel}
                    </span>
                  </div>

                  <h5
                    onClick={() => onSelectDocument(item.doc.id)}
                    className="font-bold text-slate-900 text-xs leading-snug hover:text-blue-600 transition-colors cursor-pointer line-clamp-2"
                  >
                    {item.doc.title}
                  </h5>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 line-clamp-2 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                      {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px] text-slate-400">
                    <span>{formatDate(item.doc.issued_date)}</span>
                    <div className="flex items-center gap-1.5">
                      {onOpenDiff && (
                        <button
                          type="button"
                          onClick={() => onOpenDiff(doc, item.doc)}
                          className="text-slate-500 hover:text-blue-700 font-medium"
                          title="Đối chiếu 2 văn bản"
                        >
                          Đối chiếu
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectDocument(item.doc.id)}
                        className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>Mở</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredUnlinked.length === 0 ? (
            <div className="p-6 text-center text-slate-400 space-y-1.5">
              <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-xs">Không có văn bản nhắc đến</p>
              <p className="text-[11px] leading-relaxed">
                Không tìm thấy số hiệu <strong>{doc.document_number}</strong> trong nội dung của các văn bản khác trong kho.
              </p>
            </div>
          ) : (
            filteredUnlinked.map((mention) => (
              <div
                key={mention.doc.id}
                className="p-3 bg-white rounded-xl border border-purple-200/80 hover:border-purple-400 hover:shadow-xs transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-900 font-bold font-mono rounded text-[10px] border border-purple-200">
                    {mention.doc.document_number || '---'}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    {mention.matchCount} lần nhắc
                  </span>
                </div>

                <h5
                  onClick={() => onSelectDocument(mention.doc.id)}
                  className="font-bold text-slate-900 text-xs leading-snug hover:text-purple-700 transition-colors cursor-pointer line-clamp-2"
                >
                  {mention.doc.title}
                </h5>

                {/* Excerpt snippet with highlight */}
                <div className="p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 font-serif leading-relaxed border border-slate-100">
                  {mention.snippet}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px]">
                  <span className="text-slate-400">{formatDate(mention.doc.issued_date)}</span>
                  <button
                    type="button"
                    onClick={() => onSelectDocument(mention.doc.id)}
                    className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Xem đoạn trích</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
