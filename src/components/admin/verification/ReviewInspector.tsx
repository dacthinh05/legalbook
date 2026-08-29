'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Eye,
  Check,
  X,
  RotateCcw,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  Calendar,
  Save,
  FileCode,
  FileText,
} from 'lucide-react';
import type { DocumentVerificationRecord, VerificationField, ValidationConflict } from '@/lib/verification/types';

interface ReviewInspectorProps {
  documentRecord: DocumentVerificationRecord;
  activeFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
  onSaveDraft: (updatedFields: Record<string, Partial<VerificationField>>, notes?: string) => void;
  onVerify: (autoPublish: boolean, notes?: string) => void;
  onReject: (reason: string, notes: string) => void;
  onRequestReOcr: (reason: string, notes: string) => void;
  onMarkDuplicate: (notes: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width: number;
}

export function ReviewInspector({
  documentRecord,
  activeFieldKey,
  onSelectField,
  onSaveDraft,
  onVerify,
  onReject,
  onRequestReOcr,
  onMarkDuplicate,
  isCollapsed,
  onToggleCollapse,
  width,
}: ReviewInspectorProps) {
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [tempFieldValue, setTempFieldValue] = useState<string>('');
  const [autoPublish, setAutoPublish] = useState<boolean>(documentRecord.autoPublishOnVerify || false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Modals state
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Scan mờ / Không đọc được nội dung');
  const [rejectNotes, setRejectNotes] = useState<string>('');

  const [showReOcrModal, setShowReOcrModal] = useState<boolean>(false);
  const [reOcrReason, setReOcrReason] = useState<string>('Lệch layout / Thiếu trang scan');
  const [reOcrNotes, setReOcrNotes] = useState<string>('');

  const [showDuplicateModal, setShowDuplicateModal] = useState<boolean>(false);
  const [duplicateNotes, setDuplicateNotes] = useState<string>('');

  const doc = documentRecord.document;
  const fields = documentRecord.fields;
  const conflicts = documentRecord.conflicts;

  const totalFields = Object.keys(fields).length;
  const confirmedFieldsCount = Object.values(fields).filter(
    (f) => f.status === 'confirmed' || f.status === 'edited'
  ).length;

  const unresolvedErrors = conflicts.filter((c) => c.severity === 'error' && !c.isResolved);
  const unresolvedWarnings = conflicts.filter((c) => c.severity === 'warning' && !c.isResolved && !c.isConfirmed);
  const canVerify = unresolvedErrors.length === 0;

  // Field edit handlers
  const handleStartEdit = (field: VerificationField) => {
    setEditingFieldKey(field.key);
    setTempFieldValue(field.currentValue || '');
  };

  const handleSaveFieldEdit = (fieldKey: string) => {
    onSaveDraft({
      [fieldKey]: {
        currentValue: tempFieldValue,
        status: 'edited',
      },
    });
    setEditingFieldKey(null);
  };

  const handleQuickResolve = (fieldKey: string, chosenValue: string) => {
    onSaveDraft({
      [fieldKey]: {
        currentValue: chosenValue,
        status: 'edited',
      },
    });
  };

  const handleConfirmField = (fieldKey: string) => {
    onSaveDraft({
      [fieldKey]: {
        status: 'confirmed',
      },
    });
  };

  if (isCollapsed) {
    return (
      <div className="w-12 bg-white border-l border-slate-200 flex flex-col items-center py-3 select-none shrink-0 transition-all">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 mb-4"
          title="Mở rộng Inspector"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="writing-mode-vertical text-[11px] font-bold text-slate-500 tracking-wider flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 mb-1" />
          <span>INSPECTOR ({confirmedFieldsCount}/{totalFields})</span>
        </div>
      </div>
    );
  }

  // Ordered checklist keys
  const checklistKeys = [
    'document_type',
    'document_number',
    'title',
    'issuing_body',
    'signer',
    'position',
    'issued_date',
    'effective_date',
    'status',
    'recipient',
    'source_file',
    'ocr_content',
  ];

  return (
    <aside
      style={{ width: `${width}px` }}
      className="bg-white border-l border-slate-200 flex flex-col shrink-0 h-full select-none overflow-hidden transition-all relative"
    >
      {/* Header Overview Card */}
      <div className="p-4 border-b border-slate-200 space-y-3 bg-slate-50/70 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <span className="font-bold text-xs uppercase tracking-wider text-slate-900">
              Kiểm duyệt trường & Metadata
            </span>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700"
            title="Thu gọn Inspector"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Confidence & Warning Metrics */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Độ tin cậy tổng thể:</span>
            <span className="font-mono font-bold text-emerald-700 text-sm">
              {documentRecord.overallConfidence}%
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Trạng thái kiểm tra:</span>
            <span
              className={`font-semibold text-[11px] ${
                unresolvedErrors.length > 0
                  ? 'text-red-700'
                  : unresolvedWarnings.length > 0
                  ? 'text-amber-800'
                  : 'text-emerald-700'
              }`}
            >
              {unresolvedErrors.length > 0
                ? `${unresolvedErrors.length} lỗi bắt buộc`
                : unresolvedWarnings.length > 0
                ? `${unresolvedWarnings.length} trường cần kiểm tra`
                : 'Đã sẵn sàng xác nhận'}
            </span>
          </div>

          {/* Applicable Layout Rule */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-600">
            <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              Quy tắc bố cục áp dụng: <strong>{documentRecord.applicableLayoutRule}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Active Conflicts Notification Banner */}
      {conflicts.length > 0 && (
        <div className="p-3 bg-amber-50/80 border-b border-amber-200/80 space-y-2 shrink-0 max-h-44 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Phát hiện {conflicts.length} mâu thuẫn cần xử lý</span>
            </div>
          </div>

          <div className="space-y-1.5">
            {conflicts.map((conflict) => (
              <div
                key={conflict.id}
                onClick={() => onSelectField?.(conflict.fieldKey)}
                className={`p-2 rounded-lg text-xs border transition-all cursor-pointer ${
                  conflict.severity === 'error'
                    ? 'bg-red-50/90 border-red-200 text-red-900'
                    : 'bg-white border-amber-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between font-semibold text-[11px]">
                  <span className="truncate">{conflict.title}</span>
                  <span
                    className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                      conflict.severity === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {conflict.severity === 'error' ? 'Bắt buộc' : 'Cảnh báo'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{conflict.message}</p>

                {conflict.suggestedValues && conflict.suggestedValues.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Chọn nhanh:</span>
                    {conflict.suggestedValues.map((val, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickResolve(conflict.fieldKey, val);
                        }}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold rounded"
                      >
                        Chọn {val}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field-by-Field Checklist (Scrollable Center) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Chi tiết từng trường ({confirmedFieldsCount}/{totalFields} đã duyệt)
        </div>

        {checklistKeys.map((key) => {
          const field = fields[key];
          if (!field) return null;

          const isActive = activeFieldKey === key;
          const isEditing = editingFieldKey === key;
          const hasError = field.severity === 'error' || (field.isMandatory && !field.currentValue);
          const hasWarning = field.severity === 'warning' || field.confidence < 0.85;

          return (
            <div
              key={key}
              onClick={() => onSelectField?.(key)}
              className={`p-3.5 rounded-xl border transition-all space-y-2 text-xs cursor-pointer ${
                isActive
                  ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {field.status === 'confirmed' || field.status === 'edited' ? (
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                      ✓
                    </span>
                  ) : hasError ? (
                    <span className="w-4 h-4 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-[10px]">
                      !
                    </span>
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                      ?
                    </span>
                  )}
                  <span className="font-bold text-slate-900">{field.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                    {Math.round(field.confidence * 100)}%
                  </span>
                  {field.status === 'edited' && (
                    <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 text-[10px] font-bold rounded border border-purple-200">
                      Đã sửa
                    </span>
                  )}
                </div>
              </div>

              {/* Field Value Display or Inline Edit Form */}
              {isEditing ? (
                <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  {key === 'document_type' ? (
                    <select
                      value={tempFieldValue}
                      onChange={(e) => setTempFieldValue(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="cong_van">Công văn</option>
                      <option value="nghi_dinh">Nghị định</option>
                      <option value="thong_tu">Thông tư</option>
                      <option value="quyet_dinh">Quyết định</option>
                      <option value="luat">Luật</option>
                      <option value="khac">Khác</option>
                    </select>
                  ) : key === 'status' ? (
                    <select
                      value={tempFieldValue}
                      onChange={(e) => setTempFieldValue(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="hieu_luc">Còn hiệu lực</option>
                      <option value="het_hieu_luc_toan_bo">Hết hiệu lực toàn bộ</option>
                      <option value="het_hieu_luc_mot_phan">Hết hiệu lực một phần</option>
                      <option value="chua_hieu_luc">Chưa có hiệu lực</option>
                    </select>
                  ) : (
                    <textarea
                      rows={key === 'title' || key === 'ocr_content' ? 3 : 1}
                      value={tempFieldValue}
                      onChange={(e) => setTempFieldValue(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                    />
                  )}

                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingFieldKey(null)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveFieldEdit(key)}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md flex items-center gap-1 shadow-2xs"
                    >
                      <Check className="w-3 h-3" />
                      Lưu giá trị
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="p-2 bg-slate-50 rounded-lg font-mono text-slate-800 break-words text-xs">
                    {field.currentValue || (
                      <span className="text-slate-400 italic">Chưa xác định</span>
                    )}
                  </div>

                  {/* Conflict notice if any */}
                  {field.conflictReason && (
                    <div className="p-2 bg-amber-50 text-amber-900 border-l-2 border-amber-500 rounded-r text-[11px] leading-tight">
                      {field.conflictReason}
                    </div>
                  )}

                  {/* Specific Quick Action Buttons per Field Requirement */}
                  {key === 'issued_date' && field.conflictReason && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleQuickResolve('issued_date', '10/05/2025')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold text-[10px]"
                      >
                        Chọn 10/05/2025
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickResolve('issued_date', '26/01/2026')}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold text-[10px]"
                      >
                        Chọn 26/01/2026
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(field)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px]"
                      >
                        Nhập khác
                      </button>
                    </div>
                  )}

                  {key === 'effective_date' && !field.currentValue && (
                    <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleQuickResolve('effective_date', 'Không áp dụng')}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[10px]"
                      >
                        Không áp dụng
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(field)}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded font-bold text-[10px]"
                      >
                        Nhập ngày
                      </button>
                    </div>
                  )}

                  {/* Location and Action Links */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="text-[10px]">Nguồn: {field.sourceLocationText || `Trang ${field.sourcePage}`}</span>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onSelectField?.(key)}
                        className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Xem nguồn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(field)}
                        className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-0.5"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>
                      {field.status !== 'confirmed' && (
                        <button
                          type="button"
                          onClick={() => handleConfirmField(key)}
                          className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5"
                        >
                          <Check className="w-3 h-3" />
                          <span>Khớp</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* STICKY ACTION BAR AT BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3.5 shadow-lg space-y-2 z-20">
        {/* Status Line */}
        <div className="flex items-center justify-between text-[11px] text-slate-600">
          <span>
            <strong>{confirmedFieldsCount}/{totalFields}</strong> trường đã xác nhận
          </span>
          <span className={unresolvedErrors.length > 0 ? 'text-red-700 font-bold' : 'text-amber-800 font-bold'}>
            {unresolvedErrors.length > 0
              ? `${unresolvedErrors.length} lỗi chặn`
              : unresolvedWarnings.length > 0
              ? `${unresolvedWarnings.length} cảnh báo chưa xử lý`
              : 'Đã sẵn sàng'}
          </span>
        </div>

        {/* Auto-publish checkbox */}
        <div className="flex items-center gap-2 text-[11px] text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
          <input
            type="checkbox"
            id="autoPublishCheckbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
          />
          <label htmlFor="autoPublishCheckbox" className="cursor-pointer select-none">
            Tự động xuất bản sau khi xác minh
          </label>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSaveDraft({}, 'Lưu nháp')}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
            title="Lưu nháp các thay đổi hiện tại"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu nháp</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRejectModal(true)}
            className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            title="Từ chối tài liệu có lý do"
          >
            Từ chối
          </button>

          <button
            type="button"
            disabled={!canVerify}
            onClick={() => onVerify(autoPublish)}
            className={`flex-1 py-2 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              canVerify
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
            title={
              canVerify
                ? 'Xác nhận tài liệu và chuyển sang tài liệu tiếp theo'
                : `Cần xử lý ${unresolvedErrors.length} lỗi và xác nhận ${unresolvedWarnings.length} cảnh báo trước khi duyệt.`
            }
          >
            <Check className="w-3.5 h-3.5" />
            <span>Xác nhận & tiếp tục →</span>
          </button>

          {/* More Actions Dropdown Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600"
              title="Tùy chọn khác"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl p-1 text-xs space-y-0.5 z-30">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowReOcrModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Yêu cầu chạy lại OCR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowDuplicateModal(true);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đánh dấu trùng lặp</span>
                </button>

                {doc.official_source_url && (
                  <a
                    href={doc.official_source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowMoreMenu(false)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mở nguồn gốc</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Từ chối tài liệu {doc.document_number || doc.title}
            </h3>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Lý do từ chối (Bắt buộc):</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
              >
                <option value="Scan mờ / Không đọc được nội dung">Scan mờ / Không đọc được nội dung</option>
                <option value="Văn bản không thuộc phạm vi pháp lý áp dụng">Văn bản không thuộc phạm vi pháp lý áp dụng</option>
                <option value="Thiếu trang / Thiếu phần chữ ký và con dấu">Thiếu trang / Thiếu phần chữ ký và con dấu</option>
                <option value="Trùng lặp với văn bản đã có">Trùng lặp với văn bản đã có</option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Ghi chú chi tiết:</label>
              <textarea
                rows={3}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Nhập ghi chú giải thích để lưu vào Audit Log..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onReject(rejectReason, rejectNotes);
                  setShowRejectModal(false);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RE-OCR MODAL */}
      {showReOcrModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              Yêu cầu chạy lại AI OCR
            </h3>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Lý do yêu cầu OCR lại:</label>
              <select
                value={reOcrReason}
                onChange={(e) => setReOcrReason(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Lệch layout / Thiếu trang scan">Lệch layout / Thiếu trang scan</option>
                <option value="Sai ký tự do scan nghiêng / mờ">Sai ký tự do scan nghiêng / mờ</option>
                <option value="Không nhận diện được bảng biểu">Không nhận diện được bảng biểu</option>
                <option value="Cần áp dụng model OCR nâng cao">Cần áp dụng model OCR nâng cao</option>
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Ghi chú bổ sung:</label>
              <textarea
                rows={3}
                value={reOcrNotes}
                onChange={(e) => setReOcrNotes(e.target.value)}
                placeholder="Ghi chú các trang hoặc vùng cần chú ý trích xuất lại..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReOcrModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onRequestReOcr(reOcrReason, reOcrNotes);
                  setShowReOcrModal(false);
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Gửi yêu cầu OCR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE MODAL */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4 animate-in fade-in">
            <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Đánh dấu trùng lặp văn bản
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Văn bản này sẽ được chuyển vào mục trùng lặp và ghi nhận vào Audit Log.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700">Ghi chú xác minh trùng:</label>
              <textarea
                rows={3}
                value={duplicateNotes}
                onChange={(e) => setDuplicateNotes(e.target.value)}
                placeholder="Ví dụ: Trùng với số hiệu đã ban hành trong hệ thống..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  onMarkDuplicate(duplicateNotes);
                  setShowDuplicateModal(false);
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs shadow-xs"
              >
                Xác nhận trùng lặp
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
