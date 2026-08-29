'use client';

import { useState } from 'react';
import { Download, Printer, ExternalLink } from 'lucide-react';
import { sanitizeHtml, isSafeUrl } from '@/lib/sanitize';
import type { LegalDocument } from '@/types';

interface PDFViewerProps {
  document: LegalDocument;
  zoom: number;
}

export function PDFViewer({ document: doc, zoom }: PDFViewerProps) {
  const [page, setPage] = useState(1);
  const totalPages = 4; // Mock page count for demo

  const pdfFile = doc.files?.find((f) => f.file_type === 'pdf');
  const pdfUrl = pdfFile?.file_url;

  return (
    <div className="flex-1 flex flex-col bg-gray-200/70 overflow-hidden select-none">
      {/* PDF Sub-bar */}
      <div className="bg-gray-100 border-b border-gray-300 px-4 py-1.5 flex items-center justify-between text-xs text-gray-700">
        <div className="flex items-center gap-2">
          <span>Trang:</span>
          <div className="flex items-center gap-1 bg-white border border-gray-300 rounded px-1 py-0.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-1.5 hover:bg-gray-100 disabled:opacity-30 rounded"
            >
              ‹
            </button>
            <span className="font-mono px-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-1.5 hover:bg-gray-100 disabled:opacity-30 rounded"
            >
              ›
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pdfUrl && isSafeUrl(pdfUrl) && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở tab mới
            </a>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            <Printer className="w-3.5 h-3.5" />
            In PDF
          </button>
          <button
            onClick={() => alert('Tải xuống văn bản PDF demo')}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Download className="w-3.5 h-3.5" />
            Tải về
          </button>
        </div>
      </div>

      {/* PDF View Container */}
      <div className="flex-1 overflow-auto p-6 flex justify-center">
        {pdfUrl && isSafeUrl(pdfUrl) ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0 bg-white shadow-md rounded"
            title="PDF Document"
          />
        ) : (
          /* High-fidelity PDF Document Simulation */
          <div
            className="bg-white shadow-xl border border-gray-300 transition-all origin-top rounded-xs flex flex-col p-12 text-gray-900"
            style={{
              width: `${(595 * zoom) / 100}px`,
              minHeight: `${(842 * zoom) / 100}px`,
              fontSize: `${(13 * zoom) / 100}px`,
            }}
          >
            {/* National Emblem & Header */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-6 mb-6">
              <div className="text-center font-serif">
                <p className="font-bold text-xs uppercase tracking-wider">{doc.issuing_body || 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'}</p>
                <p className="text-[11px] font-medium text-gray-600">Số: {doc.document_number || '---'}</p>
              </div>
              <div className="text-center font-serif">
                <p className="font-bold text-xs uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[11px] italic underline">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-[10px] text-gray-500 italic mt-1">Hà Nội, ngày ... tháng ... năm ...</p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h2 className="font-bold text-base uppercase text-gray-900 mb-2">
                {doc.title}
              </h2>
              {doc.signer && (
                <p className="text-xs text-gray-600 italic">Người ký: {doc.signer}</p>
              )}
            </div>

            {/* Simulated Body Content */}
            <div
              className="document-content flex-1 text-justify leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(doc.html_content) || '<p>Đang tải nội dung văn bản...</p>',
              }}
            />

            {/* Simulated Signature */}
            <div className="mt-12 flex justify-end">
              <div className="text-center w-48 font-serif">
                <p className="font-bold uppercase text-xs">TM. {doc.issuing_body || 'CƠ QUAN BAN HÀNH'}</p>
                <p className="italic text-[11px] mb-8">{doc.signer ? 'NGƯỜI KÝ' : 'THỦ TRƯỞNG'}</p>
                <div className="inline-block border border-red-500 text-red-600 rounded px-2 py-0.5 text-[10px] font-bold rotate-[-6deg] mb-2">
                  ĐÃ KÝ ĐIỆN TỬ
                </div>
                <p className="font-bold text-xs text-gray-800">{doc.signer || 'Nguyễn Văn A'}</p>
              </div>
            </div>

            {/* Page Footer */}
            <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
              <span>LegalBook Ebook Viewer — Trang {page}/{totalPages}</span>
              <span>Bản thể hiện điện tử phục vụ tra cứu</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
