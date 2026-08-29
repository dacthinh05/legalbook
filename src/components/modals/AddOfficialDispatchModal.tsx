'use client';

import { useState } from 'react';
import { X, Upload, Send, Link2, Sparkles } from 'lucide-react';
import type { LegalDocument } from '@/types';

interface AddOfficialDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentDocument?: LegalDocument | null;
  onSaveDispatch: (newDispatch: Partial<LegalDocument>, relationNotes: string) => void;
}

export function AddOfficialDispatchModal({
  isOpen,
  onClose,
  parentDocument,
  onSaveDispatch,
}: AddOfficialDispatchModalProps) {
  const [docNumber, setDocNumber] = useState('');
  const [title, setTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('Tổng cục Thuế');
  const [signer, setSigner] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [relationNotes, setRelationNotes] = useState(
    parentDocument ? `Giải đáp vướng mắc và hướng dẫn thực hiện ${parentDocument.document_number}` : ''
  );
  const [summary, setSummary] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isAiExtracting, setIsAiExtracting] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsAiExtracting(true);

    // Mock quick auto-extraction from file name / content
    setTimeout(() => {
      const name = selectedFile.name.replace(/\.[^/.]+$/, '');
      if (!title) {
        setTitle(`Công văn hướng dẫn về ${name}`);
      }
      if (!docNumber && name.includes('/')) {
        const match = name.match(/([0-9]+\/[A-Z0-9\-_]+)/i);
        if (match) setDocNumber(match[1]);
      }
      if (!summary) {
        setSummary(`Văn bản hướng dẫn nghiệp vụ và giải quyết tình huống phát sinh tại doanh nghiệp theo tệp ${selectedFile.name}.`);
      }
      if (!htmlContent) {
        setHtmlContent(`<h2>Nội dung Công văn ${docNumber || selectedFile.name}</h2><p>Kính gửi: Các doanh nghiệp và đơn vị liên quan.</p><p>Căn cứ quy định tại <strong>${parentDocument?.document_number || 'văn bản hiện hành'}</strong>, cơ quan thuế hướng dẫn như sau:</p><p>${summary || 'Nội dung hướng dẫn chi tiết theo tệp gốc đính kèm.'}</p>`);
      }
      setIsAiExtracting(false);
    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim() || !title.trim()) return;

    const newDispatch: Partial<LegalDocument> = {
      id: `doc-cv-${Date.now()}`,
      title: title.trim(),
      document_number: docNumber.trim(),
      document_type: 'cong_van',
      issuing_body: issuingBody.trim(),
      signer: signer.trim() || null,
      issued_date: issuedDate,
      effective_date: issuedDate,
      status: 'hieu_luc',
      summary_main: summary.trim() || title.trim(),
      summary_new_points: 'Hướng dẫn giải quyết trường hợp cụ thể phát sinh trong thực tế.',
      summary_affected_parties: 'Doanh nghiệp và tổ chức có tình huống tương tự.',
      summary_accounting_impact: 'Hạch toán theo hướng dẫn cụ thể của công văn.',
      summary_is_ai_generated: true,
      html_content: htmlContent ? htmlContent.trim() : null,
      is_published: true,
      review_status: 'published',
      files: file
        ? [
            {
              id: `file-${Date.now()}`,
              document_id: `doc-cv-${Date.now()}`,
              file_type: file.name.endsWith('.pdf') ? 'pdf' : 'docx',
              file_url: URL.createObjectURL(file),
              file_size: file.size,
              original_filename: file.name,
              is_primary: true,
              version: 1,
              uploaded_by: null,
              created_at: new Date().toISOString(),
            },
          ]
        : [],
    };

    onSaveDispatch(newDispatch, relationNotes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold">
                TẦNG 4
              </span>
              <h3 className="text-base font-bold text-gray-900">Bỏ Công văn vào kho Ebook</h3>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              Thêm công văn giải đáp / hướng dẫn và gắn trực tiếp vào cây phân cấp pháp lý
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parent relation banner */}
        {parentDocument && (
          <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-900">
            <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Công văn này sẽ được tự động liên kết và phân cấp dưới:
              <strong className="ml-1 text-blue-800 font-bold">
                {parentDocument.document_number} — {parentDocument.title}
              </strong>
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* File Upload Dropzone */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              1. Tải tệp công văn (.PDF, .DOC, .DOCX) — <span className="text-gray-500 font-normal">Tự động nhận diện</span>
            </label>
            <div className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-xl p-4 text-center hover:border-amber-500 transition-colors relative">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-6 h-6 mx-auto mb-1 text-amber-600" />
              <p className="font-semibold text-gray-800">
                {file ? file.name : 'Kéo thả tệp công văn vào đây hoặc bấm để chọn'}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Hỗ trợ file scan PDF, Microsoft Word .doc/.docx
              </p>
              {isAiExtracting && (
                <div className="flex items-center justify-center gap-1.5 text-blue-600 font-semibold mt-2 text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Đang phân tích và trích xuất dữ liệu...
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Số / Ký hiệu công văn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="VD: 1585/QTR-QLDN2, 572/TCT-CS..."
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Cơ quan ban hành <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
                placeholder="VD: Tổng cục Thuế, Cục Thuế TP.HCM..."
                required
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Trích yếu / Tên công văn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Công văn về việc hoàn thuế giá trị gia tăng hàng hóa xuất khẩu sau 01/07/2025"
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ngày ban hành</label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => setIssuedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Người ký (nếu có)</label>
              <input
                type="text"
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="VD: Nguyễn Trung Thành (Phó Cục trưởng)"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Mối quan hệ / Ghi chú hướng dẫn
            </label>
            <input
              type="text"
              value={relationNotes}
              onChange={(e) => setRelationNotes(e.target.value)}
              placeholder="VD: Hướng dẫn chi tiết thủ tục khấu trừ theo Thông tư 69/2025..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">
              Tóm tắt nội dung giải đáp & Điểm cần lưu ý
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn nội dung hướng dẫn của công văn đối với doanh nghiệp..."
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Hủy bỏ
          </button>

          <button
            onClick={handleSubmit}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            Lưu & Đưa vào Ebook
          </button>
        </div>
      </div>
    </div>
  );
}
