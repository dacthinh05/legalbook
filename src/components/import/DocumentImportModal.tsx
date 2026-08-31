'use client';

import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Globe,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DropzoneArea } from './DropzoneArea';
import { BatchQueueList } from './BatchQueueList';
import { ReviewWorkspace } from './ReviewWorkspace';
import { processUploadedFile } from '@/lib/document-import/import-pipeline';
import { restoreVietnameseLegalText } from '@/lib/document-import/vietnamese-normalizer';
import { detectLegalDocumentMetadata } from '@/lib/document-import/legal-metadata-detector';
import { ImportedDocument } from '@/lib/document-import/types';
import type { LegalDocument, DocumentType, DocumentStatus } from '@/types';
import { saveDocument } from '@/lib/data-service';
interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentImported?: (newDoc: Partial<LegalDocument>) => void;
}

export function DocumentImportModal({
  isOpen,
  onClose,
  onDocumentImported,
}: DocumentImportModalProps) {
  // Modal tabs: 'upload' | 'paste' | 'url'
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'url'>('upload');

  // Batch queue state
  const [queue, setQueue] = useState<ImportedDocument[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);

  // Paste Tab State
  const [pastedText, setPastedText] = useState('');
  const [pastedDocNumber, setPastedDocNumber] = useState('');
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);

  // URL Tab State
  const [sourceUrl, setSourceUrl] = useState('');
  const [isProcessingUrl, setIsProcessingUrl] = useState(false);

  // Success Notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle files selected from Dropzone
  const handleFilesSelected = async (files: File[]) => {
    const newItems: ImportedDocument[] = [];

    for (const file of files) {
      // Check if file with identical name and size is already in the queue
      const isAlreadyInQueue = queue.some(
        (item) => item.originalFileName === file.name && item.originalSize === file.size
      );
      if (isAlreadyInQueue) continue;

      const buffer = new Uint8Array(await file.arrayBuffer());
      const docId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const ext = (file.name.split('.').pop()?.toLowerCase() || 'docx') as 'doc' | 'docx' | 'pdf';

      newItems.push({
        id: docId,
        originalFileName: file.name,
        originalMimeType: file.type || 'application/octet-stream',
        originalSize: file.size,
        originalHash: '',
        originalStorageKey: `imports/${docId}/${file.name}`,
        fileExtension: ext,
        fileBuffer: buffer,
        fileUrl: URL.createObjectURL(file),
        extractionStatus: 'pending',
        statusMessage: 'Chờ xử lý...',
        warnings: [],
        createdBy: 'Chuyên viên Pháp chế',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  // Process a single file in queue
  const handleProcessSingle = async (id: string) => {
    const item = queue.find((d) => d.id === id);
    if (!item || !item.fileBuffer) return;

    setQueue((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, extractionStatus: 'extracting', statusMessage: 'Đang đọc nội dung...' } : d
      )
    );

    const processed = await processUploadedFile(
      { name: item.originalFileName, size: item.originalSize, type: item.originalMimeType },
      item.fileBuffer
    );

    setQueue((prev) =>
      prev.map((d) => (d.id === id ? { ...processed, fileUrl: item.fileUrl } : d))
    );
  };

  // Process all pending files in queue sequentially
  const handleProcessAll = async () => {
    setIsProcessingBatch(true);
    for (const item of queue) {
      if (item.extractionStatus === 'pending' && item.fileBuffer) {
        setQueue((prev) =>
          prev.map((d) =>
            d.id === item.id ? { ...d, extractionStatus: 'extracting', statusMessage: 'Đang đọc nội dung...' } : d
          )
        );

        const processed = await processUploadedFile(
          { name: item.originalFileName, size: item.originalSize, type: item.originalMimeType },
          item.fileBuffer
        );

        setQueue((prev) =>
          prev.map((d) => (d.id === item.id ? { ...processed, fileUrl: item.fileUrl } : d))
        );
      }
    }
    setIsProcessingBatch(false);
  };

  const handleRemoveSingle = (id: string) => {
    setQueue((prev) => prev.filter((d) => d.id !== id));
    if (reviewingDocId === id) setReviewingDocId(null);
  };

  const handleClearAll = () => {
    setQueue([]);
    setReviewingDocId(null);
  };

  // Commit and approve document into LegalBook library
  const handleApproveDocument = async (approvedDoc: ImportedDocument) => {
    const newLegalDoc: Partial<LegalDocument> = {
      title: approvedDoc.standardTitle || approvedDoc.detectedTitle || approvedDoc.originalFileName,
      document_number: approvedDoc.detectedDocumentNumber || null,
      document_type: (approvedDoc.detectedDocumentType || 'cong_van') as DocumentType,
      issuing_body: approvedDoc.detectedIssuingBody || 'Bộ Tài chính',
      signer: approvedDoc.detectedSigner || null,
      issued_date: approvedDoc.detectedIssuedDate || new Date().toISOString().slice(0, 10),
      effective_date: approvedDoc.detectedEffectiveDate || approvedDoc.detectedIssuedDate || new Date().toISOString().slice(0, 10),
      status: 'hieu_luc' as DocumentStatus,
      html_content: approvedDoc.htmlContent || `<div class="document-full-body"><p>${approvedDoc.normalizedText || ''}</p></div>`,
      summary_main: approvedDoc.detectedSummary || approvedDoc.standardTitle || '',
      summary_new_points: 'Văn bản đã được kiểm duyệt và nhập từ tệp ' + approvedDoc.originalFileName,
      is_deleted: false,
      is_published: true,
      review_status: 'published',
    };

    const attachments = [
      {
        fileBuffer: approvedDoc.fileBuffer,
        originalFileName: approvedDoc.suggestedFileName || approvedDoc.originalFileName,
        fileType: (approvedDoc.fileExtension === 'pdf' ? 'pdf' : 'docx') as 'pdf' | 'docx',
        fileSize: approvedDoc.originalSize,
        isPrimary: true,
      },
    ];

    const res = await saveDocument(newLegalDoc, attachments);

    if (!res.success) {
      alert(`Lỗi phê duyệt văn bản: ${res.error}`);
      return;
    }

    setQueue((prev) =>
      prev.map((d) => (d.id === approvedDoc.id ? { ...d, extractionStatus: 'approved' } : d))
    );

    if (res.isUpdatedExisting) {
      setSuccessMessage(`Đã phát hiện văn bản cùng số hiệu (${res.data?.document_number || ''}) và CẬP NHẬT thành công vào CSDL.`);
    } else {
      setSuccessMessage(`Đã phê duyệt và lưu văn bản mới "${newLegalDoc.title}" vào CSDL.`);
    }
    onDocumentImported?.(res.data || (newLegalDoc as LegalDocument));
    setReviewingDocId(null);
  };

  const handleSaveDraftDocument = (draftDoc: ImportedDocument) => {
    setQueue((prev) =>
      prev.map((d) => (d.id === draftDoc.id ? { ...draftDoc, extractionStatus: 'review' } : d))
    );
    setSuccessMessage(`Đã lưu nháp văn bản "${draftDoc.standardTitle}".`);
    setReviewingDocId(null);
  };

  // Handle Paste Tab
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) return;
    setIsProcessingPaste(true);

    const { normalizedText, changes } = restoreVietnameseLegalText(pastedText);
    const metadata = detectLegalDocumentMetadata(normalizedText, pastedDocNumber || 'van-ban-dan.docx');

    const newDocId = `imp_paste_${Date.now()}`;
    const newDoc: ImportedDocument = {
      id: newDocId,
      originalFileName: 'Nội dung dán trực tiếp.docx',
      originalMimeType: 'text/plain',
      originalSize: pastedText.length,
      originalHash: `hash_${pastedText.length}`,
      originalStorageKey: `imports/${newDocId}/pasted.docx`,
      fileExtension: 'docx',
      extractionStatus: 'review',
      statusMessage: 'Đã nhận diện từ nội dung dán.',
      rawText: pastedText,
      cleanText: pastedText,
      normalizedText,
      htmlContent: `<div class="document-full-body">${normalizedText.split('\n\n').map(p => `<p class="mb-3">${p}</p>`).join('')}</div>`,
      detectedDocumentType: metadata.documentType,
      detectedDocumentNumber: metadata.documentNumber || pastedDocNumber || undefined,
      detectedYear: metadata.year || undefined,
      detectedIssuingBody: metadata.issuingBody || undefined,
      detectedTitle: metadata.title,
      standardTitle: metadata.standardTitle,
      suggestedFileName: metadata.suggestedFileName,
      detectedSummary: metadata.summary || undefined,
      changes,
      warnings: metadata.warnings,
      createdBy: 'Chuyên viên Pháp chế',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQueue((prev) => [newDoc, ...prev]);
    setIsProcessingPaste(false);
    setActiveTab('upload');
    setReviewingDocId(newDocId);
    setPastedText('');
  };

  // Handle URL Tab
  const handleProcessUrl = () => {
    if (!sourceUrl.trim()) return;
    setIsProcessingUrl(true);

    setTimeout(() => {
      const sampleText = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nSố: 15/2026/TT-BTC\nHà Nội, ngày 18 tháng 05 năm 2026\n\nTHÔNG TƯ\nQuy định về quản lý hóa đơn chứng từ điện tử đối với doanh nghiệp\n\nCăn cứ Luật Quản lý thuế số 38/2019/QH14;\nCăn cứ Nghị định số 123/2020/NĐ-CP;\n\nĐiều 1. Phạm vi điều chỉnh\nThông tư này hướng dẫn về việc phát hành và sử dụng hóa đơn điện tử.`;
      const { normalizedText, changes } = restoreVietnameseLegalText(sampleText);
      const metadata = detectLegalDocumentMetadata(normalizedText, 'van-ban-url.pdf');

      const newDocId = `imp_url_${Date.now()}`;
      const newDoc: ImportedDocument = {
        id: newDocId,
        originalFileName: sourceUrl.split('/').pop() || 'van-ban-nguon.pdf',
        originalMimeType: 'application/pdf',
        originalSize: 45000,
        originalHash: `hash_url_${Date.now()}`,
        originalStorageKey: `imports/${newDocId}/url_source.pdf`,
        fileExtension: 'pdf',
        extractionStatus: 'review',
        statusMessage: 'Đã trích xuất từ URL.',
        rawText: sampleText,
        cleanText: sampleText,
        normalizedText,
        htmlContent: `<div class="document-full-body">${sampleText.split('\n\n').map(p => `<p class="mb-3">${p}</p>`).join('')}</div>`,
        detectedDocumentType: metadata.documentType,
        detectedDocumentNumber: metadata.documentNumber || undefined,
        detectedYear: metadata.year || undefined,
        detectedIssuingBody: metadata.issuingBody || undefined,
        detectedTitle: metadata.title,
        standardTitle: metadata.standardTitle,
        suggestedFileName: metadata.suggestedFileName,
        detectedSummary: metadata.summary || undefined,
        changes,
        warnings: metadata.warnings,
        createdBy: 'Chuyên viên Pháp chế',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setQueue((prev) => [newDoc, ...prev]);
      setIsProcessingUrl(false);
      setActiveTab('upload');
      setReviewingDocId(newDocId);
      setSourceUrl('');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Nhập văn bản pháp luật
              </h2>
              <p className="text-[11px] text-slate-500">
                Tải tệp Word/PDF &bull; Nhận diện số hiệu, cơ quan &bull; Chuẩn hóa tiếng Việt &bull; Kiểm duyệt trước khi lưu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ nhập văn bản"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If inside 3-Column Review Workspace */}
        {reviewingDocId ? (
          <div className="flex-1 overflow-hidden">
            <ReviewWorkspace
              queue={queue}
              currentDocId={reviewingDocId}
              onSelectDoc={(id) => setReviewingDocId(id)}
              onApproveDoc={handleApproveDocument}
              onSaveDraftDoc={handleSaveDraftDocument}
              onReprocessDoc={handleProcessSingle}
              onSkipDoc={handleRemoveSingle}
              onBackToQueue={() => setReviewingDocId(null)}
            />
          </div>
        ) : (
          /* Normal Tabbed Import Flow */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Header */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold text-xs transition-colors ${
                  activeTab === 'upload'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải file</span>
                {queue.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded-full text-[10px]">
                    {queue.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold text-xs transition-colors ${
                  activeTab === 'paste'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Dán nội dung</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('url')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 font-semibold text-xs transition-colors ${
                  activeTab === 'url'
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Nhập từ URL</span>
              </button>
            </div>

            {/* Success Banner */}
            {successMessage && (
              <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSuccessMessage(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Tab Body */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {activeTab === 'upload' && (
                <div className="space-y-6">
                  <DropzoneArea onFilesSelected={handleFilesSelected} disabled={isProcessingBatch} />

                  <BatchQueueList
                    queue={queue}
                    onProcessAll={handleProcessAll}
                    onProcessSingle={handleProcessSingle}
                    onRemoveSingle={handleRemoveSingle}
                    onClearAll={handleClearAll}
                    onSelectForReview={(doc) => setReviewingDocId(doc.id)}
                    isProcessingBatch={isProcessingBatch}
                  />
                </div>
              )}

              {activeTab === 'paste' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Số hiệu / Gợi ý (tùy chọn):</label>
                    <input
                      type="text"
                      placeholder="VD: 2231/BTC-TCT"
                      value={pastedDocNumber}
                      onChange={(e) => setPastedDocNumber(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Nội dung toàn văn văn bản:</label>
                    <textarea
                      rows={12}
                      placeholder="Dán toàn văn nội dung văn bản pháp luật vào đây..."
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded text-xs font-sans leading-relaxed"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessPastedText}
                    disabled={!pastedText.trim() || isProcessingPaste}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                  >
                    {isProcessingPaste ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    <span>Phân tích và kiểm duyệt nội dung</span>
                  </button>
                </div>
              )}

              {activeTab === 'url' && (
                <div className="space-y-4 max-w-2xl mx-auto pt-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Đường dẫn URL văn bản chính thức:</label>
                    <input
                      type="url"
                      placeholder="https://thuvienphapluat.vn/van-ban/..."
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded text-xs"
                    />
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ thu thập từ Cổng Thông tin điện tử Chính phủ, Bộ Tài chính, Tổng cục Thuế...
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessUrl}
                    disabled={!sourceUrl.trim() || isProcessingUrl}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors"
                  >
                    {isProcessingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                    <span>Trích xuất từ URL</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
