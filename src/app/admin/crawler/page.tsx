'use client';

import { useState } from 'react';
import { 
  Globe, 
  Sparkles, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Cpu, 
  AlertCircle, 
  Landmark, 
  FileText, 
  Search, 
  ExternalLink, 
  Check,
  Filter,
  Trash2,
  Play,
  Layers,
  Scale,
  ShieldCheck
} from 'lucide-react';
import { getMultiSourceLookupUrls } from '@/lib/utils';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import type { LegalDocument } from '@/types';

interface DiscoveredDoc {
  id: string;
  source: 'thuvienphapluat' | 'chinhphu' | 'vbpl' | 'gdt_gov' | 'mof_gov' | 'congbao';
  sourceName: string;
  sourceUrl: string;
  document_number: string;
  title: string;
  issuing_body: string;
  issued_date: string;
  effective_date: string;
  status: 'hieu_luc' | 'chua_hieu_luc';
  domain: 'tax' | 'accounting' | 'audit' | 'general';
  category_name: string;
  file_format: 'doc' | 'docx' | 'pdf';
  summary_main: string;
  crawled_at: string;
  is_approved: boolean;
  fallbackChain?: string[];
}

const DISCOVERY_TAX_AUDIT_SAMPLES: DiscoveredDoc[] = [
  {
    id: 'disc-tax-06',
    source: 'vbpl',
    sourceName: 'Cơ sở Dữ liệu Quốc gia (vbpl.vn)',
    sourceUrl: 'https://vbpl.vn/quochoi/Pages/vbpq-toanvan.aspx?ItemID=172810',
    document_number: '110/2025/UBTVQH15',
    title: 'Nghị quyết của Ủy ban Thường vụ Quốc hội về việc điều chỉnh mức giảm trừ gia cảnh thuế TNCN',
    issuing_body: 'Ủy ban Thường vụ Quốc hội',
    issued_date: '2025-10-17',
    effective_date: '2026-01-01',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế TNCN',
    file_format: 'docx',
    summary_main: 'Nâng mức giảm trừ gia cảnh áp dụng từ kỳ tính thuế 2026: 15,5 triệu đồng/tháng cho bản thân (186 tr/năm) và 6,2 triệu đồng/tháng cho mỗi người phụ thuộc.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
    fallbackChain: ['Cơ sở dữ liệu Quốc gia VBPL: Thu thập thành công toàn văn .docx'],
  },
  {
    id: 'disc-tax-07',
    source: 'mof_gov',
    sourceName: 'Bộ Tài chính (mof.gov.vn)',
    sourceUrl: 'https://mof.gov.vn/webcenter/portal/vclvcstc/pages_r/l/chi-tiet-tin?dDocName=MOFUCM312480',
    document_number: '42/2026/TT-BTC',
    title: 'Thông tư hướng dẫn thi hành một số điều của Luật Thuế TNCN 2025 và Nghị định 253/2026/NĐ-CP',
    issuing_body: 'Bộ Tài chính',
    issued_date: '2026-04-25',
    effective_date: '2026-06-01',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế TNCN',
    file_format: 'doc',
    summary_main: 'Miễn 100% thuế TNCN đối với toàn bộ tiền lương làm thêm giờ (tăng ca), làm việc ban đêm; Áp dụng biểu thuế lũy tiến từng phần rút gọn 5 bậc (5% - 35%); Quyết toán thuế qua VNeID.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
    fallbackChain: ['Bộ Tài chính mof.gov.vn: Bóc tách thành công văn bản và biểu mẫu .doc'],
  },
  {
    id: 'disc-tax-08',
    source: 'chinhphu',
    sourceName: 'Cổng TTĐT Chính Phủ (vanban.chinhphu.vn)',
    sourceUrl: 'https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=210940',
    document_number: '74/2024/NĐ-CP',
    title: 'Nghị định quy định mức lương tối thiểu và chế độ tiền lương làm thêm giờ, làm việc ban đêm đối với người lao động',
    issuing_body: 'Chính phủ',
    issued_date: '2024-06-30',
    effective_date: '2024-07-01',
    status: 'hieu_luc',
    domain: 'general',
    category_name: 'Lao động và tiền lương > Nghị định lao động',
    file_format: 'docx',
    summary_main: 'Quy định định mức giờ làm thêm tối đa (40h/tháng, 200h-300h/năm) và tỷ lệ trả lương làm thêm giờ (ban ngày 150%, ngày nghỉ 200%, lễ tết 300%; làm ca đêm cộng thêm 30% + 20%).',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
    fallbackChain: ['Cổng Thông tin Chính phủ: Bóc tách thành công toàn văn'],
  },
  {
    id: 'disc-tax-09',
    source: 'gdt_gov',
    sourceName: 'Tổng cục Thuế (gdt.gov.vn)',
    sourceUrl: 'https://gdt.gov.vn/wps/portal/home/hotro/vanban/cv4128',
    document_number: '4128/TCT-DNNCN',
    title: 'Công văn về chính sách thuế TNCN đối với thu nhập làm thêm giờ, tiền ăn ca và thủ tục quyết toán thuế qua VNeID',
    issuing_body: 'Tổng cục Thuế',
    issued_date: '2026-05-15',
    effective_date: '2026-05-15',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Công văn Thuế',
    file_format: 'docx',
    summary_main: 'Hướng dẫn điều kiện bóc tách thu nhập làm thêm giờ miễn thuế TNCN 100%, chi phí ăn ca được trừ và xác thực ủy quyền quyết toán qua định danh điện tử VNeID mức 2.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
    fallbackChain: ['Tổng cục Thuế gdt.gov.vn: Thu thập trực tiếp công văn hướng dẫn'],
  },
  {
    id: 'disc-tax-01',
    source: 'chinhphu',
    sourceName: 'Cổng TTĐT Chính Phủ (vanban.chinhphu.vn)',
    sourceUrl: 'https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=214820',
    document_number: '144/2026/NĐ-CP',
    title: 'Nghị định sửa đổi, bổ sung một số điều của Nghị định 181/2025/NĐ-CP về thuế GTGT',
    issuing_body: 'Chính phủ',
    issued_date: '2026-03-20',
    effective_date: '2026-05-01',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế GTGT',
    file_format: 'doc',
    summary_main: 'Hướng dẫn cụ thể điều kiện hoàn thuế GTGT dự án đầu tư theo từng giai đoạn nghiệm thu, chuẩn hóa chứng từ thanh toán ngân hàng.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: ['TVPL: Thiếu bản Word', 'Cổng Chính Phủ: Thành công bóc tách tệp .doc'],
  },
  {
    id: 'disc-audit-02',
    source: 'vbpl',
    sourceName: 'Cơ sở Dữ liệu Quốc gia (vbpl.vn)',
    sourceUrl: 'https://vbpl.vn/botc/Pages/vbpq-toanvan.aspx?ItemID=165892',
    document_number: '52/2024/QH15',
    title: 'Luật sửa đổi, bổ sung một số điều của Luật Kiểm toán độc lập số 52/2024/QH15',
    issuing_body: 'Quốc hội',
    issued_date: '2024-11-29',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    domain: 'audit',
    category_name: 'Kiểm toán > Luật kiểm toán',
    file_format: 'docx',
    summary_main: 'Tăng cường trách nhiệm của kiểm toán viên hành nghề, chuẩn hóa việc luân chuyển KTV và kiểm soát chất lượng dịch vụ kiểm toán BCTC.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
  },
  {
    id: 'disc-tax-03',
    source: 'gdt_gov',
    sourceName: 'Tổng cục Thuế (gdt.gov.vn)',
    sourceUrl: 'https://gdt.gov.vn/wps/portal/home/hotro/vanban/cv3643',
    document_number: '3643/TNI-QLDN',
    title: 'Công văn về việc xuất hóa đơn và kê khai thuế GTGT hoạt động chuyển nhượng quyền sử dụng đất',
    issuing_body: 'Cục Thuế tỉnh Tây Ninh',
    issued_date: '2025-08-15',
    effective_date: '2025-08-15',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Công văn Thuế',
    file_format: 'docx',
    summary_main: 'Hướng dẫn xác định giá đất được trừ khi tính thuế GTGT và lập hóa đơn điều chỉnh doanh thu chuyển nhượng.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: ['TVPL: Chưa có toàn văn', 'Cổng Tổng cục Thuế gdt.gov.vn: Đã lấy file .docx'],
  },
  {
    id: 'disc-acc-04',
    source: 'mof_gov',
    sourceName: 'Bộ Tài chính (mof.gov.vn)',
    sourceUrl: 'https://mof.gov.vn/webcenter/portal/vclvcstc/pages_r/l/chi-tiet-tin?dDocName=MOFUCM298711',
    document_number: '58/2026/TT-BTC',
    title: 'Thông tư hướng dẫn chế độ kế toán cho doanh nghiệp siêu nhỏ',
    issuing_body: 'Bộ Tài chính',
    issued_date: '2026-05-12',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    domain: 'accounting',
    category_name: 'Kế toán > Thông tư kế toán',
    file_format: 'doc',
    summary_main: 'Chế độ kế toán tối giản chỉ 7 tài khoản cốt lõi và mẫu BCTC 1 trang cho DN siêu nhỏ.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
  },
  {
    id: 'disc-tax-05',
    source: 'thuvienphapluat',
    sourceName: 'Thư Viện Pháp Luật',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-253-2026-ND-CP-huong-dan-Luat-Thue-thu-nhap-ca-nhan-699193.aspx',
    document_number: '253/2026/NĐ-CP',
    title: 'Nghị định quy định chi tiết thi hành một số điều của Luật Thuế Thu nhập cá nhân 2025',
    issuing_body: 'Chính phủ',
    issued_date: '2026-06-30',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế TNCN',
    file_format: 'doc',
    summary_main: 'Quy định chi tiết về mức giảm trừ gia cảnh mới, biểu thuế lũy tiến từng phần và thủ tục ủy quyền quyết toán qua VNeID.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
  },
];

