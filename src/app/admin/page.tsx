'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2, RotateCcw, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { getDocuments, deleteDocument, batchDeleteDocuments, restoreAllDeletedDocuments } from '@/lib/data-service';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, formatDate, getEffectiveStatus } from '@/lib/utils';
import type { LegalDocument, DocumentType, DocumentStatus } from '@/types';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoc, setEditingDoc] = useState<Partial<LegalDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getDocuments(null);
      setDocuments(res.data || []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredDocs = useMemo(() => {
    if (!searchTerm.trim()) return documents;
    const q = searchTerm.toLowerCase().trim();
    return documents.filter(
      (d) =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.document_number || '').toLowerCase().includes(q) ||
        (d.issuing_body || '').toLowerCase().includes(q)
    );
  }, [documents, searchTerm]);

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title) return;

    if (isCreating) {
      const newDoc: LegalDocument = {
        ...(editingDoc as LegalDocument),
        id: `doc-custom-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDocuments([newDoc, ...documents]);
      showFeedback(`Đã thêm thành công văn bản ${newDoc.document_number || newDoc.title}`);
    } else {
      setDocuments(
        documents.map((d) => (d.id === editingDoc.id ? ({ ...d, ...editingDoc, updated_at: new Date().toISOString() } as LegalDocument) : d))
      );
      showFeedback(`Đã cập nhật văn bản ${editingDoc.document_number || editingDoc.title}`);
    }

    setEditingDoc(null);
    setIsCreating(false);
  };

  const handleDeleteSingle = async (id: string, docNumber?: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn văn bản ${docNumber || ''} không? Văn bản sẽ bị gỡ bỏ ngay lập tức khỏi kết quả tìm kiếm và danh mục.`)) {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showFeedback(`Đã xóa vĩnh viễn văn bản khỏi CSDL và bộ tìm kiếm.`);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (confirm(`Bạn có chắc chắn muốn XÓA NHANH ${count} văn bản đã chọn không? Toàn bộ văn bản này sẽ biến mất ngay khỏi hệ thống và bộ tìm kiếm.`)) {
      const idsArray = Array.from(selectedIds);
      await batchDeleteDocuments(idsArray);
      setDocuments((prev) => prev.filter((d) => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
      showFeedback(`Đã xóa nhanh thành công ${count} văn bản.`);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestoreDefaults = async () => {
    if (confirm('Khôi phục toàn bộ văn bản mẫu (xóa danh sách đã bị ẩn)?')) {
      restoreAllDeletedDocuments();
      await loadData();
      showFeedback('Đã khôi phục toàn bộ danh sách văn bản mẫu.');
    }
  };
  return (
    <div className="space-y-6">
      {/* Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
            feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedbackMsg.text}
          </span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold text-slate-500 hover:text-slate-900">×</button>
        </div>
      )}

      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-gray-900">Danh sách văn bản pháp luật ({documents.length})</h2>
          <p className="text-xs text-gray-500">Quản lý, chỉnh sửa metadata, xóa vĩnh viễn và xóa nhanh hàng loạt</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa nhanh đã chọn ({selectedIds.size})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
            title="Khôi phục toàn bộ văn bản mẫu nếu đã lỡ xóa"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục dữ liệu mẫu</span>
          </button>

          <button
            onClick={() => {
              setIsCreating(true);
              setEditingDoc({
                title: '',
                document_number: '',
                document_type: 'thong_tu',
                status: 'hieu_luc',
                issuing_body: 'Bộ Tài chính',
                issued_date: new Date().toISOString().slice(0, 10),
                effective_date: new Date().toISOString().slice(0, 10),
                html_content: '<p>Nội dung văn bản mới...</p>',
              });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm văn bản mới</span>
          </button>
        </div>
      </div>

      {/* Search & Batch Selection Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg max-w-md flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo số ký hiệu, tên luật hoặc cơ quan ban hành..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs outline-none flex-1 text-gray-800 placeholder:text-gray-400"
          />
        </div>

        {filteredDocs.length > 0 && (
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer font-medium"
          >
            {selectedIds.size === filteredDocs.length && filteredDocs.length > 0 ? (
              <>
                <CheckSquare className="w-4 h-4 text-blue-600" />
                <span>Bỏ chọn tất cả</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-400" />
                <span>Chọn tất cả ({filteredDocs.length})</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Document Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-2xs bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold">
            <tr>
              <th className="p-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredDocs.length && filteredDocs.length > 0}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-blue-600 cursor-pointer mt-0.5"
                  title="Chọn tất cả"
                />
              </th>
              <th className="p-3">Số / Ký hiệu</th>
              <th className="p-3">Tên văn bản</th>
              <th className="p-3">Loại</th>
              <th className="p-3">Ngày ban hành</th>
              <th className="p-3">Hiệu lực</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDocs.map((doc) => {
              const isChecked = selectedIds.has(doc.id);
              return (
                <tr key={doc.id} className={`hover:bg-blue-50/40 transition-colors ${isChecked ? 'bg-blue-50/60' : ''}`}>
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectOne(doc.id)}
                      className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-3 font-mono font-semibold text-blue-900 whitespace-nowrap">
                    {doc.document_number || '---'}
                  </td>
                  <td className="p-3 font-medium text-gray-800 max-w-md">
                    <div className="line-clamp-2 leading-snug">{doc.title}</div>
                    {doc.issuing_body && (
                      <span className="text-[10px] text-slate-400 block mt-0.5">{doc.issuing_body}</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {DOCUMENT_TYPE_LABELS[doc.document_type || 'khac']}
                  </td>
                  <td className="p-3 text-gray-500 whitespace-nowrap">
                    {formatDate(doc.issued_date)}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {(() => {
                      const effStatus = getEffectiveStatus(doc);
                      return (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${DOCUMENT_STATUS_COLORS[effStatus]}`}>
                          {DOCUMENT_STATUS_LABELS[effStatus]}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="p-3 text-right space-x-1 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setIsCreating(false);
                        setEditingDoc(doc);
                      }}
                      className="p-1.5 hover:bg-gray-200 rounded text-gray-600 transition-colors cursor-pointer"
                      title="Chỉnh sửa văn bản"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSingle(doc.id, doc.document_number || undefined)}
                      className="p-1.5 hover:bg-red-100 text-red-600 rounded transition-colors cursor-pointer"
                      title="Xóa vĩnh viễn văn bản này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit / Create Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-900">
              {isCreating ? 'Thêm văn bản pháp luật mới' : 'Chỉnh sửa metadata văn bản'}
            </h3>

            <form onSubmit={handleSaveDoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Số / Ký hiệu:</label>
                  <input
                    type="text"
                    value={editingDoc.document_number || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, document_number: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                    placeholder="VD: 123/2026/TT-BTC"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Loại văn bản:</label>
                  <select
                    value={editingDoc.document_type || 'thong_tu'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, document_type: e.target.value as DocumentType })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="luat">Luật</option>
                    <option value="nghi_dinh">Nghị định</option>
                    <option value="thong_tu">Thông tư</option>
                    <option value="quyet_dinh">Quyết định</option>
                    <option value="cong_van">Công văn</option>
                    <option value="chuan_muc">Chuẩn mực</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Tên / Trích yếu văn bản:</label>
                <input
                  type="text"
                  value={editingDoc.title || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                  placeholder="VD: Hướng dẫn thi hành chính sách thuế..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Cơ quan ban hành:</label>
                  <input
                    type="text"
                    value={editingDoc.issuing_body || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issuing_body: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Tình trạng hiệu lực:</label>
                  <select
                    value={editingDoc.status || 'hieu_luc'}
                    onChange={(e) => setEditingDoc({ ...editingDoc, status: e.target.value as DocumentStatus })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="hieu_luc">Đang hiệu lực</option>
                    <option value="chua_hieu_luc">Chưa có hiệu lực</option>
                    <option value="het_hieu_luc_mot_phan">Hết hiệu lực một phần</option>
                    <option value="het_hieu_luc_toan_bo">Hết hiệu lực toàn bộ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Ngày ban hành:</label>
                  <input
                    type="date"
                    value={editingDoc.issued_date || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issued_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Ngày hiệu lực:</label>
                  <input
                    type="date"
                    value={editingDoc.effective_date || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, effective_date: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Tóm tắt nội dung chính:</label>
                <textarea
                  rows={2}
                  value={editingDoc.summary_main || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, summary_main: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold"
                >
                  Lưu văn bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
