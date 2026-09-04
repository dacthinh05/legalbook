'use client';

import { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  FileWarning, 
  RefreshCw, 
  Download, 
  Search, 
  Eye, 
  ExternalLink
} from 'lucide-react';
import { getDocuments } from '@/lib/data-service';
import { ContentQualityValidator, type ContentQualityResult } from '@/lib/quality/content-validator';
import type { LegalDocument } from '@/types';

function getAuditedDocs(docs: Partial<LegalDocument>[]) {
  return docs.map((doc) => ({
    doc,
    quality: ContentQualityValidator.validate({
      htmlContent: doc.html_content,
      title: doc.title,
      documentNumber: doc.document_number,
      documentType: doc.document_type,
      summaryMain: doc.summary_main,
      summaryNewPoints: doc.summary_new_points,
      hasAttachedFiles: Boolean(doc.files && doc.files.length > 0),
    }),
  }));
}

export default function DataQualityAdminPage() {
  // Fail-closed: Khởi tạo mảng rỗng, chỉ đổ dữ liệu khi loadData lấy được từ CSDL (Supabase live hoặc demo mode)
  const [documents, setDocuments] = useState<Partial<LegalDocument>[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<
    'all' | 'missing_content' | 'fake_placeholder' | 'needs_ocr' | 'partial' | 'verified' | 'unverified'
  >('all');
  const [selectedDocAudit, setSelectedDocAudit] = useState<{
    doc: Partial<LegalDocument>;
    quality: ContentQualityResult;
  } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getDocuments(null)
      .then((res) => {
        if (res.source === 'unavailable') {
          setDocuments([]);
          setDataError(res.error || 'CSDL văn bản chính thức không khả dụng.');
          return;
        }
        setDataError(null);
        setDocuments(res.data || []);
      })
      .catch((err) => {
        console.warn('Data quality sync warning:', err);
        setDataError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  // Validate all documents with ContentQualityValidator (memoized with top-level cache)
  const auditedList = useMemo(() => getAuditedDocs(documents), [documents]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = auditedList.length;
    let verifiedCount = 0;
    let missingContentCount = 0;
    let fakePlaceholderCount = 0;
    let partialCount = 0;
    let needsOcrCount = 0;
    let noSourceCount = 0;

    for (const item of auditedList) {
      if (item.doc.content_status === 'verified' || (item.quality.status === 'complete' && item.doc.review_status === 'published')) {
        verifiedCount++;
      }
      if (item.quality.status === 'invalid' || !item.doc.html_content) {
        missingContentCount++;
      }
      if (item.quality.isFakeOrPlaceholder || item.quality.isSummaryRepetition) {
        fakePlaceholderCount++;
      }
      if (item.quality.status === 'partial') {
        partialCount++;
      }
      if (item.quality.isScanNeedingOcr) {
        needsOcrCount++;
      }
      if (!item.doc.official_source_url && (!item.doc.files || item.doc.files.length === 0)) {
        noSourceCount++;
      }
    }

    return {
      total,
      verifiedCount,
      missingContentCount,
      fakePlaceholderCount,
      partialCount,
      needsOcrCount,
      noSourceCount,
    };
  }, [auditedList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return auditedList.filter(({ doc, quality }) => {
      const matchSearch =
        (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.document_number || '').toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      switch (filterMode) {
        case 'missing_content':
          return quality.status === 'invalid' || !doc.html_content;
        case 'fake_placeholder':
          return quality.isFakeOrPlaceholder || quality.isSummaryRepetition;
        case 'needs_ocr':
          return quality.isScanNeedingOcr;
        case 'partial':
          return quality.status === 'partial';
        case 'verified':
          return doc.content_status === 'verified' || (quality.status === 'complete' && doc.review_status === 'published');
        case 'unverified':
          return quality.status === 'complete' && doc.review_status !== 'published';
        default:
          return true;
      }
    });
  }, [auditedList, searchTerm, filterMode]);

  const handleExportCsv = () => {
    const headers = [
      'Document_ID',
      'Document_Number',
      'Title',
      'Quality_Status',
      'Quality_Score',
      'Char_Count',
      'Article_Count',
      'Is_Fake_Placeholder',
      'Source_URL',
      'Reasons_Warnings',
    ];

    const rows = auditedList.map(({ doc, quality }) => [
      `"${doc.id}"`,
      `"${doc.document_number || ''}"`,
      `"${(doc.title || '').replace(/"/g, '""')}"`,
      `"${quality.status}"`,
      quality.score,
      quality.metrics.characterCount,
      quality.metrics.articleCount,
      quality.isFakeOrPlaceholder ? 'YES' : 'NO',
      `"${doc.official_source_url || ''}"`,
      `"${[...quality.reasons, ...quality.warnings].join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `legalbook_data_quality_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 select-text">
      {/* Hard error banner: CSDL không khả dụng (fail-closed, production strict) */}
      {dataError && (
        <div className="p-3.5 rounded-xl border bg-red-50 border-red-200 text-red-900 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{dataError}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>HỆ THỐNG KIỂM SOÁT CHẤT LƯỢNG DỮ LIỆU & BẢO ĐẢM TOÀN VĂN</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-1">
            Bảng điều khiển Chất lượng Dữ liệu Pháp lý
          </h1>
          <p className="text-xs text-gray-500">
            Giám sát tính đầy đủ, phát hiện nội dung mẫu / giả / tóm tắt thế chỗ và quản lý quy trình kiểm duyệt toàn văn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Đã bắt đầu chạy lại toàn bộ thuật toán kiểm định chất lượng trên toàn bộ kho văn bản.')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-300"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Audit lại toàn bộ
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất báo cáo Audit (.CSV)
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-gray-400 uppercase">Tổng văn bản</div>
          <div className="text-lg font-bold text-gray-900">{metrics.total}</div>
          <div className="text-[10px] text-gray-500">Toàn bộ kho lưu trữ</div>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Đã xác minh toàn văn</div>
          <div className="text-lg font-bold text-emerald-900">{metrics.verifiedCount}</div>
          <div className="text-[10px] text-emerald-700">Đạt chuẩn & Có Điều/Khoản</div>
        </div>

        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-rose-700 uppercase">Chưa có toàn văn</div>
          <div className="text-lg font-bold text-rose-900">{metrics.missingContentCount}</div>
          <div className="text-[10px] text-rose-700">Chỉ có metadata/tiêu đề</div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-amber-700 uppercase">Dữ liệu Placeholder / Mẫu</div>
          <div className="text-lg font-bold text-amber-900">{metrics.fakePlaceholderCount}</div>
          <div className="text-[10px] text-amber-700">Văn bản mẫu / Chưa đồng bộ toàn văn</div>
        </div>

        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-blue-700 uppercase">Nội dung một phần</div>
          <div className="text-lg font-bold text-blue-900">{metrics.partialCount}</div>
          <div className="text-[10px] text-blue-700">Cần bổ sung phụ lục/điều</div>
        </div>

        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl shadow-2xs space-y-1">
          <div className="text-[10px] font-bold text-purple-700 uppercase">Cần quét OCR</div>
          <div className="text-lg font-bold text-purple-900">{metrics.needsOcrCount}</div>
          <div className="text-[10px] text-purple-700">PDF bản scan không có text</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'all' ? 'bg-slate-900 text-white font-semibold' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tất cả ({auditedList.length})
          </button>

          <button
            onClick={() => setFilterMode('missing_content')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'missing_content' ? 'bg-rose-700 text-white font-semibold' : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            Thiếu toàn văn ({metrics.missingContentCount})
          </button>

          <button
            onClick={() => setFilterMode('fake_placeholder')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'fake_placeholder' ? 'bg-amber-700 text-white font-semibold' : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            Dữ liệu mẫu ({metrics.fakePlaceholderCount})
          </button>

          <button
            onClick={() => setFilterMode('needs_ocr')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'needs_ocr' ? 'bg-purple-700 text-white font-semibold' : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            Cần OCR ({metrics.needsOcrCount})
          </button>

          <button
            onClick={() => setFilterMode('partial')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'partial' ? 'bg-blue-700 text-white font-semibold' : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            Trích xuất 1 phần ({metrics.partialCount})
          </button>

          <button
            onClick={() => setFilterMode('verified')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              filterMode === 'verified' ? 'bg-emerald-700 text-white font-semibold' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Đã xác minh ({metrics.verifiedCount})
          </button>
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo số hiệu hoặc tên..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-semibold">
            <tr>
              <th className="p-3">Số / Ký hiệu</th>
              <th className="p-3">Tên văn bản</th>
              <th className="p-3">Nguồn</th>
              <th className="p-3 text-center">Độ dài (Ký tự)</th>
              <th className="p-3 text-center">Số Điều</th>
              <th className="p-3">Trạng thái Toàn văn</th>
              <th className="p-3">Điểm CL</th>
              <th className="p-3">Cảnh báo / Nguyên nhân</th>
              <th className="p-3 text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && documents.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skel-${idx}`} className="animate-pulse">
                  <td className="p-3"><div className="w-24 h-4 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="w-48 h-4 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="w-20 h-4 bg-slate-200 rounded" /></td>
                  <td className="p-3 text-center"><div className="w-12 h-4 bg-slate-200 rounded mx-auto" /></td>
                  <td className="p-3 text-center"><div className="w-12 h-4 bg-slate-200 rounded mx-auto" /></td>
                  <td className="p-3"><div className="w-24 h-5 bg-slate-200 rounded-full" /></td>
                  <td className="p-3"><div className="w-12 h-4 bg-slate-200 rounded" /></td>
                  <td className="p-3"><div className="w-32 h-4 bg-slate-200 rounded" /></td>
                  <td className="p-3 text-right"><div className="w-8 h-4 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-gray-400">
                  {dataError ? dataError : 'Không tìm thấy văn bản nào thỏa mãn điều kiện lọc.'}
                </td>
              </tr>
            ) : (
              filteredList.map(({ doc, quality }) => (
                <tr key={doc.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="p-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                    {doc.document_number || '---'}
                  </td>

                  <td className="p-3 font-medium text-gray-900 max-w-xs truncate" title={doc.title}>
                    {doc.title}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {doc.official_source_url ? (
                      <a
                        href={doc.official_source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Thư Viện Pháp Luật</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-gray-400 text-[11px]">Chưa có link nguồn</span>
                    )}
                  </td>

                  <td className="p-3 text-center font-mono text-gray-700">
                    {quality.metrics.characterCount.toLocaleString('vi-VN')}
                  </td>

                  <td className="p-3 text-center font-mono">
                    {quality.metrics.articleCount > 0 ? (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 font-bold rounded">
                        {quality.metrics.articleCount} Điều
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>

                  <td className="p-3 whitespace-nowrap">
                    {quality.status === 'complete' ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        ✓ Toàn văn hợp lệ
                      </span>
                    ) : quality.isFakeOrPlaceholder ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                        Nghi ngờ tóm tắt thế chỗ
                      </span>
                    ) : quality.status === 'partial' ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                        Trích xuất 1 phần
                      </span>
                    ) : quality.isScanNeedingOcr ? (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                        Cần OCR Scan
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                        ✕ Chưa có toàn văn
                      </span>
                    )}
                  </td>

                  <td className="p-3 font-mono font-bold">
                    <span className={quality.score >= 70 ? 'text-emerald-700' : quality.score >= 40 ? 'text-amber-700' : 'text-rose-700'}>
                      {quality.score}/100
                    </span>
                  </td>

                  <td className="p-3 text-[11px] text-gray-600 max-w-xs">
                    {quality.reasons.length > 0 ? (
                      <span className="text-rose-700 font-medium line-clamp-1">{quality.reasons[0]}</span>
                    ) : quality.warnings.length > 0 ? (
                      <span className="text-amber-700 line-clamp-1">{quality.warnings[0]}</span>
                    ) : (
                      <span className="text-emerald-700 font-medium">Đạt tiêu chuẩn toàn văn</span>
                    )}
                  </td>

                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedDocAudit({ doc, quality })}
                      className="p-1.5 hover:bg-gray-100 text-gray-600 hover:text-blue-600 rounded-md transition-colors"
                      title="Xem chi tiết báo cáo chất lượng"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Detail Modal */}
      {selectedDocAudit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span className="font-mono text-xs font-bold text-blue-700">
                  {selectedDocAudit.doc.document_number}
                </span>
                <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                  Báo cáo Phân tích Chất lượng Nội dung
                </h3>
              </div>
              <button
                onClick={() => setSelectedDocAudit(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-md"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                <span className="text-gray-500 font-medium">Tên văn bản:</span>
                <p className="font-semibold text-gray-900">{selectedDocAudit.doc.title}</p>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 border rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Độ dài ký tự</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    {selectedDocAudit.quality.metrics.characterCount}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Số Điều / Khoản</span>
                  <span className="font-mono font-bold text-gray-900 text-sm">
                    {selectedDocAudit.quality.metrics.articleCount} Điều / {selectedDocAudit.quality.metrics.clauseCount} Khoản
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border rounded-lg">
                  <span className="text-gray-400 block text-[10px]">Điểm chất lượng</span>
                  <span className="font-mono font-bold text-blue-700 text-sm">
                    {selectedDocAudit.quality.score}/100
                  </span>
                </div>
              </div>

              {/* Reasons & Issues */}
              {selectedDocAudit.quality.reasons.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <FileWarning className="w-3.5 h-3.5" />
                    Vấn đề phát hiện cần xử lý:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-rose-800 text-[11px]">
                    {selectedDocAudit.quality.reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {selectedDocAudit.quality.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Cảnh báo định dạng:
                  </span>
                  <ul className="list-disc pl-4 space-y-0.5 text-amber-800 text-[11px]">
                    {selectedDocAudit.quality.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons in Modal */}
              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <a
                  href={`/?doc=${selectedDocAudit.doc.id}`}
                  target="_blank"
                  className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Mở trong Reader</span>
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      alert('Đã đưa văn bản vào hàng chờ crawl lại toàn văn.');
                      setSelectedDocAudit(null);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
                  >
                    Lấy lại nội dung
                  </button>
                  <button
                    onClick={() => setSelectedDocAudit(null)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