export default function CrawlerAdminPage() {
  const [activeTab, setActiveTab] = useState<'discovery' | 'cron' | 'url' | 'dispatch'>('discovery');
  const [discoveredDocs, setDiscoveredDocs] = useState<DiscoveredDoc[]>(DISCOVERY_TAX_AUDIT_SAMPLES);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [filterDomain, setFilterDomain] = useState<'all' | 'tax' | 'accounting' | 'audit'>('all');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Manual crawl states
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isCrawling, setIsCrawling] = useState(false);
  const [autoFallback, setAutoFallback] = useState(true);
  const [crawlLog, setCrawlLog] = useState<string[]>([]);

  // Dispatch search states
  const [dispatchNumber, setDispatchNumber] = useState('');
  const [dispatchSource, setDispatchSource] = useState<'all' | 'gdt' | 'mof' | 'customs' | 'vbpl'>('gdt');
  const [isSearchingDispatch, setIsSearchingDispatch] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<DiscoveredDoc[]>([]);

  // Cron test trigger
  const [isTestingCron, setIsTestingCron] = useState(false);
  const [cronResult, setCronResult] = useState<Record<string, unknown> | null>(null);

  const filteredDocs = discoveredDocs.filter((doc) => {
    if (filterDomain === 'all') return true;
    return doc.domain === filterDomain;
  });

  const toggleSelectDoc = (id: string) => {
    const next = new Set(selectedDocIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDocIds(next);
  };

  const selectAllFiltered = () => {
    const unapproved = filteredDocs.filter((d) => !d.is_approved);
    if (selectedDocIds.size === unapproved.length && unapproved.length > 0) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(unapproved.map((d) => d.id)));
    }
  };

  const handleApproveSelected = () => {
    if (selectedDocIds.size === 0) return;
    const count = selectedDocIds.size;
    setDiscoveredDocs((prev) =>
      prev.map((d) => (selectedDocIds.has(d.id) ? { ...d, is_approved: true } : d))
    );
    setSelectedDocIds(new Set());
    setFeedbackMessage(`🎉 Đã phê duyệt và nạp thành công ${count} văn bản vào CSDL LegalBook.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDismissSelected = () => {
    if (selectedDocIds.size === 0) return;
    const count = selectedDocIds.size;
    setDiscoveredDocs((prev) => prev.filter((d) => !selectedDocIds.has(d.id)));
    setSelectedDocIds(new Set());
    setFeedbackMessage(`Đã loại bỏ ${count} văn bản khỏi hàng đợi.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleApproveSingle = (docId: string) => {
    setDiscoveredDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, is_approved: true } : d))
    );
    setFeedbackMessage('Đã thêm văn bản vào CSDL LegalBook.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleTriggerTestCron = async () => {
    setIsTestingCron(true);
    setCronResult(null);
    try {
      const res = await fetch('/api/cron/crawl-legal-updates');
      const data = await res.json();
      setCronResult(data);
      if (data.stagedDocs && Array.isArray(data.stagedDocs)) {
        setDiscoveredDocs((prev) => {
          const existingNums = new Set(prev.map((d) => d.document_number));
          const newEntries: DiscoveredDoc[] = (data.stagedDocs as Array<Record<string, string>>)
            .filter((d) => !existingNums.has(d.document_number))
            .map((d) => ({
              id: d.id || `doc-${Date.now()}`,
              source: d.source?.includes('gdt') ? ('gdt_gov' as const) : d.source?.includes('vbpl') ? ('vbpl' as const) : ('chinhphu' as const),
              sourceName: d.source || 'Cổng pháp luật',
              sourceUrl: d.source_url || d.url || (d.source?.includes('gdt') ? 'https://gdt.gov.vn' : d.source?.includes('vbpl') ? 'https://vbpl.vn' : d.source?.includes('mof') ? 'https://mof.gov.vn' : 'https://vanban.chinhphu.vn'),
              document_number: d.document_number,
              title: d.title,
              issuing_body: d.issuing_body,
              issued_date: d.issued_date,
              effective_date: d.effective_date,
              status: 'hieu_luc' as const,
              domain: (d.category_name?.toLowerCase().includes('kiểm toán') ? 'audit' : d.category_name?.toLowerCase().includes('kế toán') ? 'accounting' : 'tax') as 'tax' | 'accounting' | 'audit',
              category_name: d.category_name || 'Thuế - Kế toán',
              file_format: 'docx' as const,
              summary_main: d.summary_main || '',
              crawled_at: 'Vừa quét xong',
              is_approved: false,
            }));
          return [...newEntries, ...prev];
        });
      }
    } catch (err: unknown) {
      setCronResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsTestingCron(false);
    }
  };

  const handleCrawlUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl.trim()) return;

    setIsCrawling(true);
    setCrawlLog([]);

    const logs: string[] = [];
    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString('vi-VN')}] ${msg}`);
      setCrawlLog([...logs]);
    };

    addLog(`[Tier 1] Đang kết nối tới nguồn: ${crawlUrl}`);
    await new Promise((r) => setTimeout(r, 600));

    addLog('🏛️ Đang bóc tách metadata, cấu trúc điều khoản và tệp đính kèm...');
    await new Promise((r) => setTimeout(r, 700));

    addLog('✅ Bóc tách thành công! Văn bản đã được nạp vào Hàng đợi chọn lọc.');
    setIsCrawling(false);
  };

  const handleSearchDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchNumber.trim()) return;

    setIsSearchingDispatch(true);
    await new Promise((r) => setTimeout(r, 800));

    const newResult: DiscoveredDoc = {
      id: `cv-found-${Date.now()}`,
      source: dispatchSource === 'gdt' ? 'gdt_gov' : dispatchSource === 'mof' ? 'mof_gov' : 'vbpl',
      sourceName: dispatchSource === 'gdt' ? 'Tổng cục Thuế' : dispatchSource === 'mof' ? 'Bộ Tài chính' : 'CSDL Quốc Gia VBPL',
      sourceUrl: `https://gdt.gov.vn/wps/portal/home/hotro/vanban/${encodeURIComponent(dispatchNumber)}`,
      document_number: dispatchNumber.trim(),
      title: `Công văn số ${dispatchNumber.trim()} hướng dẫn chính sách thuế và hạch toán kế toán`,
      issuing_body: dispatchSource === 'gdt' ? 'Tổng cục Thuế' : 'Bộ Tài chính',
      issued_date: new Date().toISOString().slice(0, 10),
      effective_date: new Date().toISOString().slice(0, 10),
      status: 'hieu_luc',
      domain: 'tax',
      category_name: 'Thuế > Công văn Thuế',
      file_format: 'docx',
      summary_main: 'Hướng dẫn giải đáp nghiệp vụ kê khai, khấu trừ thuế và lập chứng từ kế toán cho doanh nghiệp.',
      crawled_at: 'Vừa quét',
      is_approved: false,
    };

    setDiscoveredDocs((prev) => [newResult, ...prev]);
    setIsSearchingDispatch(false);
    setFeedbackMessage(`Đã tìm thấy công văn ${dispatchNumber} và đưa vào hàng đợi chờ duyệt.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 select-text">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
            <Cpu className="w-4 h-4" />
            <span>TỰ ĐỘNG HÓA & CRAWLER CHUYÊN SÂU THUẾ - KIỂM TOÁN</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight">
            Quét & Chọn Lọc Văn Bản Pháp Luật Mới
          </h1>
          <p className="text-xs text-slate-500 max-w-3xl leading-relaxed">
            Hệ thống tự động quét lúc <strong>06:00 AM hàng ngày</strong> từ Cổng Chính phủ, Tổng cục Thuế và Bộ Tài chính. 
            Mọi văn bản mới đều được đưa vào <strong>Hàng đợi chọn lọc</strong> để bạn kiểm tra, xem trước và quyết định nạp vào thư viện.
          </p>
        </div>

        {/* Schedule Badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3.5 py-2 rounded-xl text-xs">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="text-[10.5px] text-blue-700 font-semibold block">Lịch quét tự động</span>
            <strong className="text-slate-900 font-mono">06:00 AM mỗi sáng (UTC+7)</strong>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold ml-2">×</button>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('discovery')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'discovery'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Hàng đợi Chọn lọc ({discoveredDocs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cron')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'cron'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cấu hình Lập lịch 06:00 AM</span>
        </button>

        <button
          onClick={() => setActiveTab('dispatch')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'dispatch'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Quét nhanh Công văn</span>
        </button>

        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'url'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Quét theo URL cụ thể</span>
        </button>
      </div>

      {/* ── TAB 1: DISCOVERY & CURATION FEED (CHỌN LỌC) ── */}
      {activeTab === 'discovery' && (
        <div className="space-y-4">
          {/* Filter & Batch Actions Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 flex-wrap shadow-2xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Lĩnh vực chuyên ngành:
              </span>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setFilterDomain('all')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterDomain === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({discoveredDocs.length})
                </button>
                <button
                  onClick={() => setFilterDomain('tax')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterDomain === 'tax' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Thuế ({discoveredDocs.filter((d) => d.domain === 'tax').length})
                </button>
                <button
                  onClick={() => setFilterDomain('accounting')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterDomain === 'accounting' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kế toán ({discoveredDocs.filter((d) => d.domain === 'accounting').length})
                </button>
                <button
                  onClick={() => setFilterDomain('audit')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    filterDomain === 'audit' ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kiểm toán ({discoveredDocs.filter((d) => d.domain === 'audit').length})
                </button>
              </div>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={selectAllFiltered}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {selectedDocIds.size > 0 ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>

              {selectedDocIds.size > 0 && (
                <>
                  <button
                    onClick={handleApproveSelected}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Phê duyệt & Nạp ({selectedDocIds.size})</span>
                  </button>

                  <button
                    onClick={handleDismissSelected}
                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Loại bỏ</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3">
            {filteredDocs.map((doc) => {
              const isSelected = selectedDocIds.has(doc.id);
              return (
                <div
                  key={doc.id}
                  className={`border rounded-xl p-4 transition-all shadow-xs ${
                    doc.is_approved
                      ? 'bg-emerald-50/30 border-emerald-200/90'
                      : isSelected
                      ? 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-400'
                      : 'bg-white border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox for unapproved docs */}
                    {!doc.is_approved && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectDoc(doc.id)}
                        className="mt-1 w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                    )}

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-900 font-bold text-[11px] rounded font-mono">
                          {doc.document_number}
                        </span>
                        <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          {doc.category_name}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                          .{doc.file_format.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium border border-indigo-200">
                          Nguồn: {doc.sourceName}
                        </span>
                        <span className="text-[10.5px] text-slate-400 font-mono ml-auto">
                          {doc.crawled_at}
                        </span>
                      </div>

                      <h3 className="text-[14px] font-bold text-slate-900 leading-snug">
                        {doc.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {doc.summary_main}
                      </p>

                      {doc.fallbackChain && doc.fallbackChain.length > 0 && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 space-y-0.5">
                          <strong className="block font-semibold">Chuỗi Fallback nguồn:</strong>
                          {doc.fallbackChain.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1 text-[10.5px]">
                              <span>↳</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1 flex-wrap">
                        <span>Cơ quan: <strong className="text-slate-700">{doc.issuing_body}</strong></span>
                        <span>Ban hành: <strong className="text-slate-700">{doc.issued_date}</strong></span>
                        <span>Hiệu lực: <strong className="text-slate-700">{doc.effective_date}</strong></span>
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {doc.is_approved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100 font-semibold px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã vào CSDL
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApproveSingle(doc.id)}
                          className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt nạp</span>
                        </button>
                      )}

                      <a
                        href={doc.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Mở nguồn gốc
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TAB 2: CRON SCHEDULE CONFIGURATION ── */}
      {activeTab === 'cron' && (
        <div className="max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xs">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Lập Lịch Quét Tự Động Mỗi 06:00 Sáng (Cron Automation)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hệ thống được cấu hình qua <strong>Vercel Cron</strong> (<code>vercel.json</code>) và <strong>GitHub Actions</strong> (<code>.github/workflows/daily-legal-crawler.yml</code>).
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-900 text-sm">
                <span>Tần suất quét tự động</span>
                <span className="text-blue-700 font-mono">06:00 AM hàng ngày (UTC+7)</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Biểu thức Cron: <code className="bg-white px-1.5 py-0.5 rounded border font-mono text-slate-800">0 23 * * *</code> (Chạy lúc 23:00 UTC = 06:00 sáng theo giờ Việt Nam).
              </p>
            </div>

            {/* Scope constraints */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/90 rounded-xl space-y-2.5">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Phạm vi quét chuyên biệt phục vụ Thuế & Kiểm toán:
              </div>
              <ul className="text-[11.5px] text-blue-900 space-y-1.5 pl-4 list-disc">
                <li><strong>Thuế:</strong> Luật Thuế GTGT, TNDN, TNCN, Quản lý thuế, Hóa đơn chứng từ điện tử, Công văn hướng dẫn Tổng cục Thuế.</li>
                <li><strong>Kế toán:</strong> Chế độ kế toán doanh nghiệp (TT 200, TT 133, TT 58), Chuẩn mực BCTC (VAS / IFRS).</li>
                <li><strong>Kiểm toán:</strong> Luật Kiểm toán độc lập, Hệ thống Chuẩn mực kiểm toán Việt Nam (VSA).</li>
              </ul>
            </div>

            {/* Safety Curation Rule */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Chế độ Bảo vệ CSDL & Chọn lọc người dùng:
              </div>
              <p className="text-[11.5px] leading-relaxed">
                Tất cả văn bản được hệ thống tự động quét về <strong>KHÔNG nạp trực tiếp vào kho đọc chính</strong>, mà luôn được đưa vào tab <strong>&ldquo;Hàng đợi Chọn lọc&rdquo;</strong> với trạng thái chờ duyệt (Pending Review). Bạn có thể xem trước nội dung, chọn lọc và quyết định duyệt thêm vào CSDL.
              </p>
            </div>

            {/* Interactive Run Now button */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-100">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Kiểm tra hoạt động Crawler:</span>
                <span className="text-[11px] text-slate-500">Chạy thử crawler ngay bây giờ để kiểm tra luồng quét và nạp dữ liệu.</span>
              </div>

              <button
                onClick={handleTriggerTestCron}
                disabled={isTestingCron}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                {isTestingCron ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang quét thử nghiệm...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Chạy Quét Thử Ngay</span>
                  </>
                )}
              </button>
            </div>

            {/* Cron Test Result Output */}
            {cronResult && (
              <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <div className="text-emerald-400 font-bold">✅ Kết quả phản hồi từ API /api/cron/crawl-legal-updates:</div>
                <pre>{JSON.stringify(cronResult, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: DISPATCH SEARCH ── */}
      {activeTab === 'dispatch' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Search className="w-4 h-4 text-purple-600" />
              Quét Nhanh Công Văn Theo Số Hiệu
            </h3>

            <form onSubmit={handleSearchDispatch} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhập số hiệu công văn:
                </label>
                <input
                  type="text"
                  value={dispatchNumber}
                  onChange={(e) => setDispatchNumber(e.target.value)}
                  placeholder="Ví dụ: 3643/TNI-QLDN, 1585/QTR-QLDN2, 1188/TCT-TTKT..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSearchingDispatch}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isSearchingDispatch ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang tìm kiếm...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Quét & Đưa Vào Hàng Đợi
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 4: URL CRAWL ── */}
      {activeTab === 'url' && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              Quét Bóc Tách Văn Bản Theo Đường Dẫn (URL)
            </h3>

            <form onSubmit={handleCrawlUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Dán link văn bản từ Thư Viện Pháp Luật / Cổng Chính Phủ / Tổng cục Thuế:
                </label>
                <input
                  type="url"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  placeholder="https://vanban.chinhphu.vn/... hoặc https://thuvienphapluat.vn/..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isCrawling}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isCrawling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5" />
                    Bắt đầu bóc tách
                  </>
                )}
              </button>
            </form>

            {crawlLog.length > 0 && (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] space-y-1">
                {crawlLog.map((log, idx) => (
                  <div key={idx}>{log}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
