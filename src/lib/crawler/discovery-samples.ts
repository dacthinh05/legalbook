/**
 * Discovery Samples & Crawled Legal Document Data for Audit & Accounting
 * 
 * Filtered specifically for Auditing, Accounting, Corporate Tax, 
 * Transfer Pricing, Financial Statements (VAS/IFRS), and Invoices.
 */

import type { DocumentType } from '@/types';

export interface DiscoveredDoc {
  id: string;
  source: 'thuvienphapluat' | 'chinhphu' | 'vbpl' | 'gdt_gov' | 'mof_gov' | 'congbao';
  sourceName: string;
  sourceUrl: string;
  downloadUrl?: string;
  document_number: string;
  title: string;
  issuing_body: string;
  issued_date: string;
  effective_date: string | null;
  status: 'hieu_luc' | 'chua_hieu_luc';
  domain: 'tax' | 'accounting' | 'audit' | 'general';
  category_name: string;
  file_format: 'doc' | 'docx' | 'pdf';
  document_type?: DocumentType;
  summary_main: string;
  crawled_at: string;
  is_approved: boolean;
  is_simulated?: boolean;
  fallbackChain?: string[];
  html_content?: string;
}

export interface PriorityTopic {
  id: string;
  name: string;
  priorityYears: string[];
  keywords: string[];
  docCount: number;
}

export const PRIORITY_TOPICS_2024_2026: PriorityTopic[] = [
  {
    id: 'thue-tndn-expenses',
    name: 'Thuế TNDN, Chi phí được trừ & Giao dịch liên kết',
    priorityYears: ['2024', '2025'],
    keywords: ['Chi phí hợp lệ', 'Thanh toán không dùng tiền mặt', 'Lãi vay 30% EBITDA', 'Giao dịch liên kết'],
    docCount: 18,
  },
  {
    id: 'thue-gtgt-invoices',
    name: 'Luật Thuế GTGT 2024 & Hóa đơn điện tử máy tính tiền',
    priorityYears: ['2024', '2025'],
    keywords: ['Luật 48/2024/QH15', 'Nghị định 123/2020', 'Thông tư 78/2021', 'Hoàn thuế GTGT'],
    docCount: 22,
  },
  {
    id: 'kiem-toan-vsa',
    name: 'Chuẩn mực Kiểm toán độc lập (VSA) & Đơn vị có lợi ích công chúng',
    priorityYears: ['2024', '2025'],
    keywords: ['Luật 67/2011/QH12', 'Nghị định 84/2016', '37 Chuẩn mực VSA', 'Báo cáo kiểm toán'],
    docCount: 14,
  },
  {
    id: 'ke-toan-ifrs-vas',
    name: 'Chế độ Kế toán Doanh nghiệp (TT 200, TT 133, TT 24) & IFRS',
    priorityYears: ['2024', '2025'],
    keywords: ['Thông tư 200/2014', 'Thông tư 133/2016', 'Quyết định 345/QĐ-BTC', 'Khấu hao TSCĐ'],
    docCount: 16,
  },
  {
    id: 'lao-dong-tien-luong',
    name: 'Tiền lương tối thiểu vùng & Chế độ BHXH bắt buộc',
    priorityYears: ['2024', '2025'],
    keywords: ['Nghị định 74/2024/NĐ-CP', 'Luật BHXH 41/2024/QH15', 'Bộ luật Lao động 45/2019'],
    docCount: 12,
  },
];

