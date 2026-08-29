'use client';

import { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Layers
} from 'lucide-react';
import { buildDocumentHierarchy, type HierarchyNode } from '@/lib/hierarchy';
import { DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, getEffectiveStatus, formatDate } from '@/lib/utils';
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
  const hierarchy = buildDocumentHierarchy(doc.id);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([doc.id]));

  const toggleNode = (id: string) => {
    const next = new Set(expandedNodes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedNodes(next);
  };

  const getTierBadge = (tier: 1 | 2 | 3 | 4) => {
    switch (tier) {
      case 1:
        return (
          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-semibold rounded border border-red-200">
            Luật / Bộ luật
          </span>
        );
      case 2:
        return (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-semibold rounded border border-blue-200">
            Nghị định
          </span>
        );
      case 3:
        return (
          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-semibold rounded border border-purple-200">
            Thông tư
          </span>
        );
      case 4:
        return (
          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-semibold rounded border border-amber-200">
            Công văn
          </span>
        );
    }
  };

  const renderNode = (node: HierarchyNode, depth: number = 0) => {
    const isCurrent = node.document.id === doc.id;
    const isExpanded = expandedNodes.has(node.document.id) || depth < 2;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.document.id} className="relative">
        {/* Node card */}
        <div
          className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all ${
            isCurrent
              ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
              : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-gray-50/60'
          }`}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleNode(node.document.id)}
              className="mt-0.5 p-0.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-200"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 mt-0.5 shrink-0" />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {getTierBadge(node.tier)}
              <span className="font-mono text-[11px] font-bold text-gray-800">
                {node.document.document_number}
              </span>
              {(() => {
                const effStatus = getEffectiveStatus(node.document);
                return (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                      DOCUMENT_STATUS_COLORS[effStatus]
                    }`}
                  >
                    {DOCUMENT_STATUS_LABELS[effStatus]}
                  </span>
                );
              })()}
              {isCurrent && (
                <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                  ĐANG ĐỌC
                </span>
              )}
            </div>

            <button
              onClick={() => onSelectDocument(node.document.id)}
              className="text-xs font-semibold text-gray-900 hover:text-blue-600 text-left line-clamp-2 transition-colors block w-full"
            >
              {node.document.title}
            </button>

            {node.relationNotes && (
              <p className="text-[11px] text-gray-500 italic">
                ↳ {node.relationNotes}
              </p>
            )}

            <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5">
              <span>{node.document.issuing_body}</span>
              <span>•</span>
              <span>Hiệu lực: {formatDate(node.document.effective_date)}</span>
            </div>
          </div>

          {/* Quick Action: Add Dispatch under this node */}
          {onAddDispatch && node.tier <= 3 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddDispatch(node.document);
              }}
              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[10px] font-semibold flex items-center gap-1 shrink-0 transition-colors"
              title={`Gắn công văn vào ${node.document.document_number}`}
            >
              <Plus className="w-3 h-3" />
              Bỏ công văn vào
            </button>
          )}
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="space-y-2 mt-2 border-l-2 border-dashed border-gray-200 ml-4 pl-1">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Clean Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Quan hệ & Cây phân cấp pháp lý</span>
        </h3>
        {onAddDispatch && (
          <button
            onClick={() => onAddDispatch(doc)}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm công văn liên quan</span>
          </button>
        )}
      </div>

      {/* Tree list */}
      <div className="space-y-3">
        {hierarchy.hierarchyTree.map((rootNode) => renderNode(rootNode, 0))}
      </div>
    </div>
  );
}
