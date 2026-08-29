'use client';

import React, { useState } from 'react';
import {
  GitFork,
  ArrowRight,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Edit3,
  Filter,
  ShieldCheck,
  RotateCw,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Layers,
  ArrowLeftRight,
  X,
  Check,
} from 'lucide-react';
import type { RelationshipVerificationItem } from '@/lib/verification/types';
import type { LegalRelationshipType } from '@/lib/legal-engine/types';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';

interface RelationshipVerificationTabProps {
  relationships: RelationshipVerificationItem[];
  onVerifyRelationship: (id: string, notes?: string, modifiedData?: Partial<RelationshipVerificationItem>) => void;
  onRejectRelationship: (id: string, reason: string) => void;
  onSwapDirection: (id: string) => void;
}

export function RelationshipVerificationTab({
  relationships,
  onVerifyRelationship,
  onRejectRelationship,
  onSwapDirection,
}: RelationshipVerificationTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRelId, setSelectedRelId] = useState<string>(relationships[0]?.id || '');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [editingType, setEditingType] = useState<LegalRelationshipType | null>(null);
  const [showDualDocModal, setShowDualDocModal] = useState<boolean>(false);

  const filteredRels = relationships.filter((r) => {
    if (statusFilter === 'all') return true;
    return r.review_status === statusFilter;
  });

  const selectedRel = relationships.find((r) => r.id === selectedRelId) || filteredRels[0] || null;

  const handleVerify = () => {
    if (!selectedRel) return;
    const modifiedData = editingType ? { relationship_type: editingType } : undefined;
    onVerifyRelationship(selectedRel.id, reviewNotes, modifiedData);
    setReviewNotes('');
    setEditingType(null);
  };

  const handleReject = () => {
    if (!selectedRel) return;
    onRejectRelationship(selectedRel.id, reviewNotes || 'Đánh dấu không phải quan hệ pháp lý hợp lệ');
    setReviewNotes('');
  };

  const relTypeLabels: Record<LegalRelationshipType, string> = {
    amends: 'Sửa đổi',
    supplements: 'Bổ sung',
    replaces: 'Thay thế',
    repeals: 'Bãi bỏ',
    suspends: 'Đình chỉ / Tạm ngưng',
    guides: 'Hướng dẫn thi hành',
    details: 'Quy định chi tiết',
    consolidates: 'Hợp nhất',
    corrects: 'Đính chính',
    cites: 'Dẫn chiếu',
    can_cu: 'Căn cứ ban hành',
    related: 'Liên quan nghiệp vụ',
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 p-4 gap-4 select-text">
      {/* Left Column: Relationship List */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden min-w-0">
        {/* Header & Filter */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-blue-700" />
            <span className="font-bold text-xs text-slate-900">
              Danh sách quan hệ pháp lý ({filteredRels.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ kiểm duyệt (Pending)</option>
              <option value="verified">Đã xác minh (Verified)</option>
              <option value="rejected">Đã từ chối (Rejected)</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRels.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-xs text-slate-700">Không có quan hệ nào trong danh sách lọc</p>
            </div>
          ) : (
            filteredRels.map((rel) => {
              const isSelected = selectedRel?.id === rel.id;
              return (
                <div
                  key={rel.id}
                  onClick={() => {
                    setSelectedRelId(rel.id);
                    setEditingType(null);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top Line: Badges & Confidence */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                          rel.review_status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rel.review_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {rel.review_status === 'verified'
                          ? '✓ Đã xác minh'
                          : rel.review_status === 'rejected'
                          ? '✕ Đã từ chối'
                          : '⏳ Chờ duyệt'}
                      </span>

                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-[11px] border border-blue-200">
                        {relTypeLabels[rel.relationship_type] || rel.relationship_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                      <span>Độ tin cậy: <strong>{Math.round(rel.confidence * 100)}%</strong></span>
                      <span>•</span>
                      <span>Nguồn: <strong>{rel.detection_method}</strong></span>
                    </div>
                  </div>

                  {/* Visual Flow: Source -> Relation -> Target */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block">Văn bản nguồn (Tác động):</span>
                      <span className="font-mono font-bold text-slate-900 truncate block">
                        {rel.source_document_number}
                      </span>
                    </div>

                    <div className="flex flex-col items-center shrink-0 px-2">
                      <span className="text-[10px] font-bold text-blue-700 uppercase">
                        — {relTypeLabels[rel.relationship_type] || rel.relationship_type} →
                      </span>
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                    </div>

                    <div className="min-w-0 text-right">
                      <span className="text-[10px] text-slate-400 block">Văn bản đích (Bị tác động):</span>
                      <span className="font-mono font-bold text-blue-700 truncate block">
                        {rel.target_document_number || rel.target_document_id}
                      </span>
                    </div>
                  </div>

                  {/* Evidence snippet */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Trích đoạn căn cứ:
                    </span>
                    <blockquote className="p-2.5 bg-amber-50/60 border-l-2 border-amber-400 text-slate-800 rounded-r-lg italic text-[11px] leading-relaxed">
                      &ldquo;{rel.evidence_text}&rdquo;
                    </blockquote>
                  </div>

                  {/* Conflict notification if flagged */}
                  {rel.isConflictWithExisting && (
                    <div className="p-2 bg-red-50 text-red-800 border border-red-200 rounded-lg text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{rel.existingConflictNote || 'Phát hiện xung đột quan hệ với dữ liệu hiện có.'}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Relationship Review Inspector */}
      <div className="w-full md:w-96 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-700" />
            Kiểm tra chi tiết quan hệ
          </h3>
        </div>

        {selectedRel ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Selected Summary Card */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Luồng quan hệ đang chọn:</div>
              <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                <span>{selectedRel.source_document_number}</span>
                <span className="text-blue-600 font-bold">➔</span>
                <span className="text-blue-700">{selectedRel.target_document_number}</span>
              </div>
              <div className="text-[11px] text-blue-800 font-medium">
                {selectedRel.extracted_instruction}
              </div>
            </div>

            {/* Change / Edit Relationship Type */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 text-xs">Loại quan hệ pháp lý:</label>
              <select
                value={editingType || selectedRel.relationship_type}
                onChange={(e) => setEditingType(e.target.value as LegalRelationshipType)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {Object.entries(relTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label} ({key})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Direction Action */}
            <button
              type="button"
              onClick={() => onSwapDirection(selectedRel.id)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              <span>Đảo chiều quan hệ (Swap Source ⇄ Target)</span>
            </button>

            {/* Open Side-by-Side Dual Documents Modal */}
            <button
              type="button"
              onClick={() => setShowDualDocModal(true)}
              className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors border border-blue-200 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Mở song song hai văn bản để đối chiếu</span>
            </button>

            {/* Legal Ground / Evidence Citation */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Điều / Khoản làm căn cứ:</label>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-[11px]">
                {selectedRel.source_node_id ? `Mục trích dẫn: ${selectedRel.source_node_id}` : 'Trang 1 / Căn cứ pháp lý'}
              </div>
            </div>

            {/* Review Notes */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Ghi chú xác minh của chuyên viên:</label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Ghi chú xác nhận (ví dụ: đã đối chiếu Điều 19 Khoản 1 khớp nội dung)..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleVerify}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận quan hệ này (Verified)</span>
              </button>

              <button
                type="button"
                onClick={handleReject}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Đánh dấu không phải quan hệ</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chọn một quan hệ ở danh sách để kiểm tra.
          </div>
        )}
      </div>

      {/* DUAL DOCUMENT SIDE-BY-SIDE MODAL */}
      {showDualDocModal && selectedRel && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-6xl w-full h-[85vh] flex flex-col overflow-hidden animate-in fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-sm text-slate-900">
                  Đối chiếu song song: {selectedRel.source_document_number} và {selectedRel.target_document_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDualDocModal(false)}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Two Column Content */}
            <div className="flex-1 grid grid-cols-2 divide-x divide-slate-200 overflow-hidden">
              {/* Left: Source Doc */}
              <div className="p-4 overflow-y-auto space-y-3">
                <div className="font-bold text-xs text-slate-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  Văn bản nguồn: {selectedRel.sourceDoc?.title || selectedRel.source_document_number}
                </div>
                <div
                  className="document-content text-slate-800 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formatLegalHtmlContent(
                      selectedRel.sourceDoc?.html_content || `<p>Đang hiển thị nội dung trích xuất: "${selectedRel.evidence_text}"</p>`,
                      selectedRel.sourceDoc
                    ),
                  }}
                />
              </div>

              {/* Right: Target Doc */}
              <div className="p-4 overflow-y-auto space-y-3">
                <div className="font-bold text-xs text-slate-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  Văn bản đích: {selectedRel.targetDoc?.title || selectedRel.target_document_number}
                </div>
                <div
                  className="document-content text-slate-800 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formatLegalHtmlContent(
                      selectedRel.targetDoc?.html_content || `<p>Văn bản đích được tác động bởi điều khoản sửa đổi.</p>`,
                      selectedRel.targetDoc
                    ),
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDualDocModal(false)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs"
              >
                Đóng đối chiếu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
