'use client';

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Edit3,
  RotateCcw,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Shield,
} from 'lucide-react';
import type { VerificationAuditEntry } from '@/lib/verification/types';

interface AuditLogTabProps {
  auditLogs: VerificationAuditEntry[];
}

export function AuditLogTab({ auditLogs }: AuditLogTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<VerificationAuditEntry | null>(auditLogs[0] || null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = log.targetTitle.toLowerCase();
        const reviewer = log.reviewer.toLowerCase();
        const reason = (log.reason || '').toLowerCase();
        const notes = (log.notes || '').toLowerCase();
        if (!title.includes(q) && !reviewer.includes(q) && !reason.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      if (actionFilter !== 'all' && log.action !== actionFilter) {
        return false;
      }

      return true;
    });
  }, [auditLogs, searchQuery, actionFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'verified':
        return { label: 'Xác nhận (Verified)', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'rejected':
        return { label: 'Từ chối (Rejected)', bg: 'bg-red-100 text-red-800 border-red-200' };
      case 'draft_saved':
        return { label: 'Lưu nháp (Draft)', bg: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'metadata_modified':
        return { label: 'Sửa metadata', bg: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'ocr_requested':
        return { label: 'Yêu cầu OCR lại', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'duplicate_marked':
        return { label: 'Đánh dấu trùng', bg: 'bg-amber-100 text-amber-900 border-amber-200' };
      default:
        return { label: action, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100/60 p-4 gap-4 select-text">
      {/* Left Table / List */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden min-w-0">
        {/* Header & Filter Controls */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-700" />
            <span className="font-bold text-xs text-slate-900">
              Nhật ký kiểm duyệt & Audit Log ({filteredLogs.length})
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhật ký..."
                className="pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="all">Tất cả hành động</option>
              <option value="verified">Xác nhận</option>
              <option value="rejected">Từ chối</option>
              <option value="draft_saved">Lưu nháp</option>
              <option value="metadata_modified">Sửa metadata</option>
              <option value="ocr_requested">Yêu cầu OCR</option>
              <option value="duplicate_marked">Đánh dấu trùng</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0 z-10">
              <tr>
                <th className="p-3.5">Thời gian</th>
                <th className="p-3.5">Đối tượng</th>
                <th className="p-3.5">Hành động</th>
                <th className="p-3.5">Người kiểm duyệt</th>
                <th className="p-3.5">Lý do / Ghi chú</th>
                <th className="p-3.5">Xuất bản</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Không tìm thấy nhật ký kiểm duyệt nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isSelected = selectedLog?.id === log.id;
                  const badge = getActionBadge(log.action);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 max-w-[200px] truncate">
                        {log.targetTitle}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 whitespace-nowrap">
                        {log.reviewer}
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-[240px] truncate">
                        {log.reason || log.notes || '—'}
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        {log.publishedStatus}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Detailed Audit Record Viewer */}
      <div className="w-full md:w-88 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <h3 className="font-bold text-xs text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-700" />
            Chi tiết bản ghi Audit Log
          </h3>
        </div>

        {selectedLog ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* Header info */}
            <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Đối tượng thao tác:</div>
              <div className="font-bold text-slate-900 text-xs">{selectedLog.targetTitle}</div>
              <div className="text-[11px] text-slate-500 font-mono">ID: {selectedLog.targetId}</div>
            </div>

            {/* Reviewer & Time */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Người thực hiện</span>
                <span className="font-semibold text-slate-900 block mt-0.5">{selectedLog.reviewer}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Thời điểm</span>
                <span className="font-mono text-[11px] text-slate-700 block mt-0.5">
                  {new Date(selectedLog.timestamp).toLocaleTimeString('vi-VN')} {new Date(selectedLog.timestamp).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Reason & Evidence */}
            {selectedLog.reason ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lý do ghi nhận:</span>
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-slate-800 text-xs">
                  {selectedLog.reason}
                </div>
              </div>
            ) : null}

            {selectedLog.notes ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Ghi chú chuyên viên:</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs">
                  {selectedLog.notes}
                </div>
              </div>
            ) : null}

            {selectedLog.evidenceSource ? (
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nguồn bằng chứng:</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 italic text-[11px]">
                  {`"${selectedLog.evidenceSource}"`}
                </div>
              </div>
            ) : null}

            {/* Before / After JSON snapshot */}
            {(selectedLog.beforeValue != null || selectedLog.afterValue != null) ? (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                  Thay đổi dữ liệu (Before / After Snapshot):
                </span>
                <div className="space-y-2 font-mono text-[10px]">
                  {selectedLog.beforeValue != null ? (
                    <div className="p-2 bg-red-50/60 border border-red-200 rounded-lg">
                      <span className="text-red-700 font-bold block mb-1">DỮ LIỆU TRƯỚC (BEFORE):</span>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-red-950">
                        {typeof selectedLog.beforeValue === 'object'
                          ? JSON.stringify(selectedLog.beforeValue, null, 2)
                          : String(selectedLog.beforeValue)}
                      </pre>
                    </div>
                  ) : null}

                  {selectedLog.afterValue != null ? (
                    <div className="p-2 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                      <span className="text-emerald-700 font-bold block mb-1">DỮ LIỆU SAU (AFTER):</span>
                      <pre className="overflow-x-auto whitespace-pre-wrap text-emerald-950">
                        {typeof selectedLog.afterValue === 'object'
                          ? JSON.stringify(selectedLog.afterValue, null, 2)
                          : String(selectedLog.afterValue)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            Chọn một bản ghi để xem chi tiết.
          </div>
        )}
      </div>
    </div>
  );
}
