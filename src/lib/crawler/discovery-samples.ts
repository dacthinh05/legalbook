/**
 * Discovery Samples & Crawled Document Data
 * Separated from page.tsx to optimize initial component load and bundle size.
 */

export interface DiscoveredDoc {
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

export interface PriorityTopic {
  id: string;
  name: string;
  priorityYears: string[];
  keywords: string[];
  docCount: number;
}

export const PRIORITY_TOPICS_2024_2026: PriorityTopic[] = [
  {
    id: 'thue-tndn-2025',
    name: 'Cải cách Thuế TNDN & Chi phí được trừ 2025–2026',
    priorityYears: ['2025', '2026'],
    keywords: ['Chi phí hợp lệ', 'Thanh toán không dùng tiền mặt', 'Khấu hao tài sản', 'Ưu đãi thuế'],
    docCount: 18,
  },
  {
    id: 'thue-tncn-overtime',
    name: 'Chính sách Thuế TNCN mới: Miễn thuế làm thêm giờ & Giảm trừ gia cảnh 15.5tr',
    priorityYears: ['2025', '2026'],
    keywords: ['Giảm trừ 15.5tr', 'Làm thêm giờ', 'Làm ban đêm', 'Biểu thuế 5 bậc', 'VNeID'],
    docCount: 14,
  },
  {
    id: 'thue-gtgt-2024',
    name: 'Luật Thuế GTGT 2024 & Nghĩa vụ hóa đơn điện tử',
    priorityYears: ['2024', '2025', '2026'],
    keywords: ['Luật 48/2024/QH15', 'Thuế suất 5% - 10%', 'Thời điểm lập HĐĐT', 'Hóa đơn máy tính tiền'],
    docCount: 22,
  },
  {
    id: 'kiem-toan-vsa',
    name: 'Chuẩn mực Kiểm toán độc lập (VSA) & Đơn vị có lợi ích công chúng',
    priorityYears: ['2025', '2026'],
    keywords: ['Luật 67/2025/QH15', 'Luân chuyển KTV', 'Kiểm toán bắt buộc', 'Báo cáo kiểm toán'],
    docCount: 12,
  },
  {
    id: 'ke-toan-ifrs',
    name: 'Lộ trình áp dụng IFRS / VFRS & Chế độ kế toán doanh nghiệp siêu nhỏ',
    priorityYears: ['2024', '2025', '2026'],
    keywords: ['Thông tư 99/2025/TT-BTC', 'Chuyển đổi IFRS', 'Doanh nghiệp siêu nhỏ', 'Chứng từ điện tử'],
    docCount: 16,
  },
  {
    id: 'lao-dong-tien-luong',
    name: 'Nghị định tiền lương tối thiểu vùng & Định mức giờ làm thêm 2024–2026',
    priorityYears: ['2024', '2025', '2026'],
    keywords: ['Nghị định 74/2024/NĐ-CP', 'Lương tối thiểu', 'Phụ cấp ca đêm', 'Thỏa thuận tăng ca'],
    docCount: 11,
  },
];

export const DISCOVERY_TAX_AUDIT_SAMPLES: DiscoveredDoc[] = [
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
    issued_date: '2026-07-15',
    effective_date: '2026-09-01',
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
    title: 'Công văn hướng dẫn chính sách thuế TNCN đối với thu nhập làm thêm giờ và quyết toán thuế điện tử',
    issuing_body: 'Tổng cục Thuế',
    issued_date: '2026-05-15',
    effective_date: '2026-05-15',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Công văn Thuế',
    file_format: 'docx',
    summary_main: 'Làm rõ điều kiện để tiền lương làm thêm giờ được miễn thuế TNCN 100%: Phải có thỏa thuận làm thêm giờ, bảng chấm công thực tế và bảng lương bóc tách rõ ràng. Chi phí ăn ca phục vụ ca làm thêm được trừ khi tính thuế TNDN.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
    fallbackChain: ['Tổng cục Thuế: Bóc tách thành công công văn giải đáp chính sách'],
  },
  {
    id: 'disc-tax-10',
    source: 'thuvienphapluat',
    sourceName: 'Thư Viện Pháp Luật (thuvienphapluat.vn)',
    sourceUrl: 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-253-2026-ND-CP-quy-dinh-chi-tiet-Luat-Thue-thu-nhap-ca-nhan-645890.aspx',
    document_number: '253/2026/NĐ-CP',
    title: 'Nghị định quy định chi tiết thi hành Luật Thuế Thu nhập cá nhân 2025',
    issuing_body: 'Chính phủ',
    issued_date: '2026-06-30',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    domain: 'tax',
    category_name: 'Thuế > Thuế TNCN',
    file_format: 'docx',
    summary_main: 'Biểu thuế lũy tiến từng phần 5 bậc mới, quy định điều kiện miễn giảm thuế cho người lao động trực tiếp sản xuất, công nghệ cao và thu nhập từ thừa kế quà tặng.',
    crawled_at: '06:00 Hôm nay',
    is_approved: true,
    fallbackChain: ['Thư Viện Pháp Luật TVPL: Thu thập thành công bản đầy đủ'],
  },
];
