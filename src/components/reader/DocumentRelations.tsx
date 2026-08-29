'use client';

import { X, GitFork, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { getDocumentRelations, getDocumentById } from '@/lib/demo-data';
import { RELATION_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS } from '@/lib/utils';
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

  return (
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
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200"
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
  );
}

function RelationCard({
  relationType,
  notes,
  doc,
  onSelect,
  isInverse,
}: {
  relationType: keyof typeof RELATION_TYPE_LABELS;
  notes: string | null;
  doc: LegalDocument;
  onSelect: () => void;
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
      className="p-2.5 rounded-md border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all bg-white"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
          {getRelationBadge()}
        </span>
        <span className={`text-[9px] px-1.5 py-0.2 rounded border ${DOCUMENT_STATUS_COLORS[doc.status]}`}>
          {DOCUMENT_STATUS_LABELS[doc.status]}
        </span>
      </div>

      <p className="font-mono text-[11px] font-semibold text-gray-900 mb-0.5">
        {doc.document_number || '---'}
      </p>
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
