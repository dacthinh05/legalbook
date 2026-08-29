'use client';

import { X, Sparkles, ExternalLink, Building, ShieldAlert, Landmark } from 'lucide-react';
import { cn, DOCUMENT_TYPE_LABELS, DOCUMENT_STATUS_LABELS, DOCUMENT_STATUS_COLORS, getEffectiveStatus, formatDate, getMultiSourceLookupUrls } from '@/lib/utils';
import type { LegalDocument } from '@/types';

interface DocumentInfoPanelProps {
  document: LegalDocument;
  onClose: () => void;
}

export function DocumentInfoPanel({ document: doc, onClose }: DocumentInfoPanelProps) {
  const multiSources = getMultiSourceLookupUrls(doc);

  return (
    <div className="w-80 md:w-96 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden shadow-lg animate-slide-in flex-shrink-0">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Thông tin văn bản</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200"
          title="Đóng panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Scroll */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Basic Metadata Table */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-2.5 pb-1 border-b border-gray-100 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-gray-500" />
            Thuộc tính pháp lý
          </h4>
          <dl className="space-y-2 text-[11px]">
            <div className="grid grid-cols-3 gap-1">
              <dt className="text-gray-500 font-medium">Số / Ký hiệu:</dt>
              <dd className="col-span-2 font-mono font-semibold text-gray-900">{doc.document_number || '—'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="text-gray-500 font-medium">Loại văn bản:</dt>
              <dd className="col-span-2 text-gray-800">{DOCUMENT_TYPE_LABELS[doc.document_type]}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="text-gray-500 font-medium">Cơ quan BH:</dt>
              <dd className="col-span-2 text-gray-800">{doc.issuing_body || '—'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="text-gray-500 font-medium">Người ký:</dt>
              <dd className="col-span-2 text-gray-800">{doc.signer || '—'}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="text-gray-500 font-medium">Ngày ban hành:</dt>
              <dd className="col-span-2 text-gray-800">{formatDate(doc.issued_date)}</dd>
            </div>
            <div className="grid grid-cols-3 gap-1">
              <dt className="text-gray-500 font-medium">Ngày hiệu lực:</dt>
              <dd className="col-span-2 text-gray-800">{formatDate(doc.effective_date)}</dd>
            </div>
            {doc.expiry_date && (
              <div className="grid grid-cols-3 gap-1">
                <dt className="text-gray-500 font-medium">Hết hiệu lực:</dt>
                <dd className="col-span-2 text-red-600 font-medium">{formatDate(doc.expiry_date)}</dd>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1 items-center">
              <dt className="text-gray-500 font-medium">Tình trạng:</dt>
              <dd className="col-span-2">
                {(() => {
                  const effStatus = getEffectiveStatus(doc);
                  return (
                    <span className={cn('px-2 py-0.5 rounded text-[10px] font-semibold border inline-block', DOCUMENT_STATUS_COLORS[effStatus])}>
                      {DOCUMENT_STATUS_LABELS[effStatus]}
                    </span>
                  );
                })()}
              </dd>
            </div>
          </dl>
        </div>

        {/* Multi-Source Cross-Check Hub */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5 text-blue-600" />
              Đối chiếu Cổng Bộ Ngành & Nguồn gốc
            </h4>
          </div>
          <p className="text-[11px] text-gray-500 mb-2.5">
            Mở nhanh trên cổng phát hành chính thức để đối chiếu toàn văn gốc:
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {multiSources.map((source) => (
              <a
                key={source.id}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                title={source.description}
                className="flex items-center justify-between p-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-[11px] group"
              >
                <div className="truncate">
                  <span className="font-semibold text-gray-800 block truncate group-hover:text-blue-700">
                    {source.name}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono block truncate">
                    {source.domain}
                  </span>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-blue-600 flex-shrink-0 ml-1" />
              </a>
            ))}
          </div>
        </div>

        {/* AI & Professional Summary Section */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-gray-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Tóm tắt & Phân tích nghiệp vụ
            </h4>
            {doc.summary_is_ai_generated && (
              <span className="text-[10px] font-medium bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100">
                AI Phân tích
              </span>
            )}
          </div>

          {/* AI Disclaimer Alert */}
          {doc.summary_is_ai_generated && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3 text-[11px] text-amber-800 flex items-start gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>Nội dung hỗ trợ tham khảo — cần đối chiếu văn bản gốc.</span>
            </div>
          )}

          <div className="space-y-3">
            {doc.summary_main && (
              <div className="bg-gray-50 p-2.5 rounded-md border border-gray-100">
                <span className="font-semibold text-gray-800 block mb-1">Nội dung chính:</span>
                <p className="text-gray-600 leading-relaxed text-[11px]">{doc.summary_main}</p>
              </div>
            )}

            {doc.summary_new_points && (
              <div className="bg-blue-50/50 p-2.5 rounded-md border border-blue-100">
                <span className="font-semibold text-blue-900 block mb-1">Điểm mới nổi bật:</span>
                <p className="text-gray-700 leading-relaxed text-[11px]">{doc.summary_new_points}</p>
              </div>
            )}

            {doc.summary_affected_parties && (
              <div>
                <span className="font-semibold text-gray-800 block mb-0.5">Đối tượng áp dụng:</span>
                <p className="text-gray-600 text-[11px]">{doc.summary_affected_parties}</p>
              </div>
            )}

            {doc.summary_accounting_impact && (
              <div className="border-l-2 border-l-emerald-600 pl-2 py-0.5">
                <span className="font-semibold text-emerald-900 block mb-0.5">Ảnh hưởng đến Kế toán:</span>
                <p className="text-gray-600 text-[11px]">{doc.summary_accounting_impact}</p>
              </div>
            )}

            {doc.summary_audit_impact && (
              <div className="border-l-2 border-l-blue-600 pl-2 py-0.5">
                <span className="font-semibold text-blue-900 block mb-0.5">Ảnh hưởng đến Kiểm toán:</span>
                <p className="text-gray-600 text-[11px]">{doc.summary_audit_impact}</p>
              </div>
            )}

            {doc.summary_actions_needed && (
              <div className="bg-amber-50/60 p-2 rounded-md border border-amber-100">
                <span className="font-semibold text-amber-900 block mb-0.5">Việc cần thực hiện:</span>
                <p className="text-gray-700 text-[11px]">{doc.summary_actions_needed}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
