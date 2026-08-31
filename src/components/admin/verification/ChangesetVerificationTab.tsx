'use client';

import React, { useState } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  Edit3,
  Calendar,
  FileText,
} from 'lucide-react';
import type { ChangesetDiffItem } from '@/lib/verification/types';

interface ChangesetVerificationTabProps {
  changesets: ChangesetDiffItem[];
  onVerifyChangeset: (id: string, notes?: string) => void;
}

export function ChangesetVerificationTab({
  changesets,
  onVerifyChangeset,
}: ChangesetVerificationTabProps) {
  const [selectedChangesetId, setSelectedChangesetId] = useState<string>(changesets[0]?.id || '');
  const [verifyNotes, setVerifyNotes] = useState<string>('');

  const selectedChangeset = changesets.find((c) => c.id === selectedChangesetId) || changesets[0] || null;

  const handleVerify = (id: string) => {
    onVerifyChangeset(id, verifyNotes);
    setVerifyNotes('');
  };

  const getOperationBadge = (op: string) => {
    switch (op) {
      case 'replace_phrase':
        return { label: 'Thay thế cụm từ', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'replace_node':
        return { label: 'Sửa đổi toàn bộ khoản/điều', bg: 'bg-purple-50 text-purple-800 border-purple-200' };
      case 'delete':
        return { label: 'Bãi bỏ nội dung', bg: 'bg-red-50 text-red-800 border-red-200' };
      case 'insert_after':
      case 'insert_before':
      case 'append':
        return { label: 'Bổ sung nội dung mới', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      default:
        return { label: op.toUpperCase(), bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 p-4 gap-4 select-text">
      {/* Left Column: Changesets List */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden min-w-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-700" />
            <span className="font-bold text-xs text-slate-900">
              Danh sách Changeset tác động ({changesets.length})
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {changesets.filter((c) => c.isVerified).length}/{changesets.length} đã xác minh
          </span>
        </div>

        {/* Changeset Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {changesets.map((chg) => {
            const isSelected = selectedChangeset?.id === chg.id;
            const badge = getOperationBadge(chg.operation);

            return (
              <div
                key={chg.id}
                onClick={() => setSelectedChangesetId(chg.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 ${
                  isSelected
                    ? 'bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header line: Location, Operation badge & Effective date */}
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                      {chg.articleLabel || 'Điều'} • {chg.clauseLabel || 'Khoản'} {chg.pointLabel ? `• ${chg.pointLabel}` : ''}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] border ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Hiệu lực: <strong className="text-slate-800">{chg.effective_from || 'Theo văn bản'}</strong></span>
                  </div>
                </div>

                {/* Semantic Diff: Trước sửa | Sau sửa */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Before (Repealed / Replaced) */}
                  {chg.old_content ? (
                    <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-red-800 uppercase tracking-wider">
                        <span>Trước sửa đổi (Bãi bỏ / Thay thế):</span>
                        <span className="text-red-600 font-mono text-[9px]">[CŨ]</span>
                      </div>
                      <p className="text-red-950 font-sans leading-relaxed line-through decoration-red-400">
                        {chg.old_content}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[11px] italic">
                      Không có nội dung bãi bỏ (Bổ sung mới hoàn toàn)
                    </div>
                  )}

                  {/* After (New / Replaced) */}
                  {chg.new_content ? (
                    <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                        <span>Sau sửa đổi (Nội dung áp dụng mới):</span>
                        <span className="text-emerald-600 font-mono text-[9px]">[MỚI]</span>
                      </div>
                      <p className="text-emerald-950 font-sans leading-relaxed font-medium">
                        {chg.new_content}
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-[11px] italic">
                      Nội dung bị bãi bỏ hoàn toàn, không thay thế
                    </div>
                  )}
                </div>

                {/* Footer line: Evidence location */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Căn cứ trích xuất: <strong className="font-mono text-slate-700">{chg.evidence_location || 'Khoản 1 Điều 1'}</strong></span>
                  {chg.isVerified && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Đã xác minh
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Changeset Inspector Panel */}
      <div className="w-full md:w-80 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-blue-700" />
            Kiểm duyệt Changeset
          </h3>
        </div>

        {selectedChangeset ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Vị trí điều khoản:</div>
              <div className="font-bold text-slate-900">
                {selectedChangeset.articleLabel} • {selectedChangeset.clauseLabel}
              </div>
              <div className="text-[11px] text-blue-700 font-medium">
                Thao tác: {selectedChangeset.operation}
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700">Ghi chú xác minh:</label>
              <textarea
                rows={4}
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Ghi chú xác minh phạm vi sửa đổi điều khoản..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={() => handleVerify(selectedChangeset.id)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận Changeset này</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chọn một Changeset để kiểm tra.
          </div>
        )}
      </div>
    </div>
  );
}
