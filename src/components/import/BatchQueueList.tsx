'use client';

import React from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Trash2,
  RotateCw,
  ExternalLink,
  Copy,
  Download,
  Sparkles,
} from 'lucide-react';
import { ImportedDocument, ExtractionStatus } from '@/lib/document-import/types';
import { downloadLegalDocxFile } from '@/lib/document-import/docx-exporter';
interface BatchQueueListProps {
  queue: ImportedDocument[];
  onProcessAll: () => void;
  onProcessSingle: (id: string) => void;
  onRemoveSingle: (id: string) => void;
  onClearAll: () => void;
  onSelectForReview: (doc: ImportedDocument) => void;
  isProcessingBatch: boolean;
}

export function BatchQueueList({
  queue,
  onProcessAll,
  onProcessSingle,
  onRemoveSingle,
  onClearAll,
  onSelectForReview,
  isProcessingBatch,
}: BatchQueueListProps) {
  if (queue.length === 0) return null;

  const renderStatusBadge = (status: ExtractionStatus, message?: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Chờ xử lý</span>
          </span>
        );
      case 'uploading':
      case 'extracting':
      case 'ocr':
      case 'normalizing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
            <span>
              {status === 'extracting'
                ? 'Đang đọc nội dung'
                : status === 'ocr'
                ? 'Đang OCR'
                : status === 'normalizing'
                ? 'Đang nhận diện'
                : 'Đang tải lên'}
            </span>
          </span>
        );
      case 'review':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Cần kiểm tra</span>
          </span>
        );
      case 'duplicate':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200" title={message}>
            <Copy className="w-3 h-3 text-purple-600" />
            <span>Trùng văn bản</span>
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Đã nhập</span>
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200" title={message}>
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Lỗi</span>
          </span>
        );
      default:
        return null;
    }
  };

  const pendingCount = queue.filter((d) => d.extractionStatus === 'pending').length;
  const reviewCount = queue.filter((d) => d.extractionStatus === 'review').length;
  const duplicateCount = queue.filter((d) => d.extractionStatus === 'duplicate').length;

  return (
    <div className="space-y-3">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            Danh sách hàng chờ ({queue.length} tệp)
          </span>
          {reviewCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-semibold">
              {reviewCount} cần kiểm duyệt
            </span>
          )}
          {duplicateCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-semibold">
              {duplicateCount} trùng lặp
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClearAll}
            disabled={isProcessingBatch}
            className="px-2.5 py-1 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors disabled:opacity-50"
          >
            Hủy toàn bộ
          </button>

          {pendingCount > 0 && (
            <button
              type="button"
              onClick={onProcessAll}
              disabled={isProcessingBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
            >
              {isProcessingBatch ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Xử lý tất cả ({pendingCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5">Tên file gốc</th>
                <th className="px-3 py-2.5 w-20">Định dạng</th>
                <th className="px-3 py-2.5 w-24">Dung lượng</th>
                <th className="px-3 py-2.5 w-32">Trạng thái</th>
                <th className="px-3 py-2.5">Kết quả nhận diện</th>
                <th className="px-3 py-2.5 text-right w-28">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {queue.map((item) => {
                const sizeKb = (item.originalSize / 1024).toFixed(0);
                const sizeMb = (item.originalSize / (1024 * 1024)).toFixed(1);
                const displaySize = item.originalSize > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      <div className="flex items-center gap-2 max-w-xs truncate" title={item.originalFileName}>
                        <FileText className={`w-4 h-4 shrink-0 ${item.fileExtension === 'pdf' ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className="truncate">{item.originalFileName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 uppercase font-mono text-[11px] text-slate-500">
                      .{item.fileExtension}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono text-[11px]">
                      {displaySize}
                    </td>
                    <td className="px-3 py-2.5">
                      {renderStatusBadge(item.extractionStatus, item.statusMessage)}
                    </td>
                    <td className="px-3 py-2.5">
                      {item.standardTitle || item.detectedDocumentNumber ? (
                        <div className="space-y-0.5 max-w-sm">
                          <p className="font-semibold text-slate-900 truncate" title={item.standardTitle || item.detectedTitle}>
                            {item.standardTitle || item.detectedTitle}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {item.detectedDocumentNumber && (
                              <span className="font-mono font-medium text-blue-700 bg-blue-50 px-1 rounded">
                                {item.detectedDocumentNumber}
                              </span>
                            )}
                            {item.detectedIssuingBody && (
                              <span className="truncate">{item.detectedIssuingBody}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Chưa nhận diện</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {item.extractionStatus === 'pending' || item.extractionStatus === 'failed' ? (
                          <button
                            type="button"
                            onClick={() => onProcessSingle(item.id)}
                            disabled={isProcessingBatch}
                            title="Xử lý tệp này"
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => downloadLegalDocxFile(item)}
                              title="Chuyển đổi & Tải tệp Word (.docx)"
                              className="p-1 text-blue-700 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectForReview(item)}
                              title="Mở màn hình kiểm duyệt"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 font-semibold rounded text-[11px] transition-colors"
                            >
                              <span>Kiểm duyệt</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveSingle(item.id)}
                          title="Xóa khỏi hàng chờ"
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
