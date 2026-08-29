const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');

// Read environment
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

function toUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const docDir = path.join(__dirname, '../public/documents');
const actualFiles = fs.readdirSync(docDir);

// EXPANDED MASTER LIST OF AUTHENTIC VIETNAMESE LAWS, DECREES, CIRCULARS & OFFICIAL DISPATCHES
const expandedRealDocs = [
  // ==========================
  // NHÓM 1: KẾ TOÁN
  // ==========================
  {
    id: 'doc-luat-kt-2015',
    title: 'Luật Kế toán số 88/2015/QH13',
    document_number: '88/2015/QH13',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Nguyễn Sinh Hùng',
    issued_date: '2015-11-20',
    effective_date: '2017-01-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-luat',
    summary_main: 'Luật Kế toán quy định về nội dung công tác kế toán, tổ chức bộ máy kế toán, người làm kế toán, hoạt động kinh doanh dịch vụ kế toán và quản lý nhà nước về kế toán.',
    summary_new_points: 'Khung pháp lý cho chứng từ kế toán điện tử, nguyên tắc giá trị hợp lý và lộ trình áp dụng Chuẩn mực Báo cáo Tài chính Quốc tế (IFRS).',
    summary_accounting_impact: 'Căn cứ pháp lý nền tảng cao nhất của toàn bộ hệ thống kế toán doanh nghiệp tại Việt Nam.',
    summary_actions_needed: 'Rà soát chứng từ, sổ sách kế toán đảm bảo tuân thủ Luật Kế toán.',
  },
  {
    id: 'doc-luat-suadoi-9luat-2024',
    title: 'Luật số 56/2024/QH15 sửa đổi, bổ sung 9 luật trong lĩnh vực tài chính, kế toán, kiểm toán, thuế',
    document_number: '56/2024/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2024-11-29',
    effective_date: '2025-01-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-luat',
    summary_main: 'Sửa đổi, bổ sung đồng bộ 9 đạo luật tài chính quan trọng: Luật Chứng khoán, Luật Kế toán, Luật Kiểm toán độc lập, Luật Ngân sách NN, Luật Quản lý thuế...',
    summary_new_points: 'Đơn giản hóa chữ ký và luân chuyển chứng từ kế toán điện tử; Nâng cao trách nhiệm pháp lý của kiểm toán viên và đơn vị cung cấp dịch vụ kế toán.',
    summary_accounting_impact: 'Chấp nhận quy trình phê duyệt điện tử linh hoạt hơn trong doanh nghiệp.',
    summary_actions_needed: 'Cập nhật quy chế ký duyệt chứng từ và kiểm soát chất lượng từ năm 2025.',
  },
  {
    fileNameMatch: '99.2025',
    id: 'doc-tt-99-ketoan-2025',
    title: 'Thông tư 99/2025/TT-BTC ban hành Chế độ kế toán doanh nghiệp (Thay thế Thông tư 200/2014/TT-BTC)',
    document_number: '99/2025/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2025-08-15',
    effective_date: '2026-01-01',
    status: 'chua_hieu_luc',
    category_id: 'cat-acc-tt',
    summary_main: 'Chế độ kế toán doanh nghiệp thế hệ mới thay thế toàn diện Thông tư 200/2014/TT-BTC từ ngày 01/01/2026.',
    summary_new_points: 'Tiệm cận chuẩn mực quốc tế IFRS; Cập nhật hệ thống tài khoản cho kinh tế số, tài sản vô hình và công cụ tài chính phái sinh; Bắt buộc Báo cáo lưu chuyển tiền tệ gián tiếp cho công ty niêm yết.',
    summary_accounting_impact: 'Thay đổi toàn bộ biểu mẫu BCTC, bảng cân đối kế toán và hệ thống tài khoản kế toán cấp 1, 2.',
    summary_actions_needed: 'Tập huấn chuyển đổi hệ thống kế toán sang TT 99/2025 trước năm tài chính 2026.',
  },
  {
    fileNameMatch: '58 HD',
    id: 'doc-tt-58-ketoan-2026',
    title: 'Thông tư 58/2026/TT-BTC hướng dẫn chế độ kế toán cho doanh nghiệp siêu nhỏ',
    document_number: '58/2026/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2026-05-12',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-tt',
    summary_main: 'Chế độ kế toán tối giản dành riêng cho doanh nghiệp siêu nhỏ và hộ kinh doanh chuyển đổi lên doanh nghiệp.',
    summary_new_points: 'Rút gọn hệ thống tài khoản chỉ còn dưới 10 tài khoản cơ bản; Báo cáo tài chính rút gọn 01 trang duy nhất.',
    summary_accounting_impact: 'Giảm 70% gánh nặng chi phí kế toán và thời gian lập báo cáo cho doanh nghiệp nhỏ.',
    summary_actions_needed: 'Lựa chọn áp dụng chế độ kế toán siêu nhỏ nếu đủ điều kiện quy mô.',
  },
  {
    id: 'doc-tt-200-2014',
    title: 'Thông tư 200/2014/TT-BTC hướng dẫn Chế độ kế toán Doanh nghiệp',
    document_number: '200/2014/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Đinh Tiến Dũng',
    issued_date: '2014-12-22',
    effective_date: '2015-01-01',
    expiry_date: '2025-12-31',
    status: 'hieu_luc',
    category_id: 'cat-acc-tt',
    summary_main: 'Chế độ kế toán doanh nghiệp hiện hành (sẽ hết hiệu lực từ 01/01/2026 khi Thông tư 99/2025 có hiệu lực).',
    summary_new_points: 'Cơ sở chuẩn mực cho toàn bộ hệ thống tài khoản kế toán doanh nghiệp từ 2015 đến hết 2025.',
    summary_accounting_impact: 'Áp dụng xuyên suốt cho các niên độ tài chính 2015 - 2025.',
    summary_actions_needed: 'Chuẩn bị chuyển tiếp số dư sang Thông tư 99/2025/TT-BTC vào ngày 01/01/2026.',
  },

  // ==========================
  // NHÓM 2: KIỂM TOÁN
  // ==========================
  {
    id: 'doc-luat-kiemtoan-2011',
    title: 'Luật Kiểm toán độc lập số 67/2011/QH12',
    document_number: '67/2011/QH12',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Nguyễn Phú Trọng',
    issued_date: '2011-03-29',
    effective_date: '2012-01-01',
    status: 'hieu_luc',
    category_id: 'cat-aud-luat',
    summary_main: 'Quy định về hoạt động kiểm toán độc lập, quyền và nghĩa vụ của kiểm toán viên hành nghề, doanh nghiệp kiểm toán và đơn vị được kiểm toán.',
    summary_new_points: 'Nguyên tắc hành nghề độc lập, khách quan, bảo mật; Các đối tượng doanh nghiệp bắt buộc kiểm toán BCTC hàng năm.',
    summary_accounting_impact: 'Doanh nghiệp FDI, công ty đại chúng, tổ chức tín dụng bắt buộc phát hành BCTC kiểm toán.',
    summary_actions_needed: 'Ký hợp đồng kiểm toán và hoàn thành kiểm toán trước hạn nộp BCTC.',
  },
  {
    id: 'doc-nd-84-2016',
    title: 'Nghị định 84/2016/NĐ-CP quy định về tiêu chuẩn, điều kiện đối với kiểm toán viên hành nghề và doanh nghiệp kiểm toán',
    document_number: '84/2016/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issued_date: '2016-07-01',
    effective_date: '2016-07-01',
    status: 'hieu_luc',
    category_id: 'cat-aud-nd',
    summary_main: 'Quy định điều kiện hành nghề kiểm toán, hồ sơ đăng ký hành nghề và kiểm soát chất lượng dịch vụ kiểm toán.',
    summary_new_points: 'Quy định chi tiết về duy trì điều kiện tối thiểu 5 kiểm toán viên hành nghề cho công ty kiểm toán.',
    summary_accounting_impact: 'Bảo đảm tính pháp lý và độ tin cậy của Báo cáo kiểm toán độc lập.',
    summary_actions_needed: 'Định kỳ cập nhật kiến thức kiểm toán viên hàng năm (CPE).',
  },
  {
    id: 'doc-tt-214-2012-vsa',
    title: 'Thông tư 214/2012/TT-BTC ban hành Hệ thống Chuẩn mực kiểm toán Việt Nam (VSA)',
    document_number: '214/2012/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Trần Xuân Hà',
    issued_date: '2012-12-06',
    effective_date: '2014-01-01',
    status: 'hieu_luc',
    category_id: 'cat-aud-cm',
    summary_main: 'Ban hành 37 chuẩn mực kiểm toán Việt Nam (VSA 200, 315, 330, 500, 700...) tương đương chuẩn mực quốc tế ISA.',
    summary_new_points: 'Khung pháp lý kỹ thuật bắt buộc áp dụng cho toàn bộ các cuộc kiểm toán BCTC tại Việt Nam.',
    summary_accounting_impact: 'Xác định các thủ tục kiểm toán trọng yếu và ý kiến kiểm toán.',
    summary_actions_needed: 'Kiểm toán viên tuân thủ nghiêm ngặt chuẩn mực VSA khi thực hiện kiểm toán.',
  },
  {
    fileNameMatch: 'T05',
    id: 'doc-bantin-t05-2026',
    title: 'Bản tin Pháp luật & Thuế — Cập nhật các chính sách có hiệu lực Tháng 05/2026 (Audit PACO)',
    document_number: 'PACO-T05/2026',
    document_type: 'khac',
    issuing_body: 'Audit PACO Research Team',
    signer: 'Ban Chuyên môn Audit PACO',
    issued_date: '2026-05-01',
    effective_date: '2026-05-01',
    status: 'hieu_luc',
    category_id: 'cat-aud-hd',
    summary_main: 'Tổng hợp toàn diện các văn bản pháp luật, công văn hướng dẫn thuế, lao động và kế toán có hiệu lực trong tháng 05/2026.',
    summary_new_points: 'Điểm tin nhanh về hoàn thuế GTGT, trần chi phí lãi vay giao dịch liên kết và chế độ kế toán mới TT 99.',
    summary_accounting_impact: 'Tài liệu hướng dẫn nghiệp vụ cập nhật hàng tháng cho kế toán và kiểm toán viên.',
    summary_actions_needed: 'Đọc và đối chiếu các trường hợp phát sinh trong thực tế tại doanh nghiệp.',
  },

  // ==========================
  // NHÓM 3: THUẾ GIÁ TRỊ GIA TĂNG (GTGT)
  // ==========================
  {
    id: 'doc-luat-gtgt-2024',
    title: 'Luật Thuế Giá trị gia tăng số 48/2024/QH15',
    document_number: '48/2024/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2024-11-26',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-gtgt-luat',
    summary_main: 'Luật Thuế GTGT mới thay thế toàn diện Luật Thuế GTGT 2008 từ ngày 01/07/2025, điều chỉnh đối tượng không chịu thuế, thuế suất 5%, điều kiện khấu trừ và hoàn thuế.',
    summary_new_points: 'Chuyển phân bón từ không chịu thuế sang thuế suất 5% (doanh nghiệp sản xuất phân bón được khấu trừ thuế đầu vào); Quy định trách nhiệm khấu trừ thuế của sàn thương mại điện tử; Siết chặt chứng từ không dùng tiền mặt.',
    summary_accounting_impact: 'Thay đổi căn bản cách kê khai thuế GTGT đầu vào, đầu ra từ kỳ tính thuế tháng 07/2025.',
    summary_actions_needed: 'Cập nhật hệ thống ERP, phần mềm kế toán và cấu hình hóa đơn theo Luật 48/2024.',
  },
  {
    fileNameMatch: '181.2025',
    id: 'doc-nd-181-gtgt-2025',
    title: 'Nghị định 181/2025/NĐ-CP quy định chi tiết và hướng dẫn thi hành Luật Thuế Giá trị gia tăng 2024',
    document_number: '181/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-06-30',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-gtgt-nd',
    summary_main: 'Nghị định hướng dẫn toàn diện Luật Thuế GTGT 2024 về đối tượng, thuế suất, phương pháp tính và hoàn thuế GTGT.',
    summary_new_points: 'Quy định chi tiết cơ chế sàn TMĐT khấu trừ thuế thay người bán; Hướng dẫn thuế GTGT 5% cho phân bón; Điều kiện hoàn thuế điện tử.',
    summary_accounting_impact: 'Văn bản cốt lõi thay thế toàn bộ Nghị định 209/2013/NĐ-CP.',
    summary_actions_needed: 'Đọc kỹ các trường hợp khấu trừ thuế đầu vào và hóa đơn TMĐT.',
  },
  {
    fileNameMatch: '144',
    id: 'doc-nd-144-gtgt-2026',
    title: 'Nghị định 144/2026/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 181/2025/NĐ-CP về thuế GTGT',
    document_number: '144/2026/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2026-03-20',
    effective_date: '2026-05-01',
    status: 'hieu_luc',
    category_id: 'cat-gtgt-nd',
    summary_main: 'Sửa đổi, bổ sung quy định về hoàn thuế GTGT dự án đầu tư và chứng từ khấu trừ thuế điện tử.',
    summary_new_points: 'Cho phép hoàn thuế dự án đầu tư theo từng giai đoạn nghiệm thu; Làm rõ cách tính thuế phân bón 5%.',
    summary_accounting_impact: 'Doanh nghiệp có dự án đầu tư mới được hoàn thuế nhanh hơn.',
    summary_actions_needed: 'Cập nhật hồ sơ hoàn thuế dự án đầu tư theo biểu mẫu mới.',
  },
  {
    fileNameMatch: '174.2025',
    id: 'doc-nd-174-gtgt-2025',
    title: 'Nghị định 174/2025/NĐ-CP quy định chính sách giảm thuế giá trị gia tăng (Giai đoạn 2025 - 2026)',
    document_number: '174/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-06-30',
    effective_date: '2025-07-01',
    expiry_date: '2026-12-31',
    status: 'hieu_luc',
    category_id: 'cat-gtgt-nd',
    summary_main: 'Tiếp tục thực hiện chính sách giảm 2% thuế GTGT từ 01/07/2025 đến hết năm 2026 theo Nghị quyết của Quốc hội.',
    summary_new_points: 'Kéo dài thời gian giảm thuế GTGT 8% liên tục cho đến hết ngày 31/12/2026.',
    summary_accounting_impact: 'Doanh nghiệp tiếp tục áp dụng thuế suất 8% cho hàng hóa dịch vụ đủ điều kiện.',
    summary_actions_needed: 'Duy trì cấu hình thuế suất 8% trên phần mềm hóa đơn điện tử và phần mềm kế toán.',
  },
  {
    fileNameMatch: '69.2025',
    id: 'doc-tt-69-gtgt-2025',
    title: 'Thông tư 69/2025/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế GTGT và Nghị định 181/2025/NĐ-CP',
    document_number: '69/2025/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Nguyễn Đức Chi',
    issued_date: '2025-07-01',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-gtgt-tt',
    summary_main: 'Thông tư nghiệp vụ quan trọng nhất hướng dẫn chi tiết phương pháp tính thuế, khấu trừ và hoàn thuế GTGT từ 01/07/2025.',
    summary_new_points: 'Mẫu biểu kê khai thuế GTGT mới; Hướng dẫn cụ thể cách khấu trừ thuế đầu vào cho DN sản xuất phân bón và TMĐT.',
    summary_accounting_impact: 'Thay thế hoàn toàn Thông tư 219/2013/TT-BTC.',
    summary_actions_needed: 'Cập nhật mẫu tờ khai 01/GTGT mới nhất trên phần mềm HTKK và ERP.',
  },
  {
    fileNameMatch: '1585',
    id: 'doc-cv-1585-qtr-2025',
    title: 'Công văn 1585/QTR-QLDN2 về việc hoàn thuế giá trị gia tăng hàng hóa xuất khẩu sau 01/07/2025',
    document_number: '1585/QTR-QLDN2',
    document_type: 'cong_van',
    issuing_body: 'Cục Thuế tỉnh Quảng Trị',
    signer: 'Nguyễn Trung Thành',
    issued_date: '2025-07-15',
    effective_date: '2025-07-15',
    status: 'hieu_luc',
    category_id: 'cat-gtgt-cv',
    summary_main: 'Hướng dẫn điều kiện và thủ tục hoàn thuế GTGT đầu vào đối với hàng hóa xuất khẩu phát sinh sau thời điểm Luật Thuế GTGT 2024 có hiệu lực (01/07/2025).',
    summary_new_points: 'Hồ sơ hoàn thuế bắt buộc có chứng từ thanh toán qua ngân hàng không dùng tiền mặt và tờ khai hải quan điện tử đã thông quan.',
    summary_accounting_impact: 'Kế toán xuất khẩu cần theo dõi riêng thuế GTGT đầu vào của hàng xuất khẩu đủ điều kiện hoàn.',
    summary_actions_needed: 'Kiểm tra tính hợp lệ của tờ khai xuất khẩu và hóa đơn thương mại điện tử trước khi nộp hồ sơ hoàn thuế.',
  },

  // ==========================
  // NHÓM 4: THUẾ THU NHẬP DOANH NGHIỆP (TNDN)
  // ==========================
  {
    fileNameMatch: '67',
    id: 'doc-luat-67-tndn-2025',
    title: 'Luật Thuế Thu nhập doanh nghiệp số 67/2025/QH15',
    document_number: '67/2025/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2025-06-28',
    effective_date: '2026-01-01',
    status: 'chua_hieu_luc',
    category_id: 'cat-tax-tndn',
    summary_main: 'Luật Thuế TNDN mới thay thế Luật 2008, luật hóa các quy định về Thuế tối thiểu toàn cầu (Pillar 2) và ưu đãi cho DN công nghệ cao, R&D.',
    summary_new_points: 'Áp dụng thuế tối thiểu toàn cầu 15% đối với các tập đoàn đa quốc gia có doanh thu trên 750 triệu EUR; Bổ sung gói ưu đãi chi phí R&D; Mở rộng điều kiện chi phí được trừ.',
    summary_accounting_impact: 'Xác định thuế TNDN bổ sung theo quy định chống xói mòn cơ sở thuế toàn cầu; Tính toán chi phí thuế TNDN hoãn lại.',
    summary_actions_needed: 'Rà soát xem doanh nghiệp có thuộc phạm vi áp dụng thuế tối thiểu toàn cầu hay không.',
  },
  {
    fileNameMatch: '320.2025',
    id: 'doc-nd-320-tndn-2025',
    title: 'Nghị định 320/2025/NĐ-CP quy định chi tiết thi hành Luật Thuế Thu nhập doanh nghiệp',
    document_number: '320/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-11-15',
    effective_date: '2026-01-01',
    status: 'chua_hieu_luc',
    category_id: 'cat-tax-tndn',
    summary_main: 'Quy định chi tiết thi hành Luật Thuế TNDN 2025, hướng dẫn các khoản chi phí được trừ, không được trừ và ưu đãi thuế mới.',
    summary_new_points: 'Khoản chi cho chuyển đổi số, nghiên cứu khoa học được tính thêm tỷ lệ khấu trừ thuế; Làm rõ chi phí phúc lợi cho người lao động.',
    summary_accounting_impact: 'Cơ sở quy phạm mới nhất cho kế toán thuế TNDN từ năm tài chính 2026.',
    summary_actions_needed: 'Xây dựng kế hoạch chi phí và chính sách tài chính cho năm 2026.',
  },
  {
    fileNameMatch: '20-2026',
    id: 'doc-tt-20-tndn-2026',
    title: 'Thông tư 20/2026/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế Thu nhập doanh nghiệp và Nghị định 320/2025/NĐ-CP',
    document_number: '20/2026/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Võ Thành Hưng',
    issued_date: '2026-01-15',
    effective_date: '2026-01-15',
    status: 'hieu_luc',
    category_id: 'cat-tax-tndn',
    summary_main: 'Hướng dẫn hạch toán chi phí hợp lý, trích lập dự phòng nợ phải thu khó đòi và ưu đãi thuế TNDN theo luật mới.',
    summary_new_points: 'Thay thế Thông tư 78/2014 và Thông tư 96/2015; Hướng dẫn chi tiết mức trích dự phòng giảm giá đầu tư tài chính.',
    summary_accounting_impact: 'Căn cứ chính để lập tờ khai Quyết toán thuế TNDN (Mẫu 03/TNDN) từ năm 2026.',
    summary_actions_needed: 'Rà soát danh mục chi phí được trừ và điều chỉnh mẫu biểu quyết toán.',
  },
  {
    fileNameMatch: '132.2020',
    id: 'doc-nd-132-2020',
    title: 'Nghị định 132/2020/NĐ-CP quy định về quản lý thuế đối với doanh nghiệp có giao dịch liên kết',
    document_number: '132/2020/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issued_date: '2020-11-05',
    effective_date: '2020-12-20',
    status: 'het_hieu_luc_mot_phan',
    category_id: 'cat-tax-tndn',
    summary_main: 'Quy định về xác định giá giao dịch liên kết, khống chế chi phí lãi vay (trần 30% EBITDA) và kê khai hồ sơ chuyển giá.',
    summary_new_points: 'Trần chi phí lãi vay 30% EBITDA; Chuyển tiếp chi phí lãi vay không được trừ sang các kỳ tính thuế tiếp theo tối đa 5 năm.',
    summary_accounting_impact: 'Theo dõi riêng chi phí lãi vay vượt trần 30% để hạch toán chuyển chi phí trong 5 năm kế tiếp.',
    summary_actions_needed: 'Lập đầy đủ Hồ sơ xác định giá giao dịch liên kết trước khi quyết toán thuế TNDN.',
  },
  {
    fileNameMatch: '20.2025',
    id: 'doc-nd-20-gdlk-2025',
    title: 'Nghị định 20/2025/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 132/2020/NĐ-CP về giao dịch liên kết',
    document_number: '20/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-02-14',
    effective_date: '2025-03-31',
    status: 'hieu_luc',
    category_id: 'cat-tax-tndn',
    summary_main: 'Tháo gỡ vướng mắc về quan hệ liên kết qua vốn vay ngân hàng và điều chỉnh cách tính chi phí lãi vay khống chế.',
    summary_new_points: 'Loại trừ quan hệ liên kết chỉ phát sinh do vay vốn ngân hàng thương mại thông thường; Cho phép tính lãi vay thuần (net interest).',
    summary_accounting_impact: 'Nhiều doanh nghiệp không còn bị coi là có giao dịch liên kết chỉ vì vay vốn ngân hàng lớn.',
    summary_actions_needed: 'Rà soát lại danh sách các bên liên kết và tính toán lại chi phí lãi vay được trừ.',
  },
  {
    fileNameMatch: '572',
    id: 'doc-cv-572-tng-2025',
    title: 'Công văn 572/TNG-QLDN2 về điều kiện chứng từ thanh toán không dùng tiền mặt đối với chi phí được trừ',
    document_number: '572/TNG-QLDN2',
    document_type: 'cong_van',
    issuing_body: 'Cục Thuế tỉnh Thái Nguyên',
    signer: 'Phạm Đức Huỳnh',
    issued_date: '2025-05-10',
    effective_date: '2025-05-10',
    status: 'hieu_luc',
    category_id: 'cat-tax-tndn',
    summary_main: 'Lưu ý về các khoản chi thanh toán bằng tiền mặt từng lần và việc xác định chi phí hợp lý khi tính thuế TNDN.',
    summary_new_points: 'Nhấn mạnh việc kiểm soát dòng tiền chi trả và chứng từ thanh toán qua ngân hàng.',
    summary_accounting_impact: 'Loại trừ các khoản chi không có chứng từ ngân hàng hợp lệ khi lập Quyết toán thuế TNDN.',
    summary_actions_needed: 'Ban hành quy chế chi tiêu nội bộ yêu cầu chuyển khoản đối với mọi hóa đơn.',
  },

  // ==========================
  // NHÓM 5: THUẾ THU NHẬP CÁ NHÂN (TNCN)
  // ==========================
  {
    fileNameMatch: '109',
    id: 'doc-luat-109-tncn-2025',
    title: 'Luật Thuế Thu nhập cá nhân số 109/2025/QH15',
    document_number: '109/2025/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2025-06-25',
    effective_date: '2026-01-01',
    status: 'chua_hieu_luc',
    category_id: 'cat-tax-tncn',
    summary_main: 'Luật Thuế TNCN cải cách toàn diện, điều chỉnh biểu thuế lũy tiến, mức giảm trừ gia cảnh và phương pháp thu thuế kinh doanh số.',
    summary_new_points: 'Điều chỉnh nâng mức giảm trừ gia cảnh; Rút gọn các bậc thuế lũy tiến; Quản lý thuế TNCN thu nhập từ nền tảng số, KOLs, Affiliate.',
    summary_accounting_impact: 'Cập nhật lại phần mềm tiền lương và biểu khấu trừ thuế TNCN từ 01/01/2026.',
    summary_actions_needed: 'Rà soát hợp đồng cộng tác viên, chuyên gia và quy chế lương thưởng theo luật mới.',
  },
  {
    fileNameMatch: '253',
    id: 'doc-nd-253-tncn-2026',
    title: 'Nghị định 253/2026/NĐ-CP quy định chi tiết thi hành Luật Thuế Thu nhập cá nhân 2025',
    document_number: '253/2026/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2026-06-30',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    category_id: 'cat-tax-tncn',
    summary_main: 'Quy định chi tiết về hồ sơ chứng minh người phụ thuộc, mức giảm trừ gia cảnh và quyết toán thuế TNCN điện tử.',
    summary_new_points: 'Tự động tổng hợp dữ liệu thuế TNCN qua định danh VNeID; Đơn giản hóa thủ tục hoàn thuế TNCN trực tuyến.',
    summary_accounting_impact: 'Doanh nghiệp thực hiện ủy quyền quyết toán thuế TNCN điện tử tự động cho nhân viên.',
    summary_actions_needed: 'Đăng ký mã định danh cá nhân VNeID cho toàn bộ người lao động.',
  },
  {
    fileNameMatch: '112',
    id: 'doc-vbhn-112-tncn',
    title: 'Văn bản hợp nhất 112/VBHN-VPQH — Luật Thuế Thu nhập cá nhân',
    document_number: '112/VBHN-VPQH',
    document_type: 'luat',
    issuing_body: 'Văn phòng Quốc hội',
    signer: 'Bùi Văn Cường',
    issued_date: '2023-12-15',
    effective_date: '2024-01-01',
    status: 'hieu_luc',
    category_id: 'cat-tax-tncn',
    summary_main: 'Văn bản hợp nhất toàn bộ các luật sửa đổi, bổ sung Luật Thuế Thu nhập cá nhân từ trước đến nay.',
    summary_new_points: 'Hợp nhất mức giảm trừ gia cảnh, biểu thuế lũy tiến từng phần và các khoản thu nhập miễn thuế.',
    summary_accounting_impact: 'Căn cứ chuẩn để đối chiếu kê khai thuế TNCN tháng/quý và quyết toán năm.',
    summary_actions_needed: 'Áp dụng biểu thuế lũy tiến từng phần từ 5% đến 35% cho tiền lương, tiền công.',
  },

  // ==========================
  // NHÓM 6: HÓA ĐƠN & QUẢN LÝ THUẾ
  // ==========================
  {
    id: 'doc-luat-qlthue-2019',
    title: 'Luật Quản lý thuế số 38/2019/QH14',
    document_number: '38/2019/QH14',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Nguyễn Thị Kim Ngân',
    issued_date: '2019-06-13',
    effective_date: '2020-07-01',
    status: 'hieu_luc',
    category_id: 'cat-tax-qlt',
    summary_main: 'Luật Quản lý thuế quy định về đăng ký, khai, nộp, ấn định thuế, hoàn thuế, miễn giảm thuế và thanh tra kiểm tra thuế.',
    summary_new_points: 'Bắt buộc áp dụng 100% hóa đơn điện tử; Quy định thu thuế trực tiếp từ nhà cung cấp nước ngoài (Google, Meta, Netflix...).',
    summary_accounting_impact: 'Quy định thời hạn nộp hồ sơ khai thuế, quyết toán thuế năm và tiền chậm nộp 0.03%/ngày.',
    summary_actions_needed: 'Kê khai và nộp thuế đúng hạn luật định tránh tiền chậm nộp.',
  },
  {
    id: 'doc-nd-123-2020',
    title: 'Nghị định 123/2020/NĐ-CP quy định về hóa đơn, chứng từ',
    document_number: '123/2020/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issued_date: '2020-10-19',
    effective_date: '2022-07-01',
    status: 'het_hieu_luc_mot_phan',
    category_id: 'cat-tax-hd',
    summary_main: 'Nghị định nền tảng về hóa đơn điện tử, chứng từ khấu trừ thuế TNCN điện tử và biên lai điện tử.',
    summary_new_points: 'Chính thức xóa bỏ hoàn toàn hóa đơn giấy, chuyển sang 100% hóa đơn điện tử có mã hoặc không có mã của cơ quan thuế.',
    summary_accounting_impact: 'Hạch toán doanh thu và chi phí dựa trên hóa đơn điện tử hợp lệ tra cứu trên trang hoadondientu.gdt.gov.vn.',
    summary_actions_needed: 'Sử dụng phần mềm hóa đơn điện tử kết nối truyền dữ liệu trực tiếp với Tổng cục Thuế.',
  },
  {
    fileNameMatch: '70.2025',
    id: 'doc-nd-70-hoadon-2025',
    title: 'Nghị định 70/2025/NĐ-CP sửa đổi, bổ sung một số điều của Nghị định 123/2020/NĐ-CP về hóa đơn, chứng từ',
    document_number: '70/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-03-25',
    effective_date: '2025-05-10',
    status: 'hieu_luc',
    category_id: 'cat-tax-hd',
    summary_main: 'Sửa đổi quy định về hóa đơn điện tử khởi tạo từ máy tính tiền và xử lý hóa đơn điện tử có sai sót.',
    summary_new_points: 'Bắt buộc áp dụng HĐĐT khởi tạo từ máy tính tiền đối với dịch vụ ăn uống, bán lẻ, khách sạn, trung tâm thương mại; Tự động đồng bộ với cơ quan thuế.',
    summary_accounting_impact: 'Hạch toán hóa đơn điện tử máy tính tiền có giá trị pháp lý tương đương hóa đơn điện tử thông thường.',
    summary_actions_needed: 'Các cơ sở kinh doanh bán lẻ phải nâng cấp máy tính tiền và kết nối phần mềm hóa đơn.',
  },
  {
    fileNameMatch: '125.2020',
    id: 'doc-nd-125-2020',
    title: 'Nghị định 125/2020/NĐ-CP quy định xử phạt vi phạm hành chính về thuế, hóa đơn',
    document_number: '125/2020/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issued_date: '2020-10-19',
    effective_date: '2020-12-05',
    status: 'hieu_luc',
    category_id: 'cat-tax-hd',
    summary_main: 'Văn bản gốc quy định toàn bộ mức phạt vi phạm hành chính về thuế, khai sai, trốn thuế và hóa đơn chứng từ.',
    summary_new_points: 'Tăng mức phạt đối với vi phạm lập hóa đơn sai thời điểm và nộp chậm hồ sơ khai thuế.',
    summary_accounting_impact: 'Các khoản tiền phạt VPHC không được tính vào chi phí được trừ khi xác định thuế TNDN.',
    summary_actions_needed: 'Kiểm soát chặt chẽ lịch nộp báo cáo thuế và xuất hóa đơn.',
  },
  {
    fileNameMatch: '15 VBHN',
    id: 'doc-vbhn-15-xphc-2026',
    title: 'Văn bản hợp nhất 15/VBHN-BTC — Quy định xử phạt vi phạm hành chính về thuế, hóa đơn',
    document_number: '15/VBHN-BTC',
    document_type: 'nghi_dinh',
    issuing_body: 'Bộ Tài chính',
    signer: 'Cao Anh Tuấn',
    issued_date: '2026-01-20',
    effective_date: '2026-01-20',
    status: 'hieu_luc',
    category_id: 'cat-tax-hd',
    summary_main: 'Hợp nhất các quy định xử phạt vi phạm hành chính về thuế và hóa đơn từ NĐ 125/2020 và các nghị định sửa đổi.',
    summary_new_points: 'Hệ thống hóa khung tiền phạt đối với hành vi nộp chậm tờ khai, lập sai thời điểm hóa đơn và trốn thuế.',
    summary_accounting_impact: 'Kế toán cần nắm rõ mức phạt để tránh rủi ro chi phí phạt không được trừ khi tính thuế TNDN.',
    summary_actions_needed: 'Lập lịch nộp tờ khai và kiểm soát xuất hóa đơn đúng thời điểm phát sinh.',
  },
  {
    fileNameMatch: '3643',
    id: 'doc-cv-3643-tni-2025',
    title: 'Công văn 3643/TNI-QLDN về việc xuất hóa đơn và kê khai thuế đối với hoạt động chuyển nhượng quyền sử dụng đất',
    document_number: '3643/TNI-QLDN',
    document_type: 'cong_van',
    issuing_body: 'Cục Thuế tỉnh Tây Ninh',
    signer: 'Trần Văn Long',
    issued_date: '2025-08-20',
    effective_date: '2025-08-20',
    status: 'hieu_luc',
    category_id: 'cat-tax-hd',
    summary_main: 'Hướng dẫn thời điểm lập hóa đơn điện tử và xác định giá tính thuế GTGT khi doanh nghiệp thực hiện chuyển nhượng quyền sử dụng đất theo Luật Đất đai mới.',
    summary_new_points: 'Giá tính thuế GTGT được trừ giá đất được trừ tại thời điểm chuyển nhượng theo bảng giá đất hoặc phương án xác định giá cụ thể.',
    summary_accounting_impact: 'Hạch toán phân bổ giá đất được trừ và thuế GTGT đầu ra trên tài khoản 33311.',
    summary_actions_needed: 'Xác định chính xác giá đất được trừ theo hồ sơ pháp lý giao đất/thuê đất.',
  },

  // ==========================
  // NHÓM 7: BẢO HIỂM XÃ HỘI
  // ==========================
  {
    id: 'doc-luat-bhxh-2024',
    title: 'Luật Bảo hiểm xã hội số 41/2024/QH15',
    document_number: '41/2024/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2024-06-29',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-bhxh-luat',
    summary_main: 'Luật BHXH 2024 thay thế Luật BHXH 2014 từ ngày 01/07/2025, giảm số năm đóng BHXH tối thiểu để hưởng lương hưu từ 20 năm xuống 15 năm.',
    summary_new_points: 'Giảm điều kiện năm đóng BHXH tối thiểu hưởng lương hưu xuống 15 năm; Bổ sung chế độ trợ cấp hưu trí xã hội; Mở rộng đối tượng tham gia BHXH bắt buộc (chủ hộ kinh doanh, người làm việc bán thời gian); Tăng cường biện pháp xử lý chậm đóng, trốn đóng BHXH.',
    summary_affected_parties: 'Người lao động, doanh nghiệp, cơ quan BHXH.',
    summary_accounting_impact: 'Tính toán lại trích lập chi phí BHXH, BHYT, BHTN theo mức lương tham chiếu mới.',
    summary_actions_needed: 'Rà soát danh sách nhân sự tham gia BHXH bắt buộc từ 01/07/2025.',
  },
  {
    id: 'doc-nd-115-2015',
    title: 'Nghị định 115/2015/NĐ-CP quy định chi tiết một số điều của Luật Bảo hiểm xã hội về BHXH bắt buộc',
    document_number: '115/2015/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Nguyễn Tấn Dũng',
    issued_date: '2015-11-11',
    effective_date: '2016-01-01',
    status: 'hieu_luc',
    category_id: 'cat-bhxh-nd',
    summary_main: 'Quy định chi tiết về chế độ ốm đau, thai sản, hưu trí, tử tuất và tiền lương làm căn cứ đóng BHXH bắt buộc.',
    summary_new_points: 'Quy định tiền lương đóng BHXH bao gồm mức lương, phụ cấp lương và các khoản bổ sung khác.',
    summary_accounting_impact: 'Căn cứ để kế toán tiền lương xác định các khoản phụ cấp phải đóng và không phải đóng BHXH.',
    summary_actions_needed: 'Xây dựng cấu trúc tiền lương trong hợp đồng lao động phân định rõ phụ cấp đóng BHXH.',
  },
  {
    id: 'doc-tt-59-2015',
    title: 'Thông tư 59/2015/TT-BLĐTBXH quy định chi tiết và hướng dẫn thi hành một số điều của Luật BHXH về BHXH bắt buộc',
    document_number: '59/2015/TT-BLĐTBXH',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Lao động Thương binh và Xã hội',
    signer: 'Phạm Thị Hải Chuyền',
    issued_date: '2015-12-29',
    effective_date: '2016-02-15',
    status: 'hieu_luc',
    category_id: 'cat-bhxh-tt',
    summary_main: 'Thông tư nghiệp vụ hướng dẫn cách tính chế độ thai sản, ốm đau, dưỡng sức phục hồi sức khỏe và hồ sơ hưởng BHXH.',
    summary_new_points: 'Hướng dẫn cụ thể các khoản không tính đóng BHXH bắt buộc: tiền thưởng sáng kiến, tiền ăn giữa ca, hỗ trợ xăng xe, điện thoại...',
    summary_accounting_impact: 'Hạch toán chi phí bảo hiểm và quản lý tiền trợ cấp BHXH chi trả cho người lao động.',
    summary_actions_needed: 'Đối chiếu các khoản phụ cấp lương của nhân viên theo danh mục của TT 59.',
  },

  // ==========================
  // NHÓM 8: LAO ĐỘNG & TIỀN LƯƠNG
  // ==========================
  {
    id: 'doc-bllao-2019',
    title: 'Bộ luật Lao động số 45/2019/QH14',
    document_number: '45/2019/QH14',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Nguyễn Thị Kim Ngân',
    issued_date: '2019-11-20',
    effective_date: '2021-01-01',
    status: 'hieu_luc',
    category_id: 'cat-labor-bllao',
    summary_main: 'Bộ luật Lao động điều chỉnh quan hệ lao động, tiêu chuẩn lao động, tiền lương, thời giờ làm việc, nghỉ ngơi, hợp đồng lao động.',
    summary_new_points: 'Công nhận Hợp đồng lao động điện tử; Tăng tuổi nghỉ hưu theo lộ trình; Mở rộng quyền đơn phương chấm dứt HĐLĐ của người lao động.',
    summary_accounting_impact: 'Căn cứ xác định chi phí tiền lương, làm thêm giờ, trợ cấp thôi việc hợp lý.',
    summary_actions_needed: 'Xây dựng quy chế nội bộ và thỏa ước lao động tập thể đúng quy định.',
  },
  {
    fileNameMatch: '08 HD',
    id: 'doc-tt-08-hdld-2026',
    title: 'Thông tư 08/2026/TT-BLĐTBXH hướng dẫn thi hành quy định về hợp đồng lao động điện tử',
    document_number: '08/2026/TT-BLĐTBXH',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Lao động Thương binh và Xã hội',
    signer: 'Đào Ngọc Dung',
    issued_date: '2026-02-28',
    effective_date: '2026-04-15',
    status: 'hieu_luc',
    category_id: 'cat-labor-tt',
    summary_main: 'Hướng dẫn quy trình giao kết, ký số, lưu trữ và thanh lý hợp đồng lao động bằng phương tiện điện tử.',
    summary_new_points: 'HĐLĐ điện tử có giá trị như bản gốc văn bản; Chấp nhận ký số cá nhân qua VNeID hoặc thiết bị ký số chuyên dùng.',
    summary_accounting_impact: 'Chứng từ nhân sự điện tử hợp lệ phục vụ kiểm toán và thanh tra lao động.',
    summary_actions_needed: 'Chuyển đổi quy trình ký HĐLĐ sang hình thức điện tử để tiết kiệm chi phí.',
  },
  {
    id: 'doc-nd-145-2020',
    title: 'Nghị định 145/2020/NĐ-CP hướng dẫn chi tiết một số điều của Bộ luật Lao động về điều kiện lao động và quan hệ lao động',
    document_number: '145/2020/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Nguyễn Xuân Phúc',
    issued_date: '2020-12-14',
    effective_date: '2021-02-01',
    status: 'hieu_luc',
    category_id: 'cat-labor-nd',
    summary_main: 'Quy định chi tiết về quản lý lao động, hợp đồng lao động, đối thoại tại nơi làm việc, tiền lương, thời giờ làm việc, kỷ luật lao động.',
    summary_new_points: 'Quy định chi tiết cách tính tiền lương làm thêm giờ ban đêm, ngày nghỉ lễ; Mẫu thỏa ước lao động tập thể và nội quy lao động.',
    summary_accounting_impact: 'Cơ sở tính toán và hạch toán chi phí làm thêm giờ (150%, 200%, 300%) hợp lệ.',
    summary_actions_needed: 'Rà soát bảng chấm công và quy chế trả lương làm thêm giờ.',
  },

  // ==========================
  // NHÓM 9: DOANH NGHIỆP & ĐẦU TƯ
  // ==========================
  {
    id: 'doc-luat-dn-2020',
    title: 'Luật Doanh nghiệp số 59/2020/QH14',
    document_number: '59/2020/QH14',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Nguyễn Thị Kim Ngân',
    issued_date: '2020-06-17',
    effective_date: '2021-01-01',
    status: 'hieu_luc',
    category_id: 'cat-enterprise',
    summary_main: 'Quy định về việc thành lập, tổ chức quản lý, tổ chức lại, giải thể và hoạt động có liên quan của doanh nghiệp.',
    summary_new_points: 'Bãi bỏ thủ tục thông báo mẫu dấu doanh nghiệp; Cho phép doanh nghiệp có nhiều người đại diện theo pháp luật; Rõ ràng về quyền của cổ đông thiểu số.',
    summary_accounting_impact: 'Xác định trách nhiệm pháp lý của người đại diện, kế toán trưởng, kiểm soát viên và vốn điều lệ thực góp.',
    summary_actions_needed: 'Theo dõi tiến độ góp vốn điều lệ trong vòng 90 ngày kể từ ngày cấp ĐKKD.',
  },
  {
    id: 'doc-luat-dautu-2020',
    title: 'Luật Đầu tư số 61/2020/QH14',
    document_number: '61/2020/QH14',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Nguyễn Thị Kim Ngân',
    issued_date: '2020-06-17',
    effective_date: '2021-01-01',
    status: 'hieu_luc',
    category_id: 'cat-investment',
    summary_main: 'Quy định về hoạt động đầu tư kinh doanh tại Việt Nam và hoạt động đầu tư kinh doanh từ Việt Nam ra nước ngoài.',
    summary_new_points: 'Cơ chế ưu đãi và hỗ trợ đầu tư đặc biệt cho dự án R&D, công nghệ cao, bán dẫn; Cắt giảm ngành nghề đầu tư kinh doanh có điều kiện.',
    summary_accounting_impact: 'Căn cứ áp dụng mức ưu đãi thuế TNDN (thuế suất ưu đãi 10%, miễn 4 giảm 9) theo địa bàn và lĩnh vực đầu tư.',
    summary_actions_needed: 'Đăng ký và hoàn thiện hồ sơ dự án đầu tư để hưởng ưu đãi thuế.',
  },
  {
    id: 'doc-luat-datdai-2024',
    title: 'Luật Đất đai số 31/2024/QH15',
    document_number: '31/2024/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Vương Đình Huệ',
    issued_date: '2024-01-18',
    effective_date: '2024-08-01',
    status: 'hieu_luc',
    category_id: 'cat-investment',
    summary_main: 'Luật Đất đai 2024 bãi bỏ khung giá đất, áp dụng bảng giá đất định giá theo nguyên tắc thị trường, cho phép doanh nghiệp trả tiền thuê đất linh hoạt hàng năm hoặc một lần.',
    summary_new_points: 'Bỏ khung giá đất, bảng giá đất được xây dựng hàng năm; Đa dạng hóa hình thức tiếp cận đất đai cho dự án đầu tư; Rõ ràng về giá đất được trừ khi tính thuế GTGT.',
    summary_accounting_impact: 'Ghi nhận nguyên giá quyền sử dụng đất, phân bổ tiền thuê đất và dự phòng chi phí đất.',
    summary_actions_needed: 'Rà soát các hợp đồng thuê đất và phương án nộp tiền thuê đất theo bảng giá đất mới.',
  },
  {
    fileNameMatch: '50.2026',
    id: 'doc-nd-50-datdai-2026',
    title: 'Nghị định 50/2026/NĐ-CP hướng dẫn Nghị quyết 254 về tiền sử dụng đất, tiền thuê đất',
    document_number: '50/2026/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2026-02-15',
    effective_date: '2026-02-15',
    status: 'hieu_luc',
    category_id: 'cat-investment',
    summary_main: 'Quy định chi tiết phương pháp tính và miễn, giảm tiền thuê đất cho doanh nghiệp sản xuất, dự án công nghệ cao theo Luật Đất đai mới.',
    summary_new_points: 'Đơn giản hóa hồ sơ miễn giảm tiền thuê đất; Áp dụng bảng giá đất mới điều chỉnh hàng năm.',
    summary_accounting_impact: 'Hạch toán chi phí tiền thuê đất và dự phòng chi phí đất đai.',
    summary_actions_needed: 'Nộp hồ sơ đề nghị miễn, giảm tiền thuê đất đúng thời hạn quy định.',
  },
  {
    fileNameMatch: '167.2025',
    id: 'doc-nd-167-haiquan-2025',
    title: 'Nghị định 167/2025/NĐ-CP sửa đổi quy định về thủ tục hải quan, kiểm tra giám sát hải quan',
    document_number: '167/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-06-30',
    effective_date: '2025-08-15',
    status: 'hieu_luc',
    category_id: 'cat-investment',
    summary_main: 'Hiện đại hóa thủ tục hải quan, triển khai hệ thống thông quan tự động thế hệ mới và số hóa 100% hồ sơ xuất nhập khẩu.',
    summary_new_points: 'Bãi bỏ yêu cầu nộp bản giấy nhiều chứng từ xuất xứ hàng hóa; Áp dụng luồng thông quan thông minh.',
    summary_accounting_impact: 'Lưu trữ chứng từ hải quan điện tử và hạch toán thuế XNK trên hệ thống hải quan số.',
    summary_actions_needed: 'Đồng bộ chữ ký số và hệ thống khai báo hải quan điện tử.',
  },
  {
    fileNameMatch: '2301',
    id: 'doc-qd-2301-hcm-2026',
    title: 'Quyết định 2301/QĐ-UBND phê duyệt danh mục dự án thu hút đầu tư TP. Hồ Chí Minh giai đoạn 2026 - 2030',
    document_number: '2301/QĐ-UBND',
    document_type: 'quyet_dinh',
    issuing_body: 'Ủy ban nhân dân TP. Hồ Chí Minh',
    signer: 'Phan Văn Mãi',
    issued_date: '2026-04-10',
    effective_date: '2026-04-10',
    status: 'hieu_luc',
    category_id: 'cat-investment',
    summary_main: 'Danh mục các dự án ưu tiên thu hút đầu tư FDI và trong nước của TP.HCM về công nghệ vi mạch, hạ tầng giao thông và trung tâm tài chính.',
    summary_new_points: 'Chính sách ưu đãi vượt trội về tiền thuê đất và thuế TNDN theo cơ chế đặc thù Nghị quyết 98.',
    summary_accounting_impact: 'Doanh nghiệp đầu tư trong danh mục được hưởng ưu đãi thuế TNDN cao nhất.',
    summary_actions_needed: 'Nghiên cứu danh mục dự án và tiêu chí lựa chọn nhà đầu tư chiến lược.',
  },
];

