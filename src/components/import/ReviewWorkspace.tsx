'use client';

import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  RotateCw,
  ArrowLeft,
  Sparkles,
  Link2,
  Copy,
  Save,
  Check,
  XCircle,
  Download,
} from 'lucide-react';
import { downloadLegalDocxFile } from '@/lib/document-import/docx-exporter';
import { ImportedDocument, NormalizationChange, DuplicateResolution } from '@/lib/document-import/types';
import { DiffViewer } from './DiffViewer';

interface ReviewWorkspaceProps {
  queue: ImportedDocument[];
  currentDocId: string;
  onSelectDoc: (id: string) => void;
  onApproveDoc: (updatedDoc: ImportedDocument, resolution?: DuplicateResolution) => void;
  onSaveDraftDoc: (updatedDoc: ImportedDocument) => void;
  onReprocessDoc: (id: string) => void;
  onSkipDoc: (id: string) => void;
  onBackToQueue: () => void;
}

export function ReviewWorkspace({
  queue,
  currentDocId,
  onSelectDoc,
  onApproveDoc,
  onSaveDraftDoc,
  onReprocessDoc,
  onSkipDoc,
  onBackToQueue,
}: ReviewWorkspaceProps) {
  const currentDoc = queue.find((d) => d.id === currentDocId) || queue[0];

  // Editable metadata state for the current document
  const [docType, setDocType] = useState<string>(currentDoc?.detectedDocumentType || 'cong_van');
  const [docNumber, setDocNumber] = useState<string>(currentDoc?.detectedDocumentNumber || '');
  const [standardTitle, setStandardTitle] = useState<string>(currentDoc?.standardTitle || currentDoc?.detectedTitle || '');
  const [suggestedFileName, setSuggestedFileName] = useState<string>(currentDoc?.suggestedFileName || '');
  const [issuingBody, setIssuingBody] = useState<string>(currentDoc?.detectedIssuingBody || '');
  const [signer, setSigner] = useState<string>(currentDoc?.detectedSigner || '');
  const [issuedDate, setIssuedDate] = useState<string>(currentDoc?.detectedIssuedDate || '');
  const [effectiveDate, setEffectiveDate] = useState<string>(currentDoc?.detectedEffectiveDate || '');
  const [summary, setSummary] = useState<string>(currentDoc?.detectedSummary || '');
  const [duplicateResolution, setDuplicateResolution] = useState<DuplicateResolution>('skip');

  // Preview tab state: 'original' | 'raw_text' | 'normalized' | 'diff'
  const [previewTab, setPreviewTab] = useState<'original' | 'raw_text' | 'normalized' | 'diff'>('normalized');
  const [changesList, setChangesList] = useState<NormalizationChange[]>(currentDoc?.changes || []);

  if (!currentDoc) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Không tìm thấy văn bản để kiểm duyệt.</p>
        <button onClick={onBackToQueue} className="mt-4 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const handleAcceptChange = (changeId: string) => {
    setChangesList((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, status: 'accepted' } : c))
    );
  };

  const handleRejectChange = (changeId: string) => {
    setChangesList((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, status: 'rejected' } : c))
    );
  };

  const getUpdatedDocument = (): ImportedDocument => {
    return {
      ...currentDoc,
      detectedDocumentType: docType,
      detectedDocumentNumber: docNumber,
      standardTitle,
      suggestedFileName,
      detectedIssuingBody: issuingBody,
      detectedSigner: signer,
      detectedIssuedDate: issuedDate,
      detectedEffectiveDate: effectiveDate,
      detectedSummary: summary,
      changes: changesList,
      reviewedBy: 'Chuyên viên Kiểm toán & Pháp chế',
      reviewedAt: new Date().toISOString(),
    };
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToQueue}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại hàng chờ</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-800 truncate max-w-md">
            Kiểm duyệt: {currentDoc.originalFileName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSkipDoc(currentDoc.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 rounded text-xs font-semibold transition-colors"
            title="Bỏ qua không nhập tệp này"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Bỏ qua file</span>
          </button>
          <button
            type="button"
            onClick={() => downloadLegalDocxFile(getUpdatedDocument())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 hover:bg-blue-100 rounded text-xs font-semibold transition-colors cursor-pointer"
            title="Chuyển đổi văn bản sang định dạng Word (.docx) chuẩn thể thức Nghị định 30/2020"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Word (.docx)</span>
          </button>
          <button
            type="button"
            onClick={() => onReprocessDoc(currentDoc.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Xử lý lại</span>
          </button>
          <button
            type="button"
            onClick={() => onSaveDraftDoc(getUpdatedDocument())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded text-xs font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu nháp</span>
          </button>
          <button
            type="button"
            onClick={() => onApproveDoc(getUpdatedDocument(), duplicateResolution)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Phê duyệt & Nhập vào thư viện</span>
          </button>
        </div>
      </div>

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1 (LEFT): Batch Files List */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
            Tệp trong đợt ({queue.length})
          </div>
          <div className="divide-y divide-slate-100">
            {queue.map((item) => {
              const isSelected = item.id === currentDoc.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectDoc(item.id)}
                  className={`w-full text-left p-3 text-xs transition-colors flex flex-col gap-1 ${
                    isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-medium text-slate-900 truncate">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${item.fileExtension === 'pdf' ? 'text-red-500' : 'text-blue-500'}`} />
                    <span className="truncate">{item.originalFileName}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>.{item.fileExtension.toUpperCase()}</span>
                    {item.extractionStatus === 'approved' ? (
                      <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Đã duyệt
                      </span>
                    ) : item.extractionStatus === 'duplicate' ? (
                      <span className="text-purple-600 font-semibold">Trùng</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Cần duyệt</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2 (CENTER): Content Preview & Diff */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden border-r border-slate-200">
          {/* Preview Tabs */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-1 bg-slate-200/70 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewTab('normalized')}
                className={`px-3 py-1 rounded-md transition-all ${
                  previewTab === 'normalized'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bản chuẩn hóa
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('diff')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1 ${
                  previewTab === 'diff'
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>So sánh thay đổi ({changesList.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('raw_text')}
                className={`px-3 py-1 rounded-md transition-all ${
                  previewTab === 'raw_text'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Text trích xuất
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('original')}
                className={`px-3 py-1 rounded-md transition-all ${
                  previewTab === 'original'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bản gốc
              </button>
            </div>

            <div className="text-[11px] text-slate-500">
              Độ tin cậy trích xuất:{' '}
              <span className="font-bold text-slate-800">
                {((currentDoc.extractionConfidence || 0.95) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Preview Tab Body */}
          <div className="flex-1 p-6 overflow-y-auto">
            {previewTab === 'normalized' && (
              <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed font-sans space-y-4">
                {currentDoc.htmlContent ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: currentDoc.htmlContent }}
                    className="document-body"
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{currentDoc.normalizedText}</div>
                )}
              </div>
            )}

            {previewTab === 'diff' && (
              <DiffViewer
                originalText={currentDoc.cleanText || currentDoc.rawText || ''}
                normalizedText={currentDoc.normalizedText || ''}
                changes={changesList}
                onAcceptChange={handleAcceptChange}
                onRejectChange={handleRejectChange}
              />
            )}

            {previewTab === 'raw_text' && (
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-200">
                {currentDoc.rawText || 'Không có văn bản thô.'}
              </pre>
            )}

            {previewTab === 'original' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Tệp nguồn: {currentDoc.originalFileName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                  <div>MIME Type: <span className="font-mono">{currentDoc.originalMimeType}</span></div>
                  <div>Dung lượng: <span className="font-mono">{(currentDoc.originalSize / 1024).toFixed(1)} KB</span></div>
                  <div>Content Hash: <span className="font-mono truncate">{currentDoc.originalHash}</span></div>
                  <div>Phương thức: <span className="font-semibold">{currentDoc.extractionMethod}</span></div>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded text-slate-700 text-xs">
                  {currentDoc.rawText?.slice(0, 1000)}...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3 (RIGHT): Editable Metadata & Conflicts */}
        <div className="w-80 bg-white flex flex-col shrink-0 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Conflicts and Warnings */}
          {currentDoc.conflicts && currentDoc.conflicts.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Phát hiện xung đột thông tin</span>
              </div>
              {currentDoc.conflicts.map((conf, idx) => (
                <div key={idx} className="text-[11px] text-amber-800 space-y-1">
                  <p>{conf.reason}</p>
                </div>
              ))}
            </div>
          )}

          {/* Duplicate Detection Alert */}
          {currentDoc.duplicateInfo?.isDuplicate && (
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-purple-900">
                <Copy className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Trùng văn bản trong thư viện</span>
              </div>
              <p className="text-[11px] text-purple-800">{currentDoc.duplicateInfo.details}</p>
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-semibold text-purple-900">Tùy chọn xử lý:</label>
                <select
                  value={duplicateResolution}
                  onChange={(e) => setDuplicateResolution(e.target.value as DuplicateResolution)}
                  className="w-full p-1.5 bg-white border border-purple-200 rounded text-xs text-purple-900"
                >
                  <option value="skip">Bỏ qua (Không nhập lại)</option>
                  <option value="attach_as_source">Gắn làm bản nguồn bổ sung</option>
                  <option value="replace_document">Thay thế file nhưng giữ lịch sử</option>
                  <option value="import_separate">Nhập thành tài liệu riêng</option>
                </select>
              </div>
            </div>
          )}

          {/* Editable Metadata Form */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 pb-1 border-b border-slate-200">
              Thông tin pháp lý nhận diện
            </h3>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Loại văn bản:</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-slate-800 bg-white"
              >
                <option value="luat">Luật</option>
                <option value="nghi_dinh">Nghị định</option>
                <option value="thong_tu">Thông tư</option>
                <option value="quyet_dinh">Quyết định</option>
                <option value="cong_van">Công văn</option>
                <option value="van_ban_hop_nhat">Văn bản hợp nhất</option>
                <option value="nghi_quyet">Nghị quyết</option>
                <option value="chi_thi">Chỉ thị</option>
                <option value="thong_bao">Thông báo</option>
                <option value="khac">Tài liệu tham khảo / Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Số / Ký hiệu:</label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="VD: 2231/BTC-TCT"
                className="w-full p-2 border border-slate-300 rounded font-mono font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Tên văn bản chuẩn:</label>
              <textarea
                rows={2}
                value={standardTitle}
                onChange={(e) => setStandardTitle(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Tên file đề xuất:</label>
              <input
                type="text"
                value={suggestedFileName}
                onChange={(e) => setSuggestedFileName(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded font-mono text-[11px] text-slate-700 bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Cơ quan ban hành:</label>
              <input
                type="text"
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
                placeholder="VD: Tổng cục Thuế"
                className="w-full p-2 border border-slate-300 rounded text-slate-800"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Người ký & Chức vụ:</label>
              <input
                type="text"
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="VD: Nguyễn Văn Cường"
                className="w-full p-2 border border-slate-300 rounded text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Ngày ban hành:</label>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded text-slate-800"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-medium mb-1">Ngày hiệu lực:</label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1">Trích yếu / Tóm tắt:</label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-slate-800"
              />
            </div>

            {/* Referenced Documents */}
            {currentDoc.referencedDocuments && currentDoc.referencedDocuments.length > 0 && (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Văn bản viện dẫn / giới thiệu:</span>
                </label>
                <div className="space-y-1">
                  {currentDoc.referencedDocuments.map((ref, idx) => (
                    <div key={idx} className="p-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                      <span className="font-semibold text-blue-700">{ref.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
