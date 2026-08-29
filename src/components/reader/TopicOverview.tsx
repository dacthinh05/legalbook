'use client';

import { useState, useMemo } from 'react';
import type { Category, LegalDocument, DocumentType } from '@/types';
import { 
  DOCUMENT_STATUS_LABELS, 
  DOCUMENT_STATUS_COLORS, 
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_COLORS,
  DOCUMENT_TYPE_ABBREV,
  formatDate,
  getEffectiveStatus,
  isNewDocument
} from '@/lib/utils';
import { 
  Sparkles, 
  Clock, 
  Calendar, 
  FileText, 
  Scale, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface TopicOverviewProps {
  category: Category;
  documents: LegalDocument[];
  onSelectDocument: (docId: string) => void;
}

function byDateDesc(a: LegalDocument, b: LegalDocument): number {
  const da = a.issued_date || a.effective_date || a.updated_at || a.created_at || '';
  const db = b.issued_date || b.effective_date || b.updated_at || b.created_at || '';
  return db.localeCompare(da);
}

function byEffectiveDateDesc(a: LegalDocument, b: LegalDocument): number {
  const da = a.effective_date || a.issued_date || a.updated_at || '';
  const db = b.effective_date || b.issued_date || b.updated_at || '';
  return db.localeCompare(da);
}

function byUpdatedDateDesc(a: LegalDocument, b: LegalDocument): number {
  const da = a.updated_at || a.issued_date || a.effective_date || '';
  const db = b.updated_at || b.issued_date || b.effective_date || '';
  return db.localeCompare(da);
}

function StatusBadge({ status }: { status: LegalDocument['status'] }) {
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 whitespace-nowrap px-2 py-0.5 rounded text-[11px] font-semibold border leading-tight ${DOCUMENT_STATUS_COLORS[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'hieu_luc' ? 'bg-green-500' :
        status === 'chua_hieu_luc' ? 'bg-amber-500' :
        status === 'het_hieu_luc_mot_phan' ? 'bg-orange-500' :
        status === 'het_hieu_luc_toan_bo' ? 'bg-red-500' : 'bg-gray-400'
      }`} />
      {DOCUMENT_STATUS_LABELS[status]}
    </span>
  );
}

function TypeBadge({ type }: { type: DocumentType }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${DOCUMENT_TYPE_COLORS[type] || 'text-slate-700 bg-slate-100'}`}>
      {DOCUMENT_TYPE_LABELS[type] || DOCUMENT_TYPE_ABBREV[type] || type}
    </span>
  );
}

