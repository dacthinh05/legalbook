'use client';

import React, { useState } from 'react';
import { X, GitFork, ArrowUpRight, ArrowDownLeft, Columns2, GitCompare } from 'lucide-react';
import { getDocumentRelations, getDocumentById } from '@/lib/demo-data';
import { RELATION_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, getEffectiveStatus } from '@/lib/utils';
import { LegalDiffViewer } from './LegalDiffViewer';
import type { LegalDocument, RelationType } from '@/types';

interface DocumentRelationsProps {
  document: LegalDocument;
  onSelectDocument: (id: string) => void;
  onClose: () => void;
}

export function DocumentRelations({
  document: doc,
  onSelectDocument,
  onClose,
}: DocumentRelationsProps) {
  const relations = getDocumentRelations(doc.id);
  const targets = relations.as_source;
  const sources = relations.as_target;
  const hasAnyRelations = targets.length > 0 || sources.length > 0;
  const [compareDoc, setCompareDoc] = useState<{ doc: LegalDocument; relationType?: string } | null>(null);

  return (
    <>
      {compareDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="w-full max-w-5xl h-[85vh] bg-white rounded-xl shadow-2xl overflow-hidden">
            <LegalDiffViewer
              documentA={doc}
              documentB={compareDoc.doc}
              relationType={compareDoc.relationType}
              onClose={() => setCompareDoc(null)}
              onSelectDocument={onSelectDocument}
            />
          </div>
        </div>
      )}
      <div className="w-80 md:w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-lg animate-slide-in flex-shrink-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Quan hệ văn bản
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 cursor-pointer"
            title="Đóng panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {!hasAnyRelations ? (
            <div className="text-center py-12 text-gray-400">
              <GitFork className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>Chưa có thông tin liên kết pháp lý cho văn bản này</p>
            </div>
          ) : (
            <>
              {/* Relates as Source (This document points to others) */}
              {targets.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                    Văn bản này quy định / liên quan tới:
                  </h4>
                  <div className="space-y-2">
                    {targets.map((rel, idx) => {
                      const targetDoc = getDocumentById(rel.target_document_id);
                      if (!targetDoc) return null;
                      return (
                        <RelationCard
                          key={idx}
                          relationType={rel.relation_type as RelationType}
                          notes={rel.notes}
                          doc={targetDoc as LegalDocument}
                          onSelect={() => onSelectDocument(targetDoc.id!)}
                          onCompare={() => setCompareDoc({ doc: targetDoc as LegalDocument, relationType: rel.relation_type })}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Relates as Target (Other documents point to this) */}
              {sources.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                    Văn bản hướng dẫn / sửa đổi văn bản này:
                  </h4>
                  <div className="space-y-2">
                    {sources.map((rel, idx) => {
                      const srcDoc = getDocumentById(rel.source_document_id);
                      if (!srcDoc) return null;
                      return (
                        <RelationCard
                          key={idx}
                          relationType={rel.relation_type as RelationType}
                          notes={rel.notes}
                          doc={srcDoc as LegalDocument}
                          onSelect={() => onSelectDocument(srcDoc.id!)}
                          onCompare={() => setCompareDoc({ doc: srcDoc as LegalDocument, relationType: rel.relation_type })}
                          isInverse
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function RelationCard({
  relationType,
  notes,
  doc,
  onSelect,
  onCompare,
  isInverse,
}: {
  relationType: keyof typeof RELATION_TYPE_LABELS;
  notes: string | null;
  doc: LegalDocument;
  onSelect: () => void;
  onCompare?: () => void;
  isInverse?: boolean;
}) {
  const getRelationBadge = () => {
    switch (relationType) {
      case 'huong_dan':
        return isInverse ? 'Được hướng dẫn bởi' : 'Hướng dẫn thi hành';
      case 'sua_doi':
        return isInverse ? 'Được sửa đổi bởi' : 'Sửa đổi, bổ sung';
      case 'thay_the':
        return isInverse ? 'Được thay thế bởi' : 'Thay thế văn bản';
      case 'can_cu':
        return isInverse ? 'Căn cứ ban hành' : 'Căn cứ pháp lý';
      default:
        return RELATION_TYPE_LABELS[relationType] || 'Liên quan';
    }
  };

  return (
    <div
      onClick={onSelect}
      className="p-2.5 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all bg-white group"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
          {getRelationBadge()}
        </span>
        {(() => {
          const effStatus = getEffectiveStatus(doc);
          return (
            <span className={`text-[9px] px-1.5 py-0.2 rounded border ${DOCUMENT_STATUS_COLORS[effStatus]}`}>
              {DOCUMENT_STATUS_LABELS[effStatus]}
            </span>
          );
        })()}
      </div>

      <div className="flex items-center justify-between gap-1 mb-0.5">
        <p className="font-mono text-[11px] font-semibold text-gray-900 truncate">
          {doc.document_number || '---'}
        </p>
        {onCompare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCompare();
            }}
            className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title={relationType === 'huong_dan' || relationType === 'can_cu' ? 'Đối chiếu điều khoản quy định chi tiết' : 'So sánh điều khoản sửa đổi'}
          >
            {relationType === 'huong_dan' || relationType === 'can_cu' ? (
              <>
                <Columns2 className="w-2.5 h-2.5 text-purple-600" />
                <span>Đối chiếu</span>
              </>
            ) : (
              <>
                <GitCompare className="w-2.5 h-2.5 text-blue-600" />
                <span>So sánh</span>
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-700 line-clamp-2 leading-tight">
        {doc.title}
      </p>

      {notes && (
        <p className="text-[10px] text-gray-400 italic mt-1 border-t border-gray-100 pt-1">
          Ghi chú: {notes}
        </p>
      )}
    </div>
  );
}