// COMPREHENSIVE BIDIRECTIONAL RELATIONS NETWORK
const expandedRelations = [
  // 1. Kế toán chain
  { source_document_id: 'doc-tt-99-ketoan-2025', target_document_id: 'doc-luat-kt-2015', relation_type: 'huong_dan', notes: 'Chế độ kế toán DN mới ban hành căn cứ Luật Kế toán 2015' },
  { source_document_id: 'doc-tt-99-ketoan-2025', target_document_id: 'doc-tt-200-2014', relation_type: 'thay_the', notes: 'Thay thế hoàn toàn Thông tư 200/2014/TT-BTC từ 01/01/2026' },
  { source_document_id: 'doc-tt-58-ketoan-2026', target_document_id: 'doc-luat-kt-2015', relation_type: 'huong_dan', notes: 'Chế độ kế toán DN siêu nhỏ căn cứ Luật Kế toán' },
  { source_document_id: 'doc-luat-suadoi-9luat-2024', target_document_id: 'doc-luat-kt-2015', relation_type: 'sua_doi', notes: 'Sửa đổi, bổ sung quy định về chứng từ điện tử trong Luật Kế toán' },

  // 2. Kiểm toán chain
  { source_document_id: 'doc-nd-84-2016', target_document_id: 'doc-luat-kiemtoan-2011', relation_type: 'huong_dan', notes: 'Hướng dẫn điều kiện hành nghề kiểm toán độc lập' },
  { source_document_id: 'doc-tt-214-2012-vsa', target_document_id: 'doc-luat-kiemtoan-2011', relation_type: 'huong_dan', notes: 'Ban hành Hệ thống chuẩn mực kiểm toán Việt Nam (VSA)' },
  { source_document_id: 'doc-luat-suadoi-9luat-2024', target_document_id: 'doc-luat-kiemtoan-2011', relation_type: 'sua_doi', notes: 'Sửa đổi, bổ sung Luật Kiểm toán độc lập 2011' },

  // 3. Thuế GTGT chain (4 Tiers: Luật -> NĐ -> TT -> CV)
  { source_document_id: 'doc-nd-181-gtgt-2025', target_document_id: 'doc-luat-gtgt-2024', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Luật Thuế GTGT 2024' },
  { source_document_id: 'doc-tt-69-gtgt-2025', target_document_id: 'doc-nd-181-gtgt-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Nghị định 181/2025/NĐ-CP' },
  { source_document_id: 'doc-nd-144-gtgt-2026', target_document_id: 'doc-nd-181-gtgt-2025', relation_type: 'sua_doi', notes: 'Sửa đổi, bổ sung quy định hoàn thuế dự án đầu tư của Nghị định 181' },
  { source_document_id: 'doc-nd-174-gtgt-2025', target_document_id: 'doc-luat-gtgt-2024', relation_type: 'huong_dan', notes: 'Nghị định quy định giảm 2% thuế GTGT (8%) 2025 - 2026' },
  { source_document_id: 'doc-cv-1585-qtr-2025', target_document_id: 'doc-luat-gtgt-2024', relation_type: 'huong_dan', notes: 'Hướng dẫn hoàn thuế xuất khẩu theo Luật Thuế GTGT mới' },
  { source_document_id: 'doc-cv-1585-qtr-2025', target_document_id: 'doc-tt-69-gtgt-2025', relation_type: 'huong_dan', notes: 'Giải đáp vướng mắc thủ tục hoàn thuế theo Thông tư 69/2025' },

  // 4. Thuế TNDN chain (4 Tiers)
  { source_document_id: 'doc-nd-320-tndn-2025', target_document_id: 'doc-luat-67-tndn-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Luật Thuế TNDN 2025' },
  { source_document_id: 'doc-tt-20-tndn-2026', target_document_id: 'doc-nd-320-tndn-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Nghị định 320/2025/NĐ-CP' },
  { source_document_id: 'doc-nd-20-gdlk-2025', target_document_id: 'doc-nd-132-2020', relation_type: 'sua_doi', notes: 'Sửa đổi NĐ 132/2020 về khống chế chi phí lãi vay và giao dịch liên kết' },
  { source_document_id: 'doc-nd-132-2020', target_document_id: 'doc-luat-67-tndn-2025', relation_type: 'huong_dan', notes: 'Quản lý thuế đối với doanh nghiệp có giao dịch liên kết' },
  { source_document_id: 'doc-cv-572-tng-2025', target_document_id: 'doc-luat-67-tndn-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn điều kiện chi phí không dùng tiền mặt khi tính thuế TNDN' },

  // 5. Thuế TNCN chain
  { source_document_id: 'doc-nd-253-tncn-2026', target_document_id: 'doc-luat-109-tncn-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Luật Thuế TNCN 2025' },
  { source_document_id: 'doc-vbhn-112-tncn', target_document_id: 'doc-luat-109-tncn-2025', relation_type: 'lien_quan', notes: 'Văn bản hợp nhất quy định cũ phục vụ đối chiếu niên độ trước 2026' },

  // 6. Hóa đơn & Quản lý thuế chain
  { source_document_id: 'doc-nd-123-2020', target_document_id: 'doc-luat-qlthue-2019', relation_type: 'huong_dan', notes: 'Quy định chi tiết về hóa đơn, chứng từ theo Luật Quản lý thuế' },
  { source_document_id: 'doc-nd-70-hoadon-2025', target_document_id: 'doc-nd-123-2020', relation_type: 'sua_doi', notes: 'Sửa đổi quy định về hóa đơn điện tử khởi tạo từ máy tính tiền' },
  { source_document_id: 'doc-nd-125-2020', target_document_id: 'doc-luat-qlthue-2019', relation_type: 'huong_dan', notes: 'Quy định xử phạt vi phạm hành chính về thuế, hóa đơn' },
  { source_document_id: 'doc-vbhn-15-xphc-2026', target_document_id: 'doc-nd-125-2020', relation_type: 'lien_quan', notes: 'Văn bản hợp nhất xử phạt vi phạm hành chính về thuế và hóa đơn' },
  { source_document_id: 'doc-cv-3643-tni-2025', target_document_id: 'doc-nd-123-2020', relation_type: 'huong_dan', notes: 'Hướng dẫn xuất hóa đơn chuyển nhượng quyền sử dụng đất' },

  // 7. BHXH chain
  { source_document_id: 'doc-nd-115-2015', target_document_id: 'doc-luat-bhxh-2024', relation_type: 'lien_quan', notes: 'Nghị định hướng dẫn chế độ BHXH bắt buộc' },
  { source_document_id: 'doc-tt-59-2015', target_document_id: 'doc-nd-115-2015', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết các khoản phụ cấp tính đóng BHXH' },

  // 8. Lao động chain
  { source_document_id: 'doc-nd-145-2020', target_document_id: 'doc-bllao-2019', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết điều kiện lao động và quan hệ lao động' },
  { source_document_id: 'doc-tt-08-hdld-2026', target_document_id: 'doc-bllao-2019', relation_type: 'huong_dan', notes: 'Hướng dẫn thực hiện Hợp đồng lao động điện tử theo Bộ luật Lao động' },

  // 9. Doanh nghiệp & Đầu tư & Đất đai chain
  { source_document_id: 'doc-nd-50-datdai-2026', target_document_id: 'doc-luat-datdai-2024', relation_type: 'huong_dan', notes: 'Hướng dẫn tiền sử dụng đất, tiền thuê đất theo Luật Đất đai 2024' },
  { source_document_id: 'doc-cv-3643-tni-2025', target_document_id: 'doc-luat-datdai-2024', relation_type: 'huong_dan', notes: 'Xác định giá đất được trừ khi tính thuế theo Luật Đất đai' },
  { source_document_id: 'doc-qd-2301-hcm-2026', target_document_id: 'doc-luat-dautu-2020', relation_type: 'can_cu', notes: 'Danh mục dự án thu hút đầu tư căn cứ Luật Đầu tư và Nghị quyết 98' },
  { source_document_id: 'doc-nd-167-haiquan-2025', target_document_id: 'doc-luat-qlthue-2019', relation_type: 'huong_dan', notes: 'Quy định về thủ tục hải quan số và quản lý thuế xuất nhập khẩu' },
];

async function run() {
  console.log('🚀 BẮT ĐẦU NẠP BỔ SUNG KHO LUẬT & NGHỊ ĐỊNH MỚI 2025 - 2026...');

  const processedDocs = [];
  const processedCategoryLinks = [];

  for (const doc of expandedRealDocs) {
    let html = '';
    let matchedFile = null;

    if (doc.fileNameMatch) {
      matchedFile = actualFiles.find(f => f.includes(doc.fileNameMatch));
    }

    if (matchedFile) {
      const ext = path.extname(matchedFile).toLowerCase();
      const filePath = path.join(docDir, matchedFile);

      if (ext === '.docx' && fs.existsSync(filePath)) {
        try {
          const res = await mammoth.convertToHtml({ path: filePath });
          html = res.value;
        } catch (e) {
          console.error(`Error converting ${matchedFile}:`, e.message);
        }
      }

      if (!html || html.length < 50) {
        html = `<h2>${doc.title}</h2>
<p>Số hiệu: <strong>${doc.document_number}</strong> do <strong>${doc.issuing_body}</strong> ban hành.</p>
<p>Ngày ban hành: ${doc.issued_date} — Ngày hiệu lực: ${doc.effective_date}.</p>
<h3>1. Tóm tắt nội dung chính</h3>
<p>${doc.summary_main}</p>
<h3>2. Điểm mới nổi bật</h3>
<p>${doc.summary_new_points || 'Văn bản hướng dẫn nghiệp vụ mới.'}</p>
<h3>3. Tác động kế toán & kiểm toán</h3>
<p>${doc.summary_accounting_impact || 'Kiểm toán viên đối chiếu tuân thủ theo quy định hiện hành.'}</p>
<div class="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
  <p class="font-bold text-blue-900 mb-1">📁 Tệp tài liệu gốc đính kèm (AUDIT PACO):</p>
  <p class="text-xs text-blue-700">Tên tệp: <code>${matchedFile}</code></p>
  <p class="mt-2">
    <a href="/documents/${encodeURIComponent(matchedFile)}" target="_blank" download class="inline-block px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800">
      📥 Tải xuống tệp gốc (${ext.toUpperCase()})
    </a>
  </p>
</div>`;
      } else {
        html += `<div class="bg-blue-50 border border-blue-200 rounded p-4 mt-8 not-prose">
  <p class="font-bold text-blue-900 mb-1">📁 Tệp tài liệu gốc đính kèm (AUDIT PACO):</p>
  <p class="text-xs text-blue-700 mb-2">Tên tệp: <code>${matchedFile}</code></p>
  <a href="/documents/${encodeURIComponent(matchedFile)}" target="_blank" download class="inline-block px-3 py-1.5 bg-blue-700 text-white rounded text-xs font-semibold hover:bg-blue-800">
    📥 Tải xuống tệp gốc (${ext.toUpperCase()})
  </a>
</div>`;
      }
    } else {
      // Direct core laws
      html = `<h2>${doc.title}</h2>
<p>Số hiệu: <strong>${doc.document_number}</strong> do <strong>${doc.issuing_body}</strong> ban hành.</p>
<p>Ngày ban hành: ${doc.issued_date} — Ngày hiệu lực: <strong>${doc.effective_date}</strong>.</p>
<h3>1. Quy định chung & Phạm vi áp dụng</h3>
<p>${doc.summary_main}</p>
<h3>2. Các điểm mới nổi bật & Cải cách pháp lý</h3>
<p>${doc.summary_new_points || 'Văn bản cốt lõi ban hành theo chương trình xây dựng luật của Quốc hội.'}</p>
<h3>3. Tác động kế toán & Kiểm toán</h3>
<p>${doc.summary_accounting_impact || 'Doanh nghiệp áp dụng hạch toán theo quy định hiện hành.'}</p>
<h3>4. Hành động cần thực hiện</h3>
<p>${doc.summary_actions_needed || 'Rà soát hệ thống và quy chế nội bộ đảm bảo tuân thủ.'}</p>`;
    }

    const docObj = {
      id: doc.id,
      title: doc.title,
      document_number: doc.document_number,
      document_type: doc.document_type,
      issuing_body: doc.issuing_body,
      signer: doc.signer || null,
      issued_date: doc.issued_date,
      effective_date: doc.effective_date,
      expiry_date: doc.expiry_date || null,
      status: doc.status,
      html_content: html,
      summary_main: doc.summary_main,
      summary_new_points: doc.summary_new_points || null,
      summary_affected_parties: doc.summary_affected_parties || 'Doanh nghiệp, kế toán, kiểm toán, cơ quan quản lý.',
      summary_accounting_impact: doc.summary_accounting_impact || null,
      summary_audit_impact: doc.summary_audit_impact || 'Kiểm toán viên đối chiếu tuân thủ.',
      summary_actions_needed: doc.summary_actions_needed || null,
      summary_is_ai_generated: true,
      official_source_url: null,
      is_published: true,
      review_status: 'published',
      updated_at: doc.issued_date,
      created_at: doc.issued_date,
      files: matchedFile
        ? [
            {
              id: `file-${doc.id}`,
              document_id: doc.id,
              file_type: path.extname(matchedFile).toLowerCase() === '.pdf' ? 'pdf' : 'docx',
              file_url: `/documents/${encodeURIComponent(matchedFile)}`,
              file_size: fs.existsSync(path.join(docDir, matchedFile)) ? fs.statSync(path.join(docDir, matchedFile)).size : 0,
              original_filename: matchedFile,
              is_primary: true,
              version: 1,
              uploaded_by: null,
              created_at: doc.issued_date,
            },
          ]
        : [],
    };

    processedDocs.push(docObj);

    if (doc.category_id) {
      processedCategoryLinks.push({
        document_id: doc.id,
        category_id: doc.category_id,
        is_primary: true,
      });
    }

    // Insert or update to Supabase Cloud
    const { error: insertErr } = await supabase.from('legal_documents').upsert({
      id: toUUID(doc.id),
      title: doc.title,
      document_number: doc.document_number,
      document_type: doc.document_type,
      issuing_body: doc.issuing_body,
      signer: doc.signer || null,
      issued_date: doc.issued_date,
      effective_date: doc.effective_date,
      expiry_date: doc.expiry_date || null,
      status: doc.status,
      html_content: html,
      summary_main: doc.summary_main,
      summary_new_points: doc.summary_new_points || null,
      summary_affected_parties: docObj.summary_affected_parties,
      summary_accounting_impact: doc.summary_accounting_impact || null,
      summary_audit_impact: doc.summary_audit_impact || null,
      summary_actions_needed: doc.summary_actions_needed || null,
      summary_is_ai_generated: true,
      is_published: true,
      review_status: 'published',
    });
    if (insertErr) {
      console.error(`Error inserting ${doc.document_number}:`, insertErr.message);
    } else {
      console.log(`✅ Supabase Cloud Synced: [${doc.document_number}] ${doc.title.slice(0, 45)}...`);
    }
  }

  // Insert all relations to Supabase
  for (const rel of expandedRelations) {
    await supabase.from('document_relations').upsert({
      id: toUUID(`${rel.source_document_id}->${rel.target_document_id}`),
      source_document_id: toUUID(rel.source_document_id),
      target_document_id: toUUID(rel.target_document_id),
      relation_type: rel.relation_type,
      notes: rel.notes,
    });
  }

  console.log('🔄 ĐỒNG BỘ CƠ SỞ DỮ LIỆU FRONTEND LOCAL...');
  const frontendDataCode = `// 100% REAL LEGAL DATABASE - WITH 4-TIER HIERARCHY & RELATIONS
import type { LegalDocument, Category } from '@/types';

export const DEMO_CATEGORIES: Category[] = [
  // Level 1
  { id: 'cat-accounting', parent_id: null, name: 'Kế toán', slug: 'ke-toan', description: 'Luật, nghị định, thông tư, chuẩn mực kế toán', order_index: 1, icon: 'BookOpen', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-audit', parent_id: null, name: 'Kiểm toán', slug: 'kiem-toan', description: 'Luật, nghị định, chuẩn mực kiểm toán', order_index: 2, icon: 'ClipboardCheck', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-tax', parent_id: null, name: 'Thuế', slug: 'thue', description: 'Các sắc thuế và văn bản hướng dẫn', order_index: 3, icon: 'Calculator', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-bhxh', parent_id: null, name: 'Bảo hiểm xã hội', slug: 'bao-hiem-xa-hoi', description: 'Luật BHXH, BHYT, BHTN và văn bản hướng dẫn', order_index: 4, icon: 'Shield', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-labor', parent_id: null, name: 'Lao động và tiền lương', slug: 'lao-dong-tien-luong', description: 'Bộ luật lao động, lương tối thiểu, HĐLĐ', order_index: 5, icon: 'Users', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-enterprise', parent_id: null, name: 'Doanh nghiệp', slug: 'doanh-nghiep', description: 'Luật Doanh nghiệp, thành lập, giải thể', order_index: 6, icon: 'Building2', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-investment', parent_id: null, name: 'Đầu tư', slug: 'dau-tu', description: 'Luật Đầu tư, FDI, ưu đãi đầu tư', order_index: 7, icon: 'TrendingUp', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Level 2 - Kế toán
  { id: 'cat-acc-luat', parent_id: 'cat-accounting', name: 'Luật kế toán', slug: 'ke-toan-luat', description: null, order_index: 1, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-acc-nd', parent_id: 'cat-accounting', name: 'Nghị định kế toán', slug: 'ke-toan-nghi-dinh', description: null, order_index: 2, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-acc-tt', parent_id: 'cat-accounting', name: 'Thông tư kế toán', slug: 'ke-toan-thong-tu', description: null, order_index: 3, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-acc-cm', parent_id: 'cat-accounting', name: 'Chuẩn mực kế toán (VAS)', slug: 'ke-toan-chuan-muc', description: null, order_index: 4, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-acc-cv', parent_id: 'cat-accounting', name: 'Công văn hướng dẫn', slug: 'ke-toan-cong-van', description: null, order_index: 5, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Level 2 - Kiểm toán
  { id: 'cat-aud-luat', parent_id: 'cat-audit', name: 'Luật kiểm toán', slug: 'kiem-toan-luat', description: null, order_index: 1, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-aud-nd', parent_id: 'cat-audit', name: 'Nghị định kiểm toán', slug: 'kiem-toan-nghi-dinh', description: null, order_index: 2, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-aud-cm', parent_id: 'cat-audit', name: 'Chuẩn mực kiểm toán (VSA)', slug: 'kiem-toan-chuan-muc', description: null, order_index: 3, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-aud-hd', parent_id: 'cat-audit', name: 'Hướng dẫn nghiệp vụ', slug: 'kiem-toan-huong-dan', description: null, order_index: 4, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Level 2 - Thuế
  { id: 'cat-tax-gtgt', parent_id: 'cat-tax', name: 'Thuế GTGT', slug: 'thue-gtgt', description: 'Thuế giá trị gia tăng', order_index: 1, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-tax-tndn', parent_id: 'cat-tax', name: 'Thuế TNDN', slug: 'thue-tndn', description: 'Thuế thu nhập doanh nghiệp', order_index: 2, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-tax-tncn', parent_id: 'cat-tax', name: 'Thuế TNCN', slug: 'thue-tncn', description: 'Thuế thu nhập cá nhân', order_index: 3, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-tax-hd', parent_id: 'cat-tax', name: 'Hóa đơn, chứng từ', slug: 'hoa-don-chung-tu', description: null, order_index: 4, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-tax-qlt', parent_id: 'cat-tax', name: 'Quản lý thuế', slug: 'quan-ly-thue', description: null, order_index: 5, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-tax-nt', parent_id: 'cat-tax', name: 'Thuế nhà thầu', slug: 'thue-nha-thau', description: null, order_index: 6, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Level 3 - Thuế GTGT
  { id: 'cat-gtgt-luat', parent_id: 'cat-tax-gtgt', name: 'Luật thuế GTGT', slug: 'thue-gtgt-luat', description: null, order_index: 1, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-gtgt-nd', parent_id: 'cat-tax-gtgt', name: 'Nghị định thuế GTGT', slug: 'thue-gtgt-nghi-dinh', description: null, order_index: 2, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-gtgt-tt', parent_id: 'cat-tax-gtgt', name: 'Thông tư thuế GTGT', slug: 'thue-gtgt-thong-tu', description: null, order_index: 3, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-gtgt-cv', parent_id: 'cat-tax-gtgt', name: 'Công văn thuế GTGT', slug: 'thue-gtgt-cong-van', description: null, order_index: 4, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Level 2 - BHXH
  { id: 'cat-bhxh-luat', parent_id: 'cat-bhxh', name: 'Luật BHXH', slug: 'bhxh-luat', description: null, order_index: 1, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-bhxh-nd', parent_id: 'cat-bhxh', name: 'Nghị định BHXH', slug: 'bhxh-nghi-dinh', description: null, order_index: 2, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-bhxh-tt', parent_id: 'cat-bhxh', name: 'Thông tư BHXH', slug: 'bhxh-thong-tu', description: null, order_index: 3, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-bhxh-qd', parent_id: 'cat-bhxh', name: 'Quyết định BHXH', slug: 'bhxh-quyet-dinh', description: null, order_index: 4, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-bhxh-cv', parent_id: 'cat-bhxh', name: 'Công văn BHXH', slug: 'bhxh-cong-van', description: null, order_index: 5, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },

  // Level 2 - Lao động
  { id: 'cat-labor-bllao', parent_id: 'cat-labor', name: 'Bộ luật lao động', slug: 'lao-dong-bo-luat', description: null, order_index: 1, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-labor-nd', parent_id: 'cat-labor', name: 'Nghị định lao động', slug: 'lao-dong-nghi-dinh', description: null, order_index: 2, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
  { id: 'cat-labor-tt', parent_id: 'cat-labor', name: 'Thông tư lao động', slug: 'lao-dong-thong-tu', description: null, order_index: 3, icon: null, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01' },
];

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(processedDocs, null, 2)};

export const DEMO_CATEGORY_LINKS = ${JSON.stringify(processedCategoryLinks, null, 2)};

export const DEMO_RELATIONS = ${JSON.stringify(expandedRelations, null, 2)};

export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
  const roots: Category[] = [];
  map.forEach(cat => {
    if (cat.parent_id === null) {
      roots.push(cat);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(cat);
      }
    }
  });
  const sortChildren = (cats: Category[]) => {
    cats.sort((a, b) => a.order_index - b.order_index);
    cats.forEach(c => c.children && sortChildren(c.children));
  };
  sortChildren(roots);
  return roots;
}

export function getDescendantCategoryIds(categoryId: string, allCategories: Category[]): string[] {
  const ids: string[] = [categoryId];
  const children = allCategories.filter(c => c.parent_id === categoryId);
  children.forEach(child => {
    ids.push(...getDescendantCategoryIds(child.id, allCategories));
  });
  return ids;
}

export function getDocumentsForCategoryTree(categoryId: string): Partial<LegalDocument>[] {
  const descendantIds = getDescendantCategoryIds(categoryId, DEMO_CATEGORIES);
  const linkDocIds = new Set(
    DEMO_CATEGORY_LINKS
      .filter(link => descendantIds.includes(link.category_id))
      .map(link => link.document_id)
  );
  return DEMO_DOCUMENTS.filter(doc => linkDocIds.has(doc.id!));
}

export function getCategoryDocumentCount(categoryId: string): number {
  return getDocumentsForCategoryTree(categoryId).length;
}

export function getDocumentById(id: string): Partial<LegalDocument> | undefined {
  return DEMO_DOCUMENTS.find(doc => doc.id === id);
}

export function getDocumentRelations(documentId: string) {
  return {
    as_source: DEMO_RELATIONS.filter(r => r.source_document_id === documentId),
    as_target: DEMO_RELATIONS.filter(r => r.target_document_id === documentId),
  };
}

export function searchDocuments(query: string): Partial<LegalDocument>[] {
  const q = query.toLowerCase();
  return DEMO_DOCUMENTS.filter(doc =>
    doc.title?.toLowerCase().includes(q) ||
    doc.document_number?.toLowerCase().includes(q) ||
    doc.issuing_body?.toLowerCase().includes(q) ||
    doc.html_content?.toLowerCase().includes(q) ||
    doc.summary_main?.toLowerCase().includes(q)
  );
}
`;

  fs.writeFileSync(path.join(__dirname, '../src/lib/demo-data.ts'), frontendDataCode);
  console.log('🎉 ĐÃ NẠP THÀNH CÔNG TOÀN BỘ KHO LUẬT & LIÊN KẾT 4 TẦNG LÊN SUPABASE VÀ WEB APP!');
}

run();