function HighlightCard({
  doc,
  onSelect,
}: {
  doc: LegalDocument;
  onSelect: () => void;
}) {
  const effStatus = getEffectiveStatus(doc);
  const isUpcoming = effStatus === 'chua_hieu_luc';
  const isRecent = isNewDocument(doc.updated_at || doc.issued_date || '', 180);

  // Extract clean bullet points if available from summary_new_points
  const points = useMemo(() => {
    if (!doc.summary_new_points) return [];
    return doc.summary_new_points
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .slice(0, 2);
  }, [doc.summary_new_points]);

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={`group relative flex flex-col justify-between rounded-xl border p-4.5 transition-all duration-200 cursor-pointer text-left hover:shadow-md ${
        isUpcoming
          ? 'bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30 border-amber-200/80 hover:border-amber-400'
          : 'bg-white hover:bg-slate-50/60 border-slate-200 hover:border-blue-400'
      }`}
    >
      <div>
        {/* Top Badges & Number */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={doc.document_type} />
            {isUpcoming ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-500 text-white shadow-xs">
                <Clock className="w-3 h-3" />
                Sắp hiệu lực
              </span>
            ) : isRecent ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-semibold bg-blue-600 text-white shadow-xs">
                <Sparkles className="w-3 h-3" />
                Mới cập nhật
              </span>
            ) : null}
          </div>

          <StatusBadge status={effStatus} />
        </div>

        {/* Doc Number & Title */}
        <div className="mb-2">
          {doc.document_number && (
            <div className="text-[12px] font-bold text-slate-600 font-mono group-hover:text-blue-700 transition-colors">
              {doc.document_number}
            </div>
          )}
          <h3 className="text-[14px] font-semibold text-slate-900 group-hover:text-blue-900 leading-snug line-clamp-2 mt-0.5">
            {doc.title}
          </h3>
        </div>

        {/* Highlights or Brief Summary */}
        {points.length > 0 ? (
          <div className="mt-2.5 mb-3 bg-slate-50/90 rounded-lg p-2.5 border border-slate-100/80">
            <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-amber-600" />
              Điểm mới & tác động:
            </div>
            <ul className="text-[12px] text-slate-600 space-y-1">
              {points.map((p, idx) => (
                <li key={idx} className="line-clamp-2 leading-relaxed flex items-start gap-1.5">
                  <span className="text-blue-600 font-bold shrink-0">•</span>
                  <span>{p.replace(/^[0-9]+[.)]\s*/, '')}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : doc.summary_main ? (
          <p className="mt-2 mb-3 text-[12px] text-slate-600 line-clamp-2 leading-relaxed italic bg-slate-50/60 p-2 rounded border border-slate-100">
            {doc.summary_main}
          </p>
        ) : null}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-500 mt-2">
        <div className="flex items-center gap-2 truncate">
          {doc.issuing_body && (
            <span className="truncate font-medium text-slate-700">{doc.issuing_body}</span>
          )}
          {doc.effective_date && (
            <>
              <span className="text-slate-300">·</span>
              <span>
                Hiệu lực: <strong className="font-semibold text-slate-800">{formatDate(doc.effective_date)}</strong>
              </span>
            </>
          )}
        </div>

        <span className="inline-flex items-center text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform shrink-0 ml-2 text-[12px]">
          Xem toàn văn <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </span>
      </div>
    </div>
  );
}

function CompactDocumentItem({
  doc,
  onSelect,
}: {
  doc: LegalDocument;
  onSelect: () => void;
}) {
  const effStatus = getEffectiveStatus(doc);
  const isRecent = isNewDocument(doc.updated_at || doc.issued_date || '', 180);

  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className="group flex items-start justify-between gap-4 py-3.5 px-3 cursor-pointer hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-b-0 select-text"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <TypeBadge type={doc.document_type} />
          {doc.document_number && (
            <span className="text-[13px] font-bold text-slate-900 group-hover:text-blue-800 tracking-tight font-mono">
              {doc.document_number}
            </span>
          )}
          {isRecent && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
              Mới
            </span>
          )}
        </div>

        <p className="text-[13.5px] font-medium text-slate-800 group-hover:text-blue-900 leading-snug line-clamp-2">
          {doc.title}
        </p>

        <div className="flex items-center gap-2 text-[12px] text-slate-500 mt-1.5 flex-wrap">
          {doc.issuing_body && (
            <span className="font-medium text-slate-600">{doc.issuing_body}</span>
          )}
          {doc.issued_date && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Ban hành: <strong className="font-medium text-slate-700">{formatDate(doc.issued_date)}</strong></span>
            </>
          )}
          {doc.effective_date && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span>Hiệu lực: <strong className="font-medium text-slate-700">{formatDate(doc.effective_date)}</strong></span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 pt-0.5 flex flex-col items-end gap-1.5">
        <StatusBadge status={effStatus} />
        <span className="text-[11px] text-blue-600 group-hover:underline font-medium flex items-center">
          Đọc ngay <ChevronRight className="w-3 h-3 ml-0.5" />
        </span>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  subtitle,
  docs,
  onSelectDocument,
  icon: Icon,
  initialLimit = 4,
}: {
  title: string;
  subtitle?: string;
  docs: LegalDocument[];
  onSelectDocument: (docId: string) => void;
  icon?: React.ComponentType<{ className?: string }>;
  initialLimit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (docs.length === 0) return null;

  const displayDocs = expanded ? docs : docs.slice(0, initialLimit);
  const hasMore = docs.length > initialLimit;

  return (
    <div className="mb-8 bg-white border border-slate-200/90 rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-2">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4.5 h-4.5 text-blue-700" />}
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 leading-snug">{title}</h2>
            {subtitle && <p className="text-[12px] text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <span className="text-[12px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
          {docs.length} văn bản
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {displayDocs.map((doc) => (
          <CompactDocumentItem
            key={doc.id}
            doc={doc}
            onSelect={() => onSelectDocument(doc.id)}
          />
        ))}
      </div>

      {hasMore && (
        <div className="pt-3 mt-1 border-t border-slate-100 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[12.5px] font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded py-1 px-3"
          >
            {expanded ? 'Thu gọn danh sách' : `Xem thêm ${docs.length - initialLimit} văn bản khác →`}
          </button>
        </div>
      )}
    </div>
  );
}

export function TopicOverview({
  category,
  documents,
  onSelectDocument,
}: TopicOverviewProps) {
  const [activeTab, setActiveTab] = useState<'all_new' | 'laws' | 'circulars' | 'guidance' | 'upcoming'>('all_new');
  
  const totalCount = documents.length;
  const latestDate = useMemo(() => {
    return [...documents]
      .map(d => d.effective_date || d.issued_date || d.updated_at || '')
      .filter(Boolean)
      .sort()
      .reverse()[0];
  }, [documents]);

  // Grouping
  const decrees = useMemo(() => documents.filter(d => d.document_type === 'nghi_dinh').sort(byDateDesc), [documents]);
  const laws = useMemo(() => documents.filter(d => d.document_type === 'luat').sort(byDateDesc), [documents]);
  const circulars = useMemo(() => documents.filter(d => d.document_type === 'thong_tu').sort(byDateDesc), [documents]);
  const guidance = useMemo(() => documents.filter(d =>
    d.document_type === 'cong_van' || d.document_type === 'huong_dan' || d.document_type === 'quyet_dinh'
  ).sort(byDateDesc), [documents]);
  const standards = useMemo(() => documents.filter(d => d.document_type === 'chuan_muc').sort(byDateDesc), [documents]);
  const other = useMemo(() => documents.filter(d => d.document_type === 'khac').sort(byDateDesc), [documents]);

  const activeInForce = useMemo(() => documents.filter(d => getEffectiveStatus(d) === 'hieu_luc').sort(byDateDesc), [documents]);
  const upcomingInForce = useMemo(() => documents.filter(d => getEffectiveStatus(d) === 'chua_hieu_luc').sort(byEffectiveDateDesc), [documents]);
  const expiredDocs = useMemo(() => documents.filter(d => getEffectiveStatus(d) === 'het_hieu_luc_toan_bo' || getEffectiveStatus(d) === 'het_hieu_luc_mot_phan').sort(byDateDesc), [documents]);
  const new30DaysDocs = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const threshold = thirtyDaysAgo.toISOString().slice(0, 10);
    return documents.filter(d => (d.issued_date && d.issued_date >= threshold) || (d.effective_date && d.effective_date >= threshold));
  }, [documents]);
  const recentlyUpdatedDocs = useMemo(() => {
    return [...documents].sort(byUpdatedDateDesc);
  }, [documents]);

  // Filtered highlights based on tab
  const featuredDocs = useMemo(() => {
    if (activeTab === 'upcoming') {
      return upcomingInForce.slice(0, 6);
    }
    if (activeTab === 'laws') {
      return [...laws, ...decrees].sort(byUpdatedDateDesc).slice(0, 6);
    }
    if (activeTab === 'circulars') {
      return circulars.slice(0, 6);
    }
    if (activeTab === 'guidance') {
      return guidance.slice(0, 6);
    }
    return recentlyUpdatedDocs.slice(0, 6);
  }, [activeTab, upcomingInForce, laws, decrees, circulars, guidance, recentlyUpdatedDocs]);

  const countsByType = {
    'Luật / Bộ luật': { count: laws.length, icon: Scale, type: 'luat' as DocumentType },
    'Nghị định': { count: decrees.length, icon: Building2, type: 'nghi_dinh' as DocumentType },
    'Thông tư': { count: circulars.length, icon: FileText, type: 'thong_tu' as DocumentType },
    'Công văn & Hướng dẫn': { count: guidance.length, icon: Info, type: 'cong_van' as DocumentType },
    'Chuẩn mực (VAS/IFRS/VSA)': { count: standards.length, icon: Layers, type: 'chuan_muc' as DocumentType },
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/50 select-text">
      <div className="max-w-[960px] mx-auto px-6 md:px-10 py-8 md:py-10">

        {/* 1. Header & Quick Context */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 md:p-8 shadow-xs mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 text-[11.5px] font-semibold mb-2.5 border border-blue-200/60">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Hệ thống cơ sở dữ liệu pháp luật điện tử</span>
              </div>
              <h1 className="text-[26px] md:text-[30px] font-extrabold text-slate-900 leading-tight tracking-tight mb-2">
                {category.name}
              </h1>
              <p className="text-[14px] text-slate-600 leading-relaxed max-w-2xl">
                {category.description || 'Tổng hợp toàn bộ các văn bản quy phạm pháp luật, nghị định, thông tư và công văn hướng dẫn nghiệp vụ.'}
              </p>
            </div>

            {/* Status overview pill */}
            <div className="flex items-center gap-2 text-[12px] text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Cập nhật gần nhất: <strong className="font-semibold text-slate-800">{formatDate(latestDate)}</strong></span>
            </div>
          </div>

          {/* 4 Key Legal Status Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mt-6">
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-emerald-900 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Đang có hiệu lực
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-950">{activeInForce.length}</span>
                <span className="text-[11px] text-emerald-700 font-medium">văn bản áp dụng</span>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-amber-900 flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Sắp có hiệu lực
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-amber-950">{upcomingInForce.length}</span>
                <span className="text-[11px] text-amber-700 font-medium">chuyển tiếp</span>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-rose-900 flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Hết hiệu lực
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-rose-950">{expiredDocs.length}</span>
                <span className="text-[11px] text-rose-700 font-medium">đã thay thế</span>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="text-[12px] font-semibold text-blue-900 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Mới trong 30 ngày
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-950">{new30DaysDocs.length}</span>
                <span className="text-[11px] text-blue-700 font-medium">cập nhật gần đây</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. SECTION: Văn bản mới cập nhật & Điểm tin nổi bật (Featured New Documents Grid) */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-5 bg-blue-600 rounded-xs" />
              <h2 className="text-[18px] font-bold text-slate-900">
                Văn bản mới cập nhật & Điểm tin nổi bật
              </h2>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 overflow-x-auto text-[12px]">
              <button
                type="button"
                onClick={() => setActiveTab('all_new')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'all_new'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả mới
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('laws')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'laws'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Luật & Nghị định ({laws.length + decrees.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('circulars')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'circulars'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thông tư ({circulars.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guidance')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'guidance'
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Công văn ({guidance.length})
              </button>
              {upcomingInForce.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'upcoming'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-amber-800 hover:text-amber-950 font-medium'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Sắp hiệu lực ({upcomingInForce.length})
                </button>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredDocs.map((doc) => (
              <HighlightCard
                key={doc.id}
                doc={doc}
                onSelect={() => onSelectDocument(doc.id)}
              />
            ))}
          </div>
        </div>

        {/* 3. SECTION: Lộ trình & Văn bản sắp có hiệu lực (Upcoming In-Force Timeline) */}
        {upcomingInForce.length > 0 && activeTab !== 'upcoming' && (
          <div className="mb-10 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border border-amber-200/90 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 border-b border-amber-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">
                    Lộ trình áp dụng & Văn bản sắp có hiệu lực
                  </h3>
                  <p className="text-[12px] text-amber-800 mt-0.5">
                    Các văn bản quy phạm pháp luật quan trọng chuẩn bị có hiệu lực thi hành
                  </p>
                </div>
              </div>
              <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                {upcomingInForce.length} văn bản
              </span>
            </div>

            <div className="space-y-3">
              {upcomingInForce.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectDocument(doc.id)}
                  className="bg-white p-3.5 rounded-xl border border-amber-200/60 hover:border-amber-400 hover:shadow-xs transition-all cursor-pointer flex items-start justify-between gap-3 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <TypeBadge type={doc.document_type} />
                      <span className="text-[12.5px] font-bold text-slate-900 font-mono group-hover:text-blue-800">
                        {doc.document_number}
                      </span>
                      <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.2 rounded">
                        Có hiệu lực từ: <strong>{formatDate(doc.effective_date)}</strong>
                      </span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-800 group-hover:text-blue-900 line-clamp-1">
                      {doc.title}
                    </p>
                    {doc.summary_main && (
                      <p className="text-[11.5px] text-slate-500 line-clamp-1 mt-1">
                        {doc.summary_main}
                      </p>
                    )}
                  </div>

                  <span className="text-[12px] font-semibold text-amber-800 group-hover:text-amber-950 shrink-0 flex items-center mt-1">
                    Chi tiết <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. SECTION: Phân loại theo loại văn bản (Interactive Category Grid) */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-5 bg-indigo-600 rounded-xs" />
            <h2 className="text-[18px] font-bold text-slate-900">
              Phân loại theo loại văn bản
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
            {Object.entries(countsByType).map(([label, item]) => {
              const IconComp = item.icon;
              return (
                <div
                  key={label}
                  className="bg-white border border-slate-200/90 hover:border-blue-400 p-4 rounded-xl shadow-2xs transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {item.count}
                    </span>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-bold text-slate-900">{label}</div>
                    <div className="text-[11.5px] text-slate-500 mt-0.5">
                      {item.count > 0 ? `${item.count} văn bản quy định` : 'Chưa có văn bản'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. SECTION: Danh sách phân tầng văn bản (Structured Groups) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-5 bg-slate-700 rounded-xs" />
            <h2 className="text-[18px] font-bold text-slate-900">
              Danh mục văn bản chi tiết
            </h2>
          </div>

          {/* Laws */}
          {laws.length > 0 && (
            <SectionBlock
              title="Văn bản nền tảng (Luật & Bộ luật)"
              subtitle="Các đạo luật do Quốc hội ban hành làm căn cứ pháp lý cao nhất"
              docs={laws}
              onSelectDocument={onSelectDocument}
              icon={Scale}
              initialLimit={4}
            />
          )}

          {/* Decrees */}
          {decrees.length > 0 && (
            <SectionBlock
              title="Văn bản quy định chi tiết & Hướng dẫn thi hành (Nghị định)"
              subtitle="Các nghị định do Chính phủ ban hành hướng dẫn luật"
              docs={decrees}
              onSelectDocument={onSelectDocument}
              icon={Building2}
              initialLimit={4}
            />
          )}

          {/* Circulars */}
          {circulars.length > 0 && (
            <SectionBlock
              title="Thông tư nghiệp vụ & Biểu mẫu"
              subtitle="Quy định cụ thể của Bộ Tài chính, BHXH, Bộ LĐTBXH..."
              docs={circulars}
              onSelectDocument={onSelectDocument}
              icon={FileText}
              initialLimit={4}
            />
          )}

          {/* Guidance */}
          {guidance.length > 0 && (
            <SectionBlock
              title="Công văn & Hướng dẫn xử lý tình huống nghiệp vụ"
              subtitle="Trả lời vướng mắc thực tế cho doanh nghiệp và người nộp thuế"
              docs={guidance}
              onSelectDocument={onSelectDocument}
              icon={Info}
              initialLimit={4}
            />
          )}

          {/* Standards */}
          {standards.length > 0 && (
            <SectionBlock
              title="Chuẩn mực kế toán & kiểm toán (VAS / IFRS / VSA)"
              subtitle="Hệ thống chuẩn mực nghề nghiệp và lộ trình chuyển đổi"
              docs={standards}
              onSelectDocument={onSelectDocument}
              icon={Layers}
              initialLimit={4}
            />
          )}

          {/* Other */}
          {other.length > 0 && (
            <SectionBlock
              title="Văn bản khác"
              docs={other}
              onSelectDocument={onSelectDocument}
              icon={FileText}
              initialLimit={3}
            />
          )}
        </div>

        {totalCount === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-[15px] font-bold text-slate-700 mb-1">Chưa có văn bản nào trong mục này</p>
            <p className="text-[13px] text-slate-500">Vui lòng nhập thêm văn bản từ nút &quot;Nhập văn bản&quot; hoặc chọn danh mục khác.</p>
          </div>
        )}

      </div>
    </div>
  );
}

