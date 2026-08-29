'use client';

import { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import { DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, formatDate } from '@/lib/utils';
import type { LegalDocument, DocumentType, DocumentStatus } from '@/types';

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<Partial<LegalDocument>[]>(DEMO_DOCUMENTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingDoc, setEditingDoc] = useState<Partial<LegalDocument> | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filteredDocs = documents.filter(
    (d) =>
      d.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.document_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc?.title) return;

    if (isCreating) {
      const newDoc: Partial<LegalDocument> = {
        ...editingDoc,
        id: `doc-custom-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setDocuments([newDoc, ...documents]);
    } else {
      setDocuments(
        documents.map((d) => (d.id === editingDoc.id ? { ...editingDoc, updated_at: new Date().toISOString() } : d))
      );
    }

    setEditingDoc(null);
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa văn bản này không?')) {
      setDocuments(documents.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Danh sách văn bản pháp luật</h2>
          <p className="text-xs text-gray-500">Quản lý, chỉnh sửa metadata và trạng thái hiệu lực</p>
        </div>

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
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Thêm văn bản mới
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg max-w-md">
        <Search className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm theo số ký hiệu hoặc tên văn bản..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs outline-none flex-1 text-gray-800 placeholder:text-gray-400"
        />
      </div>

      {/* Document Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold">
            <tr>
              <th className="p-3">Số / Ký hiệu</th>
              <th className="p-3">Tên văn bản</th>
              <th className="p-3">Loại</th>
              <th className="p-3">Ngày ban hành</th>
              <th className="p-3">Hiệu lực</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50/80">
                <td className="p-3 font-mono font-semibold text-blue-900 whitespace-nowrap">
                  {doc.document_number || '---'}
                </td>
                <td className="p-3 font-medium text-gray-800 max-w-xs truncate">
                  {doc.title}
                </td>
                <td className="p-3 whitespace-nowrap">
                  {DOCUMENT_TYPE_LABELS[doc.document_type || 'khac']}
                </td>
                <td className="p-3 text-gray-500 whitespace-nowrap">
                  {formatDate(doc.issued_date)}
                </td>
                <td className="p-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${DOCUMENT_STATUS_COLORS[doc.status || 'hieu_luc']}`}>
                    {DOCUMENT_STATUS_LABELS[doc.status || 'hieu_luc']}
                  </span>
                </td>
                <td className="p-3 text-right space-x-1 whitespace-nowrap">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingDoc(doc);
                    }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id!)}
                    className="p-1 hover:bg-red-50 text-red-500 rounded"
                    title="Xóa văn bản"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
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
