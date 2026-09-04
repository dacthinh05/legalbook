'use client';

import React, { useState, useRef } from 'react';
import {
  Columns,
  FileSearch,
  FileCode2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Link2,
  Link2Off,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DocumentVerificationRecord } from '@/lib/verification/types';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';
import { isSafeUrl } from '@/lib/sanitize';

interface CompareWorkspaceProps {
  documentRecord: DocumentVerificationRecord;
  activeFieldKey?: string | null;
  onSelectField?: (fieldKey: string) => void;
}

export function CompareWorkspace({
  documentRecord,
  activeFieldKey,
  onSelectField,
}: CompareWorkspaceProps) {
  const [viewMode, setViewMode] = useState<'compare' | 'original' | 'extracted'>('compare');
  const [syncScroll, setSyncScroll] = useState<boolean>(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showPdfEmbed, setShowPdfEmbed] = useState<boolean>(false);

  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef<boolean>(false);

  const doc = documentRecord.document;
  const docNumber = doc.document_number || '---';
  const targetField = activeFieldKey ? documentRecord.fields[activeFieldKey] : null;
  const effectivePage = targetField?.sourcePage || currentPage;
  const totalPages = documentRecord.ocrPages?.length || 2;
  const activePageData = documentRecord.ocrPages?.find((p) => p.pageNumber === effectivePage) || documentRecord.ocrPages?.[0];
  const pdfUrl = doc.files?.find((f) => f.file_type === 'pdf')?.file_url;

  // Synchronized scroll handlers
  const handleLeftScroll = () => {
    if (!syncScroll || isSyncingRef.current || !leftScrollRef.current || !rightScrollRef.current) return;
    isSyncingRef.current = true;
    const left = leftScrollRef.current;
    const right = rightScrollRef.current;
    const percentage = left.scrollTop / (left.scrollHeight - left.clientHeight || 1);
    right.scrollTop = percentage * (right.scrollHeight - right.clientHeight);
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 50);
  };

  const handleRightScroll = () => {
    if (!syncScroll || isSyncingRef.current || !leftScrollRef.current || !rightScrollRef.current) return;
    isSyncingRef.current = true;
    const left = leftScrollRef.current;
    const right = rightScrollRef.current;
    const percentage = right.scrollTop / (right.scrollHeight - right.clientHeight || 1);
    left.scrollTop = percentage * (left.scrollHeight - left.clientHeight);
    setTimeout(() => {
      isSyncingRef.current = false;
    }, 50);
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-100/70 overflow-hidden select-text min-w-0">
      {/* Top Workspace Toolbar */}
      <div className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 gap-3 z-10">
        {/* Left: View Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'compare'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Đối chiếu song song</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'original'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Bản gốc</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('extracted')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              viewMode === 'extracted'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>Nội dung trích xuất</span>
          </button>
        </div>

        {/* Center: Page Controls & Sync Scroll Toggle */}
        <div className="flex items-center gap-3">
          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs text-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, effectivePage - 1))}
              disabled={effectivePage <= 1}
              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
              title="Trang trước"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono px-1 font-semibold">
              Trang {effectivePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, effectivePage + 1))}
              disabled={effectivePage >= totalPages}
              className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
              title="Trang tiếp theo"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sync Scroll Toggle (Only relevant in Compare mode) */}
          {viewMode === 'compare' && (
            <button
              type="button"
              onClick={() => setSyncScroll(!syncScroll)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                syncScroll
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
              title="Bật/Tắt cuộn đồng bộ hai vùng"
            >
              {syncScroll ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
              <span>{syncScroll ? 'Cuộn đồng bộ: Bật' : 'Cuộn độc lập'}</span>
            </button>
          )}
        </div>

        {/* Right: Zoom Controls & Source link */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs text-xs text-slate-700">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
              className="p-1 hover:bg-slate-100 rounded"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] px-1.5 w-12 text-center font-medium">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
              className="p-1 hover:bg-slate-100 rounded"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(100)}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 border-l border-slate-100 ml-0.5"
              title="Đặt lại 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {pdfUrl && isSafeUrl(pdfUrl) && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1 transition-colors"
            >
              <span>Mở PDF</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Main Panels Area */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 min-w-0">
        {/* LEFT COLUMN: ORIGINAL SOURCE (Scan / Bounding Box Overlays) */}
        {(viewMode === 'compare' || viewMode === 'original') && (
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden min-w-0">
            {/* Left Header */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span className="font-bold text-slate-900 truncate">
                  Bản gốc · {docNumber}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  (Trang {effectivePage}/{totalPages})
                </span>
              </div>

              {pdfUrl && (
                <button
                  type="button"
                  onClick={() => setShowPdfEmbed(!showPdfEmbed)}
                  className="text-[11px] text-blue-700 hover:underline font-semibold"
                >
                  {showPdfEmbed ? 'Chuyển sang Bounding Box Scan' : 'Chuyển sang PDF nhúng'}
                </button>
              )}
            </div>

            {/* Left Body */}
            <div
              ref={leftScrollRef}
              onScroll={handleLeftScroll}
              className="flex-1 overflow-auto p-6 flex justify-center bg-slate-200/50"
            >
              {showPdfEmbed && pdfUrl && isSafeUrl(pdfUrl) ? (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0 bg-white rounded shadow-md"
                  title={`Bản gốc ${docNumber}`}
                />
              ) : (
                /* High-fidelity Visual Scan Representation with Interactive Bounding Boxes */
                <div
                  className="relative bg-white shadow-lg border border-slate-300 transition-transform origin-top flex flex-col p-10 select-none text-slate-900 rounded-sm"
                  style={{
                    width: `${(600 * zoomLevel) / 100}px`,
                    minHeight: `${(850 * zoomLevel) / 100}px`,
                    fontSize: `${(12.5 * zoomLevel) / 100}px`,
                  }}
                >
                  {/* Watermark / Paper texture accent */}
                  <div className="absolute top-2 right-3 text-[10px] font-mono text-slate-300 uppercase tracking-widest pointer-events-none">
                    LEGALBOOK SCAN ENGINE · OCR V2
                  </div>

                  {effectivePage === 1 ? (
                    <div className="space-y-6 flex-1 flex flex-col">
                      {/* Letterhead & Doc Number */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-sans leading-tight">
                        <div
                          onClick={() => onSelectField?.('issuing_body')}
                          className={`p-2 rounded cursor-pointer transition-all relative border ${
                            activeFieldKey === 'issuing_body'
                              ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                              : 'border-transparent hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <span className="font-bold uppercase tracking-wider block text-slate-900">
                            {doc.issuing_body || 'CỤC THUẾ TỈNH THÁI NGUYÊN'}
                          </span>
                          <span className="text-[10px] block text-slate-400">_______</span>
                          {activeFieldKey === 'issuing_body' && (
                            <span className="absolute -top-2.5 left-2 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded shadow-xs">
                              Cơ quan ban hành (98%)
                            </span>
                          )}
                        </div>

                        {/* Box 2: National Header & Date */}
                        <div className="text-right">
                          <p className="font-bold text-[11px] uppercase tracking-wider text-slate-900">
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </p>
                          <p className="text-[11px] font-bold underline text-slate-800">
                            Độc lập - Tự do - Hạnh phúc
                          </p>
                          <p className="text-[10px] text-slate-400">__________________________</p>

                          {/* Box: Issued Date */}
                          <div
                            onClick={() => onSelectField?.('issued_date')}
                            className={`mt-1.5 p-1.5 rounded cursor-pointer transition-all inline-block border text-left ${
                              activeFieldKey === 'issued_date'
                                ? targetField?.conflictReason
                                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500/40 shadow-xs'
                                  : 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                                : 'border-transparent hover:border-slate-300 hover:bg-slate-50/60'
                            }`}
                          >
                            <span className="italic text-[11px] text-slate-800 font-sans block">
                              {activePageData?.blocks.find((b) => b.blockType === 'date')?.text || 'Thái Nguyên, ngày 26 tháng 01 năm 2026'}
                            </span>
                            {activeFieldKey === 'issued_date' && (
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-bold rounded shadow-xs block mt-0.5 ${
                                  targetField?.conflictReason ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                                }`}
                              >
                                {targetField?.conflictReason
                                  ? `Cảnh báo: ${targetField.conflictReason}`
                                  : `Ngày ban hành (${targetField?.status === 'confirmed' || targetField?.status === 'edited' ? 'Đã xác nhận' : 'Khớp'})`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Box 3: Document Number */}
                      <div
                        onClick={() => onSelectField?.('document_number')}
                        className={`p-2 rounded cursor-pointer transition-all border max-w-fit ${
                          activeFieldKey === 'document_number'
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                            : 'border-transparent hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <span className="font-sans font-bold text-xs text-slate-900">
                          Số: {docNumber}
                        </span>
                        {activeFieldKey === 'document_number' && (
                          <span className="ml-2 px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded">
                            Số hiệu (91%)
                          </span>
                        )}
                      </div>

                      {/* Box 4: Title & Type */}
                      <div
                        onClick={() => onSelectField?.('title')}
                        className={`p-3 text-center rounded cursor-pointer transition-all border ${
                          activeFieldKey === 'title' || activeFieldKey === 'document_type'
                            ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                            : 'border-transparent hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <span className="font-bold text-sm font-sans uppercase tracking-wide block mb-1 text-slate-950">
                          CÔNG VĂN
                        </span>
                        <p className="font-bold text-xs font-sans text-slate-900 leading-snug">
                          {doc.title}
                        </p>
                      </div>

                      {/* Body Paragraphs */}
                      <div
                        onClick={() => onSelectField?.('ocr_content')}
                        className={`p-3 rounded-lg border text-justify leading-relaxed font-sans text-xs text-slate-800 space-y-2 flex-1 cursor-pointer transition-all ${
                          activeFieldKey === 'ocr_content'
                            ? 'bg-blue-50/40 border-blue-400 ring-1 ring-blue-400/20'
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <p><strong>Kính gửi:</strong> Công ty Cổ phần Đầu tư và Phát triển TNG</p>
                        <p className="text-slate-700 text-[11.5px]">
                          Căn cứ Luật Quản lý thuế số 38/2019/QH14; Căn cứ Luật Thuế thu nhập doanh nghiệp số 14/2008/QH12;
                        </p>
                        <p className="text-slate-700 text-[11.5px]">
                          Căn cứ Nghị định số 218/2013/NĐ-CP ngày 26/12/2013 của Chính phủ quy định chi tiết và hướng dẫn thi hành Luật Thuế thu nhập doanh nghiệp;
                        </p>
                        <p className="text-slate-800 text-[11.5px]">
                          Cục Thuế tỉnh trả lời như sau: Đối với các hóa đơn từng lần từ 05 triệu đồng trở lên phải có chứng từ thanh toán không dùng tiền mặt để được tính vào chi phí được trừ khi xác định thu nhập chịu thuế TNDN.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Page 2: Continuation, Recipients & Signatures */
                    <div className="space-y-8 flex-1 flex flex-col">
                      <div
                        onClick={() => onSelectField?.('ocr_content')}
                        className={`p-3 rounded-lg border text-justify leading-relaxed font-sans text-xs text-slate-800 space-y-2 cursor-pointer transition-all ${
                          activeFieldKey === 'ocr_content'
                            ? 'bg-blue-50/40 border-blue-400 ring-1 ring-blue-400/20'
                            : 'border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <p className="text-slate-800 text-[11.5px]">
                          Trường hợp không có chứng từ thanh toán không dùng tiền mặt đối với các hóa đơn từng lần từ 05 triệu đồng trở lên thì toàn bộ giá trị khoản chi đó không được tính vào chi phí được trừ khi xác định thuế TNDN.
                        </p>
                        <p className="text-slate-800 text-[11.5px]">
                          Cục Thuế tỉnh thông báo để Quý Công ty biết và thực hiện theo đúng quy định pháp luật./.
                        </p>
                      </div>
                      {/* Bottom Split: Recipients (Left) and Signature (Right) */}
                      <div className="mt-auto grid grid-cols-2 gap-4 font-sans text-xs pt-8 border-t border-slate-100">
                        <div
                          onClick={() => onSelectField?.('recipient')}
                          className={`p-2 rounded cursor-pointer transition-all border text-[11px] ${
                            activeFieldKey === 'recipient'
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                              : 'border-transparent hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <span className="font-bold block mb-1">Nơi nhận:</span>
                          <p className="text-slate-600 leading-tight">
                            - Như trên;<br />
                            - Cục trưởng (để b/c);<br />
                            - Phòng KT-NB;<br />
                            - Lưu: VT, QLDN2.
                          </p>
                          {activeFieldKey === 'recipient' && (
                            <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded mt-1 inline-block">
                              Nơi nhận (92%)
                            </span>
                          )}
                        </div>

                        {/* Signature & Signer */}
                        <div
                          onClick={() => onSelectField?.('signer')}
                          className={`p-3 text-center rounded cursor-pointer transition-all border ${
                            activeFieldKey === 'signer' || activeFieldKey === 'position'
                              ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/40 shadow-xs'
                              : 'border-transparent hover:border-slate-300 hover:bg-slate-50/60'
                          }`}
                        >
                          <p className="font-bold uppercase text-[11px] text-slate-900">KT. CỤC TRƯỞNG</p>
                          <p className="font-bold uppercase text-[11px] text-slate-900 mb-6">PHÓ CỤC TRƯỞNG</p>
                          <div className="inline-block border border-red-500 text-red-600 rounded px-2 py-0.5 text-[9px] font-bold rotate-[-4deg] mb-2 bg-red-50/40">
                            ĐÃ KÝ ĐIỆN TỬ
                          </div>
                          <p className="font-bold text-xs text-slate-950 font-sans">
                            {doc.signer || 'Phạm Đức Huỳnh'}
                          </p>
                          {activeFieldKey === 'signer' && (
                            <span className="px-1.5 py-0.2 bg-blue-600 text-white text-[9px] font-bold rounded mt-1 inline-block">
                              Người ký: {doc.signer || 'Phạm Đức Huỳnh'} (94%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page Footer */}
                  <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Văn bản: {docNumber}</span>
                    <span>Trang {effectivePage}/{totalPages}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: EXTRACTED OCR / HTML PREVIEW */}
        {(viewMode === 'compare' || viewMode === 'extracted') && (
          <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden min-w-0">
            {/* Right Header */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span className="font-bold text-slate-900 truncate">
                  Nội dung trích xuất · {docNumber}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                  Độ tin cậy: {documentRecord.overallConfidence}%
                </span>
              </div>
            </div>

            {/* Right Body */}
            <div
              ref={rightScrollRef}
              onScroll={handleRightScroll}
              className="flex-1 overflow-auto p-6 bg-white"
            >
              {doc.html_content ? (
                <div
                  className="document-content text-slate-800 text-xs leading-relaxed max-w-3xl mx-auto select-text space-y-4"
                  dangerouslySetInnerHTML={{
                    __html: formatLegalHtmlContent(doc.html_content, doc),
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <FileCode2 className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="font-semibold text-xs text-slate-600">Chưa có dữ liệu trích xuất toàn văn</p>
                  <p className="text-[11px] text-slate-400 mt-1">Yêu cầu chạy OCR để tạo nội dung cấu trúc.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
