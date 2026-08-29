'use client';

import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  GitFork,
  GitCompare,
  Columns2,
  ChevronsUp,
  ChevronsDown,
} from 'lucide-react';
import { buildDocumentHierarchy, type HierarchyNode } from '@/lib/hierarchy';
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  getEffectiveStatus,
  formatDate,
} from '@/lib/utils';
import { LegalDiffViewer } from './LegalDiffViewer';
import type { LegalDocument } from '@/types';

interface LegalHierarchyTreeProps {
  document: LegalDocument;
  onSelectDocument: (id: string) => void;
  onAddDispatch?: (parentDoc: LegalDocument) => void;
}

export function LegalHierarchyTree({
  document: doc,
  onSelectDocument,
  onAddDispatch,
}: LegalHierarchyTreeProps) {
  const hierarchy = useMemo(() => buildDocumentHierarchy(doc.id), [doc.id]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([doc.id]));
  const [compareTargetDoc, setCompareTargetDoc] = useState<LegalDocument | null>(null);
  const [relationFilter, setRelationFilter] = useState<string>('all');

  // Count total nodes in tree
  const totalChildrenCount = useMemo(() => {
    let count = 0;
    const countSub = (node: HierarchyNode) => {
      if (node.children) {
        count += node.children.length;
        node.children.forEach(countSub);
      }
    };
    hierarchy.hierarchyTree.forEach(countSub);
    return count;
  }, [hierarchy]);

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const expandAll = () => {
    const all = new Set<string>();
    const collectIds = (node: HierarchyNode) => {
      all.add(node.document.id);
      if (node.children) node.children.forEach(collectIds);
    };
    hierarchy.hierarchyTree.forEach(collectIds);
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const areAllExpanded = expandedNodes.size > 1;

  const getTierBadge = (tier: 1 | 2 | 3 | 4) => {
    switch (tier) {
      case 1:
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            LUẬT / BỘ LUẬT
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            NGHỊ ĐỊNH
          </span>
        );
      case 3:
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
            THÔNG TƯ / QĐ
          </span>
        );
      case 4:
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            CÔNG VĂN
          </span>
        );
    }
  };

  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isCurrent = node.document.id === doc.id;
    const isExpanded = expandedNodes.has(node.document.id) || depth < 1;
    const hasChildren = node.children && node.children.length > 0;
    const effStatus = getEffectiveStatus(node.document);

    // Apply relation type filter if specified
    const filteredChildren = node.children.filter((child) => {
      if (relationFilter === 'all') return true;
      if (relationFilter === 'huong_dan' && (child.tier === 2 || child.tier === 3)) return true;
      if (relationFilter === 'cong_van' && child.tier === 4) return true;
      return true;
    });

    return (
      <div key={node.document.id} className="relative">
        {/* Node card */}
        <div
          className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border transition-all ${
            isCurrent
              ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
          }`}
          style={{ marginLeft: depth > 0 ? `${depth * 16}px` : undefined }}
        >
          {/* Expand/Collapse Toggle Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.document.id)}
              className="mt-0.5 p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label={isExpanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
              title={isExpanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <span className="w-4 mt-0.5 shrink-0" />
          )}

          {/* Card Content Area */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Row 1: Badges + Document Number + Status */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {getTierBadge(node.tier)}
                <span className="font-mono text-xs font-bold text-slate-900">
                  {node.document.document_number}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                    DOCUMENT_STATUS_COLORS[effStatus]
                  }`}
                >
                  {DOCUMENT_STATUS_LABELS[effStatus]}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-blue-700 text-white font-bold px-1.5 py-0.2 rounded tracking-wide">
                    ĐANG ĐỌC
                  </span>
                )}
              </div>

              {/* Action Buttons: Compare diff & Add dispatch */}
              <div className="flex items-center gap-1.5 shrink-0">
                {!isCurrent && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompareTargetDoc(node.document);
                    }}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={
                      doc.document_type === 'luat' && node.document.document_type !== 'luat'
                        ? `Đối chiếu điều khoản quy định chi tiết với ${node.document.document_number}`
                        : `So sánh điều khoản sửa đổi với ${node.document.document_number}`
                    }
                  >
                    {doc.document_type === 'luat' && node.document.document_type !== 'luat' ? (
                      <>
                        <Columns2 className="w-3 h-3 text-purple-600" />
                        <span>Đối chiếu</span>
                      </>
                    ) : (
                      <>
                        <GitCompare className="w-3 h-3 text-blue-600" />
                        <span>So sánh</span>
                      </>
                    )}
                  </button>
                )}

                {onAddDispatch && node.tier <= 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddDispatch(node.document);
                    }}
                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title={`Gắn công văn vào ${node.document.document_number}`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Công văn</span>
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Title */}
            <button
              onClick={() => onSelectDocument(node.document.id)}
              className="text-xs sm:text-[13.5px] font-semibold text-slate-900 hover:text-blue-700 text-left line-clamp-2 transition-colors block w-full leading-snug cursor-pointer"
            >
              {node.document.title}
            </button>

            {/* Row 3: Relation notes tag if present */}
            {node.relationNotes && (
              <div className="pt-0.5">
                <span className="text-[11px] font-medium text-blue-800 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100/80 inline-block">
                  ↳ {node.relationNotes}
                </span>
              </div>
            )}

            {/* Row 4: Issuing body & Effective date */}
            <div className="flex items-center gap-2.5 text-[11px] text-slate-500 pt-0.5">
              <span>{node.document.issuing_body || 'Cơ quan nhà nước'}</span>
              <span>•</span>
              <span>Hiệu lực: {formatDate(node.document.effective_date)}</span>
            </div>
          </div>
        </div>

        {/* Vertical tree connector for children */}
        {hasChildren && isExpanded && filteredChildren.length > 0 && (
          <div className="space-y-3 mt-3 border-l-2 border-slate-200 ml-6 pl-3 sm:pl-4">
            {filteredChildren.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Compare Diff Modal */}
      {compareTargetDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden">
            <LegalDiffViewer
              documentA={doc}
              documentB={compareTargetDoc}
              relationType={doc.document_type === 'luat' ? 'huong_dan' : undefined}
              onClose={() => setCompareTargetDoc(null)}
              onSelectDocument={onSelectDocument}
            />
          </div>
        </div>
      )}

      {/* 1. Compact Header Summary & Filter Bar (Height ~40px) */}
      <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-blue-700" />
          <span className="font-bold text-slate-900">
            {totalChildrenCount > 0 ? `${totalChildrenCount} văn bản liên kết trong cây phả hệ` : 'Cây phả hệ quan hệ văn bản'}
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Quick Filter */}
          <div className="relative">
            <select
              value={relationFilter}
              onChange={(e) => setRelationFilter(e.target.value)}
              className="appearance-none pr-6 pl-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả liên kết</option>
              <option value="huong_dan">Nghị định & Thông tư hướng dẫn</option>
              <option value="cong_van">Công văn hướng dẫn</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Expand / Collapse All */}
          {totalChildrenCount > 0 && (
            <button
              onClick={areAllExpanded ? collapseAll : expandAll}
              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
              title={areAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
            >
              {areAllExpanded ? (
                <>
                  <ChevronsUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Thu gọn</span>
                </>
              ) : (
                <>
                  <ChevronsDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mở rộng</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 2. Hierarchical Tree Canvas */}
      <div className="space-y-3">
        {hierarchy.hierarchyTree.map((rootNode) => renderNode(rootNode, 0))}
      </div>
    </div>
  );
}
