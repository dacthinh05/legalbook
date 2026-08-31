'use client';

import React, { useMemo } from 'react';
import {
  Percent,
  Building2,
  Users,
  FileSpreadsheet,
  Globe,
  ShieldCheck,
  Scale,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Clock,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';
import type { LegalDocument, DocumentType } from '@/types';
import {
  cn,
  formatDate,
  getEffectiveStatus,
} from '@/lib/utils';

export interface TaxDomainStat {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  colorScheme: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    pillBg: string;
    badgeBg: string;
  };
  totalCount: number;
  activeCount: number;
  upcomingCount: number;
  recentNewCount: number;
  latestDoc: LegalDocument | null;
  description: string;
  matchingDocIds: Set<string>;
}

interface TaxStatisticsDashboardProps {
  allDocuments: LegalDocument[];
  onSelectDoc: (docId: string) => void;
  onFilterDomain?: (domainId: string, matchedIds: Set<string>) => void;
}

export function TaxStatisticsDashboard({
  allDocuments,
  onSelectDoc,
  onFilterDomain,
}: TaxStatisticsDashboardProps) {
  // 1. Group documents dynamically by 7 core tax & audit pillars
  const domainStats = useMemo<TaxDomainStat[]>(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const threshold = thirtyDaysAgo.toISOString().slice(0, 10);

    const domainsConfig = [
      {
        id: 'tax_vat',
        name: 'Thuế Giá trị gia tăng (GTGT)',
        shortName: 'Thuế GTGT',
        icon: Percent,
        colorScheme: {
          bg: 'bg-blue-50/70 hover:bg-blue-50',
          border: 'border-blue-200/90 hover:border-blue-300',
          text: 'text-blue-950',
          accent: 'text-blue-600',
          pillBg: 'bg-blue-100/80 text-blue-900',
          badgeBg: 'bg-blue-600 text-white',
        },
        description: 'Luật GTGT 2024, hoàn thuế XK, giảm thuế 2%, bảng giá đất',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('gtgt') || text.includes('giá trị gia tăng') || text.includes('48/2024') || text.includes('181/2025') || text.includes('174/2025');
        },
      },
      {
        id: 'tax_cit',
        name: 'Thuế TNDN & Giao dịch liên kết',
        shortName: 'Thuế TNDN & GDLK',
        icon: Building2,
        colorScheme: {
          bg: 'bg-indigo-50/70 hover:bg-indigo-50',
          border: 'border-indigo-200/90 hover:border-indigo-300',
          text: 'text-indigo-950',
          accent: 'text-indigo-600',
          pillBg: 'bg-indigo-100/80 text-indigo-900',
          badgeBg: 'bg-indigo-600 text-white',
        },
        description: 'Luật TNDN 2025, trần lãi vay 30% EBITDA, tạm nộp 80% 4 quý',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('tndn') || text.includes('thu nhập doanh nghiệp') || text.includes('liên kết') || text.includes('gdlk') || text.includes('67/2025') || text.includes('20/2025') || text.includes('132/2020') || text.includes('6367');
        },
      },
      {
        id: 'tax_pit',
        name: 'Thuế TNCN & Tiền lương',
        shortName: 'Thuế TNCN & Lương',
        icon: Users,
        colorScheme: {
          bg: 'bg-emerald-50/70 hover:bg-emerald-50',
          border: 'border-emerald-200/90 hover:border-emerald-300',
          text: 'text-emerald-950',
          accent: 'text-emerald-600',
          pillBg: 'bg-emerald-100/80 text-emerald-900',
          badgeBg: 'bg-emerald-600 text-white',
        },
        description: 'Luật TNCN 2025, giảm trừ gia cảnh mới, miễn thuế làm thêm giờ',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('tncn') || text.includes('thu nhập cá nhân') || text.includes('tiền lương') || text.includes('109/2025') || text.includes('253/2026') || text.includes('110/2025') || text.includes('4128');
        },
      },
      {
        id: 'tax_invoice',
        name: 'Hóa đơn điện tử & Quản lý thuế',
        shortName: 'Hóa đơn & Quản lý thuế',
        icon: FileSpreadsheet,
        colorScheme: {
          bg: 'bg-amber-50/70 hover:bg-amber-50',
          border: 'border-amber-200/90 hover:border-amber-300',
          text: 'text-amber-950',
          accent: 'text-amber-600',
          pillBg: 'bg-amber-100/80 text-amber-900',
          badgeBg: 'bg-amber-600 text-white',
        },
        description: 'Nghị định 70/2025, máy tính tiền, xử phạt vi phạm 15/VBHN',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('hóa đơn') || text.includes('chứng từ') || text.includes('máy tính tiền') || text.includes('70/2025') || text.includes('125/2020') || text.includes('15/vbhn');
        },
      },
      {
        id: 'tax_fct',
        name: 'Thuế Nhà thầu & TMĐT Quốc tế',
        shortName: 'Thuế Nhà thầu & TMĐT',
        icon: Globe,
        colorScheme: {
          bg: 'bg-teal-50/70 hover:bg-teal-50',
          border: 'border-teal-200/90 hover:border-teal-300',
          text: 'text-teal-950',
          accent: 'text-teal-600',
          pillBg: 'bg-teal-100/80 text-teal-900',
          badgeBg: 'bg-teal-600 text-white',
        },
        description: 'Chi phí nhà cung cấp nước ngoài (Meta, Google, AWS), sàn TMĐT',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('nhà thầu') || text.includes('nước ngoài') || text.includes('google') || text.includes('meta') || text.includes('thương mại điện tử') || text.includes('3115');
        },
      },
      {
        id: 'tax_insurance',
        name: 'Bảo hiểm xã hội & Lao động',
        shortName: 'BHXH & Lao động',
        icon: ShieldCheck,
        colorScheme: {
          bg: 'bg-rose-50/70 hover:bg-rose-50',
          border: 'border-rose-200/90 hover:border-rose-300',
          text: 'text-rose-950',
          accent: 'text-rose-600',
          pillBg: 'bg-rose-100/80 text-rose-900',
          badgeBg: 'bg-rose-600 text-white',
        },
        description: 'Luật BHXH 2024, tiền lương đóng BHXH, lương tối thiểu vùng',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('bảo hiểm') || text.includes('bhxh') || text.includes('lao động') || text.includes('lương tối thiểu') || text.includes('41/2024') || text.includes('74/2024') || text.includes('145/2020');
        },
      },
      {
        id: 'tax_accounting',
        name: 'Chế độ Kế toán & Chuẩn mực IFRS',
        shortName: 'Kế toán & IFRS/VSA',
        icon: Scale,
        colorScheme: {
          bg: 'bg-cyan-50/70 hover:bg-cyan-50',
          border: 'border-cyan-200/90 hover:border-cyan-300',
          text: 'text-cyan-950',
          accent: 'text-cyan-600',
          pillBg: 'bg-cyan-100/80 text-cyan-900',
          badgeBg: 'bg-cyan-600 text-white',
        },
        description: 'Lộ trình IFRS Thông tư 118, Chế độ kế toán TT 200 / TT 99',
        test: (d: LegalDocument) => {
          const text = `${d.title} ${d.document_number || ''} ${d.summary_main || ''}`.toLowerCase();
          return text.includes('kế toán') || text.includes('ifrs') || text.includes('chuẩn mực') || text.includes('báo cáo tài chính') || text.includes('118/2026') || text.includes('200/2014') || text.includes('99/2025');
        },
      },
    ];

    return domainsConfig.map((dom) => {
      const matched = allDocuments.filter(dom.test);
      const matchedIds = new Set(matched.map((d) => d.id));

      const activeCount = matched.filter((d) => getEffectiveStatus(d) === 'hieu_luc').length;
      const upcomingCount = matched.filter((d) => getEffectiveStatus(d) === 'chua_hieu_luc').length;
      const recentNewCount = matched.filter(
        (d) => (d.issued_date && d.issued_date >= threshold) || (d.effective_date && d.effective_date >= threshold)
      ).length;

      // Find latest document (highest effective_date or issued_date)
      const sortedMatched = [...matched].sort((a, b) => {
        const da = a.effective_date || a.issued_date || '';
        const db = b.effective_date || b.issued_date || '';
        return db.localeCompare(da);
      });

      const latestDoc = sortedMatched.length > 0 ? sortedMatched[0] : null;

      return {
        id: dom.id,
        name: dom.name,
        shortName: dom.shortName,
        icon: dom.icon,
        colorScheme: dom.colorScheme,
        totalCount: matched.length,
        activeCount,
        upcomingCount,
        recentNewCount,
        latestDoc,
        description: dom.description,
        matchingDocIds: matchedIds,
      };
    });
  }, [allDocuments]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
      {/* ── Dashboard Header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Thống kê Sắc thuế & Cập nhật Mới nhất</span>
              <span className="px-2 py-0.2 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                2025 - 2026
              </span>
            </h3>
            <p className="text-[11.5px] text-slate-500">
              Phân bố số lượng văn bản, tình trạng hiệu lực và văn bản mới nhất theo từng sắc thuế.
            </p>
          </div>
        </div>
      </div>

      {/* ── 7-Card Grid Layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {domainStats.map((stat) => {
          const Icon = stat.icon;
          const hasLatest = stat.latestDoc !== null;

          return (
            <div
              key={stat.id}
              onClick={() => onFilterDomain?.(stat.id, stat.matchingDocIds)}
              className={cn(
                'group p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left space-y-2.5 relative',
                stat.colorScheme.bg,
                stat.colorScheme.border
              )}
            >
              {/* Card Header: Icon + Title + Total Count Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn('p-1.5 rounded-lg bg-white shadow-2xs shrink-0', stat.colorScheme.accent)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className={cn('text-xs font-bold truncate leading-tight', stat.colorScheme.text)}>
                    {stat.shortName}
                  </h4>
                </div>

                <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-mono font-bold shrink-0 shadow-2xs', stat.colorScheme.pillBg)}>
                  {stat.totalCount} văn bản
                </span>
              </div>

              {/* Subtitle / Scope explanation */}
              <p className="text-[11px] text-slate-600 line-clamp-1 leading-tight">
                {stat.description}
              </p>

              {/* Status breakdown pills */}
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className="text-emerald-800 font-semibold bg-emerald-100/80 px-1.5 py-0.2 rounded">
                  Hiệu lực: {stat.activeCount}
                </span>
                {stat.upcomingCount > 0 && (
                  <span className="text-amber-800 font-semibold bg-amber-100/80 px-1.5 py-0.2 rounded">
                    Sắp HL: {stat.upcomingCount}
                  </span>
                )}
                {stat.recentNewCount > 0 && (
                  <span className="text-blue-800 font-semibold bg-blue-100/80 px-1.5 py-0.2 rounded ml-auto flex items-center gap-0.5">
                    <Clock className="w-3 h-3 text-blue-600" />
                    Mới: {stat.recentNewCount}
                  </span>
                )}
              </div>

              {/* Latest Enacted Document Strip */}
              {hasLatest && stat.latestDoc && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDoc(stat.latestDoc!.id);
                  }}
                  className="p-2 rounded-lg bg-white/90 border border-slate-200/80 hover:border-blue-400 hover:bg-blue-50/60 transition-all text-left space-y-0.5 group/item"
                  title="Nhấp để mở văn bản mới nhất của sắc thuế này"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono font-bold text-blue-900 truncate">
                      {stat.latestDoc.document_number}
                    </span>
                    <span className="text-slate-400 tabular-nums shrink-0">
                      {formatDate(stat.latestDoc.effective_date || stat.latestDoc.issued_date)}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-800 truncate group-hover/item:text-blue-800">
                    {stat.latestDoc.title}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