export const DISCOVERY_TAX_AUDIT_SAMPLES: DiscoveredDoc[] = [
  {
    id: 'disc-tndn-3115',
    source: 'gdt_gov',
    sourceName: 'Tổng cục Thuế (gdt.gov.vn)',
    sourceUrl: 'https://gdt.gov.vn/wps/portal/home/hotro/vanban/cv3115',
    downloadUrl: '/documents/CV 3115.TCT-CS - 3115-TCT-CS về việc tính chi phí được trừ đối với .docx',
    document_number: '3115/TCT-CS',
    title: 'Công văn về việc tính chi phí được trừ đối với hóa đơn chứng từ từ nhà cung cấp nước ngoài (Meta, Google, AWS)',
    issuing_body: 'Tổng cục Thuế',
    issued_date: '2024-07-19',
    effective_date: null,
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế TNDN',
    file_format: 'docx',
    document_type: 'cong_van',
    summary_main: 'Hướng dẫn doanh nghiệp mua dịch vụ quảng cáo trực tuyến, điện toán đám mây từ nhà cung cấp nước ngoài (Meta, Google, Microsoft, AWS) đã đăng ký thuế tại Việt Nam được tính vào chi phí được trừ khi có hóa đơn và chứng từ thanh toán không dùng tiền mặt.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: [
      'Tổng cục Thuế gdt.gov.vn: Thu thập thành công công văn hướng dẫn',
      'Thư Viện Pháp Luật TVPL: Đối soát trùng khớp số hiệu và trích yếu'
    ],
  },
  {
    id: 'disc-gtgt-48',
    source: 'thuvienphapluat',
    sourceName: 'Thư Viện Pháp Luật (thuvienphapluat.vn)',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Luat-Thue-gia-tri-gia-tang-2024-589124.aspx',
    downloadUrl: '/documents/Luat 48.2024.QH15 - Thuế Giá trị gia tăng số 48-2024-QH15.docx',
    document_number: '48/2024/QH15',
    title: 'Luật Thuế Giá trị gia tăng số 48/2024/QH15',
    issuing_body: 'Quốc hội',
    issued_date: '2024-11-26',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế GTGT',
    file_format: 'docx',
    document_type: 'luat',
    summary_main: 'Luật Thuế GTGT mới quy định sửa đổi đối tượng không chịu thuế, chuẩn hóa điều kiện khấu trừ thuế GTGT đầu vào và chính sách hoàn thuế đối với hàng hóa xuất khẩu.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: [
      'Cơ sở dữ liệu Quốc gia VBPL: Toàn văn Luật đã được đối soát',
      'Thư Viện Pháp Luật: Thu thập tệp đính kèm .docx chính thức'
    ],
  },
  {
    id: 'disc-tndn-6367',
    source: 'gdt_gov',
    sourceName: 'Tổng cục Thuế (gdt.gov.vn)',
    sourceUrl: 'https://gdt.gov.vn/wps/portal/home/hotro/vanban/cv6367',
    downloadUrl: '/documents/CV 6367.TCT-KK - 6367-TCT-KK về việc hướng dẫn phân bổ và tạm nộp t.docx',
    document_number: '6367/TCT-KK',
    title: 'Công văn về việc hướng dẫn phân bổ và tạm nộp thuế TNDN theo quý (Quy tắc 80%)',
    issuing_body: 'Tổng cục Thuế',
    issued_date: '2024-12-31',
    effective_date: null,
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế TNDN',
    file_format: 'docx',
    document_type: 'cong_van',
    summary_main: 'Hướng dẫn doanh nghiệp thực hiện tạm nộp thuế TNDN 4 quý tối thiểu 80% số thuế phải nộp cả năm để tránh bị tính tiền chậm nộp theo quy định tại Nghị định 91/2022/NĐ-CP.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: ['Tổng cục Thuế: Bóc tách thành công hướng dẫn kê khai và tạm nộp'],
  },
  {
    id: 'disc-kt-238',
    source: 'gdt_gov',
    sourceName: 'Tổng cục Thuế (gdt.gov.vn)',
    sourceUrl: 'https://gdt.gov.vn/wps/portal/home/hotro/vanban/cv238',
    downloadUrl: '/documents/CV 238.TCT-TTKT - 238-TCT-TTKT về việc xác định quan hệ liên kết qua.docx',
    document_number: '238/TCT-TTKT',
    title: 'Công văn về việc xác định quan hệ liên kết qua giao dịch bảo lãnh và vay vốn ngân hàng',
    issuing_body: 'Tổng cục Thuế',
    issued_date: '2024-01-18',
    effective_date: null,
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Giao dịch liên kết',
    file_format: 'docx',
    document_type: 'cong_van',
    summary_main: 'Hướng dẫn xác định quan hệ liên kết theo điểm d khoản 2 Điều 5 Nghị định 132/2020/NĐ-CP khi doanh nghiệp vay vốn ngân hàng vượt 25% vốn góp chủ sở hữu và chiếm trên 50% tổng dư nợ.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: ['Tổng cục Thuế: Thu thập công văn hướng dẫn kiểm tra thuế'],
  },
  {
    id: 'disc-bhxh-74',
    source: 'chinhphu',
    sourceName: 'Cổng TTĐT Chính Phủ (vanban.chinhphu.vn)',
    sourceUrl: 'https://vanban.chinhphu.vn/default.aspx?pageid=27160&docid=210940',
    downloadUrl: '/documents/ND 74.2024.NĐ-CP - 74-2024-NĐ-CP quy định mức lương tối thiểu và chế .docx',
    document_number: '74/2024/NĐ-CP',
    title: 'Nghị định quy định mức lương tối thiểu và chế độ tiền lương làm thêm giờ, làm việc ban đêm đối với người lao động',
    issuing_body: 'Chính phủ',
    issued_date: '2024-06-30',
    effective_date: '2024-07-01',
    status: 'hieu_luc',
    domain: 'general',
    category_name: 'Lao động và tiền lương > Nghị định lao động',
    file_format: 'docx',
    document_type: 'nghi_dinh',
    summary_main: 'Quy định mức lương tối thiểu vùng mới áp dụng cho doanh nghiệp từ 01/07/2024 và công thức tính tiền lương làm thêm giờ, làm việc ban đêm phục vụ hạch toán chi phí nhân công.',
    crawled_at: '06:00 Hôm nay',
    is_approved: false,
    fallbackChain: ['Cổng Thông tin Chính phủ: Bóc tách toàn văn và bảng lương tối thiểu'],
  },
];
