'use client';

import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  FileText,
  Globe,
  Loader2,
  Download,
  Headphones,
  ExternalLink,
} from 'lucide-react';
import { generateNotebookLmBundle } from '@/lib/notebooklm/corpus-bundler';
import { NOTEBOOKLM_URL } from '@/lib/utils';
import { DropzoneArea } from '@/components/import/DropzoneArea';
import { BatchQueueList } from '@/components/import/BatchQueueList';
import { ReviewWorkspace } from '@/components/import/ReviewWorkspace';
import { processUploadedFile } from '@/lib/document-import/import-pipeline';
import { restoreVietnameseLegalText } from '@/lib/document-import/vietnamese-normalizer';
import { detectLegalDocumentMetadata } from '@/lib/document-import/legal-metadata-detector';
import { ImportedDocument } from '@/lib/document-import/types';
import type { LegalDocument, DocumentType, DocumentStatus } from '@/types';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';

export default function AdminUploadPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'url'>('upload');
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

  const handleFilesSelected = async (files: File[]) => {
    const newItems: ImportedDocument[] = [];

    for (const file of files) {
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

  const handleApproveDocument = (approvedDoc: ImportedDocument) => {
    const docId = `doc-imp-${Date.now()}`;
    const newLegalDoc: LegalDocument = {
      id: docId,
      title: approvedDoc.standardTitle || approvedDoc.detectedTitle || approvedDoc.originalFileName,
      document_number: approvedDoc.detectedDocumentNumber || null,
      document_type: (approvedDoc.detectedDocumentType || 'cong_van') as DocumentType,
      issuing_body: approvedDoc.detectedIssuingBody || 'Bộ Tài chính',
      signer: approvedDoc.detectedSigner || null,
      issued_date: approvedDoc.detectedIssuedDate || new Date().toISOString().slice(0, 10),
      effective_date: approvedDoc.detectedEffectiveDate || approvedDoc.detectedIssuedDate || new Date().toISOString().slice(0, 10),
      expiry_date: null,
      status: 'hieu_luc' as DocumentStatus,
      html_content: approvedDoc.htmlContent || `<div class="document-full-body"><p>${approvedDoc.normalizedText || ''}</p></div>`,
      summary_main: approvedDoc.detectedSummary || approvedDoc.standardTitle || '',
      summary_new_points: 'Văn bản đã được kiểm duyệt và nhập từ tệp ' + approvedDoc.originalFileName,
      summary_affected_parties: null,
      summary_accounting_impact: null,
      summary_audit_impact: null,
      summary_actions_needed: null,
      summary_is_ai_generated: false,
      official_source_url: null,
      is_deleted: false,
      is_published: true,
      review_status: 'published',
      view_count: 0,
      created_by: 'Chuyên viên Pháp chế',
      files: [
        {
          id: `file-${Date.now()}`,
          document_id: docId,
          file_type: approvedDoc.fileExtension === 'pdf' ? 'pdf' : 'docx',
          file_url: approvedDoc.fileUrl || `/documents/${approvedDoc.suggestedFileName || approvedDoc.originalFileName}`,
          file_size: approvedDoc.originalSize,
          original_filename: approvedDoc.originalFileName,
          is_primary: true,
          version: 1,
          uploaded_by: 'Chuyên viên Pháp chế',
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    DEMO_DOCUMENTS.unshift(newLegalDoc);

    setQueue((prev) =>
      prev.map((d) => (d.id === approvedDoc.id ? { ...d, extractionStatus: 'approved' } : d))
    );

    setSuccessMessage(`Đã phê duyệt và lưu văn bản "${newLegalDoc.title}" vào thư viện LegalBook.`);
    setReviewingDocId(null);
  };

  const handleSaveDraftDocument = (draftDoc: ImportedDocument) => {
    setQueue((prev) =>
      prev.map((d) => (d.id === draftDoc.id ? { ...draftDoc, extractionStatus: 'review' } : d))
    );
    setSuccessMessage(`Đã lưu nháp văn bản "${draftDoc.standardTitle}".`);
    setReviewingDocId(null);
  };

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

  if (reviewingDocId) {
    return (
      <div className="h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
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
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">
            Tự động OCR & Chuyển đổi PDF Scan sang Word (.docx)
          </h2>
          <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[11px] font-semibold rounded-full border border-blue-200">
            OCR & DOCX Engine
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Tự động nhận diện OCR cho tệp PDF scan ảnh, chuẩn hóa tiếng Việt có dấu, bóc tách metadata và chuyển đổi tức thời sang tệp Microsoft Word (.docx) chuẩn thể thức Nghị định 30/2020/NĐ-CP.
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
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

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-800">
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

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-2xs space-y-6">
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
          <div className="space-y-4 max-w-3xl">
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
                rows={10}
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
              {isProcessingPaste ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Phân tích và kiểm duyệt nội dung</span>
            </button>
          </div>
        )}

        {activeTab === 'url' && (
          <div className="space-y-4 max-w-2xl">
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

      {/* ── Google NotebookLM Export & Sync Card ── */}
      <div className="p-4 sm:p-5 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-slate-50 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200/80 text-purple-900 border border-purple-300 uppercase tracking-wide">
                Google NotebookLM Integration
              </span>
              <span className="text-xs text-slate-500 font-mono">50 Top Documents</span>
            </div>
            <h3 className="font-bold text-sm text-slate-900">
              📦 Xuất kho dữ liệu đồng bộ Sổ tay Google NotebookLM
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Tự động đóng gói và làm sạch 50 văn bản pháp luật trọng tâm thành 1 tệp Markdown chuẩn cấu trúc tiêu đề. Bạn có thể tải về và nạp ngay vào Google NotebookLM để tạo Audio Overview và hỏi đáp tổng hợp đa văn bản.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const bundle = generateNotebookLmBundle(DEMO_DOCUMENTS as unknown as LegalDocument[], 50);
                const blob = new Blob([bundle.markdownContent], { type: 'text/markdown;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', bundle.filename);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setSuccessMessage(`Đã xuất thành công tệp ${bundle.filename} (${bundle.totalDocuments} văn bản, ~${bundle.estimatedTokens.toLocaleString()} tokens).`);
                setTimeout(() => setSuccessMessage(null), 4000);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải Bundle (.md)</span>
            </button>

            <a
              href={NOTEBOOKLM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5 text-purple-600" />
              <span>Mở NotebookLM</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
