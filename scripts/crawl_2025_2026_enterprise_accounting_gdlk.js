const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
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

// 1. EXTRA CATEGORIES TO ENSURE COMPLETE HIERARCHY
const extraCategories = [
  // Child categories under Doanh nghiệp
  { id: 'cat-ent-luat', parent_id: 'cat-enterprise', name: 'Luật Doanh nghiệp', slug: 'doanh-nghiep-luat', description: 'Luật Doanh nghiệp và các luật sửa đổi', order_index: 1, icon: null, is_active: true },
  { id: 'cat-ent-nd', parent_id: 'cat-enterprise', name: 'Nghị định Doanh nghiệp', slug: 'doanh-nghiep-nghi-dinh', description: 'Nghị định về đăng ký kinh doanh, quản trị', order_index: 2, icon: null, is_active: true },
  { id: 'cat-ent-tt', parent_id: 'cat-enterprise', name: 'Thông tư Doanh nghiệp', slug: 'doanh-nghiep-thong-tu', description: 'Thông tư biểu mẫu, thủ tục doanh nghiệp', order_index: 3, icon: null, is_active: true },
  { id: 'cat-ent-gdlk', parent_id: 'cat-enterprise', name: 'Giao dịch liên kết', slug: 'giao-dich-lien-ket-dn', description: 'Quản lý quan hệ liên kết và giá chuyển nhượng', order_index: 4, icon: null, is_active: true },

  // Child categories under Kế toán
  { id: 'cat-acc-hcsn', parent_id: 'cat-accounting', name: 'Kế toán HCSN & Quỹ', slug: 'ke-toan-hcsn-quy', description: 'Chế độ kế toán hành chính sự nghiệp và quỹ', order_index: 6, icon: null, is_active: true },

  // Child categories under Kiểm toán
  { id: 'cat-aud-xphc', parent_id: 'cat-audit', name: 'Xử phạt vi phạm kiểm toán', slug: 'kiem-toan-xu-phat', description: 'Quy định xử phạt trong kiểm toán độc lập', order_index: 5, icon: null, is_active: true },

  // Child category under Thuế
  { id: 'cat-tax-gdlk', parent_id: 'cat-tax', name: 'Giao dịch liên kết & Chuyển giá', slug: 'thue-giao-dich-lien-ket', description: 'Quản lý thuế đối với doanh nghiệp có giao dịch liên kết', order_index: 7, icon: null, is_active: true },
];

// 2. NEW 2025 - 2026 LEGAL DOCUMENTS
const newDocuments = [
  // =========================================================================
  // CHUYÊN ĐỀ 1: GIAO DỊCH LIÊN KẾT & QUẢN LÝ GIÁ CHUYỂN NHƯỢNG (2025 - 2026)
  // =========================================================================
  {
    id: 'doc-nd-255-gdlk-2026',
    title: 'Nghị định 255/2026/NĐ-CP quy định về quản lý thuế đối với doanh nghiệp có giao dịch liên kết',
    document_number: '255/2026/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2026-06-20',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    category_id: 'cat-tax-gdlk',
    secondary_category_ids: ['cat-ent-gdlk'],
    summary_main: 'Nghị định 255/2026/NĐ-CP thay thế toàn diện Nghị định 132/2020/NĐ-CP và Nghị định 20/2025/NĐ-CP từ ngày 01/07/2026, quy định nguyên tắc xác định giá giao dịch liên kết, chi phí lãi vay được trừ và trách nhiệm lập Hồ sơ quốc gia, Hồ sơ toàn cầu, Báo cáo lợi nhuận liên quốc gia (CbCR).',
    summary_new_points: '1. Nâng ngưỡng doanh thu miễn lập Hồ sơ xác định giá giao dịch liên kết lên 100 tỷ VNĐ hoặc tổng giá trị giao dịch liên kết dưới 50 tỷ VNĐ.\n2. Chuẩn hóa quy định khống chế chi phí lãi vay không vượt quá 30% EBITDA thuần (sau khi bù trừ lãi tiền gửi và lãi cho vay phát sinh trong kỳ).\n3. Bổ sung trường hợp miễn trừ khống chế lãi vay cho các dự án hạ tầng công cộng và doanh nghiệp xã hội.\n4. Tăng ngưỡng bắt buộc nộp Báo cáo lợi nhuận liên quốc gia (CbCR) cho công ty mẹ tối cao tại Việt Nam có doanh thu hợp nhất toàn cầu từ 750 triệu EUR trở lên.',
    summary_affected_parties: 'Tất cả doanh nghiệp có vốn đầu tư nước ngoài (FDI), tập đoàn kinh tế đa quốc gia, các công ty trong cùng hệ thống mẹ - con hoặc có quan hệ bảo lãnh, vay vốn liên kết.',
    summary_accounting_impact: 'Kế toán cần hạch toán theo dõi tách bạch chi phí lãi vay vượt mức 30% EBITDA để chuyển chi phí sang kỳ tính thuế tiếp theo (tối đa 5 năm liên tục); lập các phụ lục mẫu biểu I, II, III, IV đính kèm tờ khai quyết toán thuế TNDN.',
    summary_audit_impact: 'Kiểm toán viên bắt buộc đánh giá rủi ro định giá chuyển nhượng (Transfer Pricing), kiểm tra tính thị trường theo nguyên tắc Giao dịch độc lập (Arm\'s Length Principle) và tính đầy đủ của bộ Hồ sơ xác định giá 3 cấp.',
    summary_actions_needed: '1. Rà soát danh mục các bên liên kết theo tiêu chí vốn góp, nhân sự điều hành và bảo lãnh vay vốn.\n2. Tính toán thử nghiệm mức khống chế trần lãi vay 30% EBITDA.\n3. Chuẩn bị Hồ sơ thông tin tập đoàn toàn cầu (Master File) và Hồ sơ quốc gia (Local File) trước thời hạn quyết toán thuế.',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 255/2026/NĐ-CP CỦA CHÍNH PHỦ</h2>
      <p class="meta"><strong>Ban hành ngày:</strong> 20/06/2026 | <strong>Hiệu lực thi hành:</strong> 01/07/2026 | <strong>Người ký:</strong> Thủ tướng Chính phủ Phạm Minh Chính</p>
      
      <div class="legal-box info">
        <h4>TÓM TẮT TRỌNG TÂM CHO DOANH NGHIỆP & KIỂM TOÁN VIÊN</h4>
        <p>Nghị định 255/2026/NĐ-CP là văn bản pháp lý nền tảng thay thế Nghị định 132/2020/NĐ-CP và Nghị định 20/2025/NĐ-CP kể từ kỳ tính thuế TNDN năm 2026. Văn bản hoàn thiện cơ sở pháp lý về phòng chống chuyển giá, tối ưu hóa điều kiện miễn lập hồ sơ và kiểm soát dòng vốn vay.</p>
      </div>

      <h3>CHƯƠNG I: QUY ĐỊNH CHUNG</h3>
      <p><strong>Điều 1. Phạm vi điều chỉnh</strong></p>
      <p>1. Nghị định này quy định về nguyên tắc, phương pháp, trình tự xác định giá giao dịch liên kết; nghĩa vụ kê khai, lập hồ sơ xác định giá giao dịch liên kết; chi phí được trừ khi xác định thu nhập chịu thuế thu nhập doanh nghiệp đối với doanh nghiệp có giao dịch liên kết tại Việt Nam.</p>
      <p>2. Các giao dịch liên kết thuộc phạm vi điều chỉnh gồm: mua, bán, trao đổi, thuê, cho thuê, mượn, cho mượn, chuyển giao, chuyển nhượng tài sản hữu hình, tài sản vô hình; cung cấp dịch vụ; vay, cho vay, dịch vụ tài chính, đảm bảo tài chính và các công cụ tài chính khác; sử dụng chung tài sản, nhân lực và chia sẻ chi phí giữa các bên có quan hệ liên kết.</p>

      <p><strong>Điều 5. Quy định về các bên có quan hệ liên kết</strong></p>
      <p>1. Các bên có quan hệ liên kết là các bên có mối quan hệ thuộc một trong các trường hợp sau:</p>
      <p>a) Một bên tham gia trực tiếp hoặc gián tiếp vào việc điều hành, kiểm soát, góp vốn hoặc đầu tư vào bên kia;</p>
      <p>b) Các bên trực tiếp hay gián tiếp cùng chịu sự điều hành, kiểm soát, góp vốn hoặc đầu tư của một bên khác;</p>
      <p>c) Một doanh nghiệp nắm giữ trực tiếp hoặc gián tiếp ít nhất 25% vốn góp của chủ sở hữu của doanh nghiệp kia;</p>
      <p>d) Một doanh nghiệp bảo lãnh hoặc cho một doanh nghiệp khác vay vốn dưới bất kỳ hình thức nào với điều kiện khoản vốn vay ít nhất bằng 25% vốn góp của chủ sở hữu của doanh nghiệp đi vay và chiếm trên 50% tổng giá trị các khoản nợ trung và dài hạn của doanh nghiệp đi vay.</p>

      <h3>CHƯƠNG II: XÁC ĐỊNH CHI PHÍ ĐƯỢC TRỪ VÀ NGUYÊN TẮC GIÁ THỊ TRƯỜNG</h3>
      <p><strong>Điều 16. Quy định về chi phí lãi vay đối với doanh nghiệp có giao dịch liên kết</strong></p>
      <p>1. Tổng chi phí lãi vay phát sinh trong kỳ được trừ khi xác định thu nhập chịu thuế thu nhập doanh nghiệp không vượt quá 30% của tổng lợi nhuận thuần từ hoạt động kinh doanh trong kỳ cộng chi phí lãi vay sau khi trừ lãi tiền gửi và lãi cho vay phát sinh trong kỳ cộng chi phí khấu hao phát sinh trong kỳ (EBITDA thuần).</p>
      <p>2. Phần chi phí lãi vay không được trừ theo quy định tại khoản 1 Điều này được chuyển sang kỳ tính thuế tiếp theo khi xác định tổng chi phí lãi vay được trừ. Thời gian chuyển chi phí lãi vay tính liên tục không quá 05 năm kể từ năm tiếp sau năm phát sinh chi phí lãi vay không được trừ.</p>
      <p>3. Quy định khống chế trần chi phí lãi vay tại khoản 1 Điều này không áp dụng đối với:</p>
      <p>a) Tổ chức tín dụng theo quy định của Luật Các tổ chức tín dụng;</p>
      <p>b) Tổ chức kinh doanh bảo hiểm theo quy định của Luật Kinh doanh bảo hiểm;</p>
      <p>c) Các dự án thực hiện chính sách an sinh xã hội, nhà ở xã hội do Thủ tướng Chính phủ phê duyệt.</p>

      <h3>CHƯƠNG III: HỒ SƠ XÁC ĐỊNH GIÁ GIAO DỊCH LIÊN KẾT</h3>
      <p><strong>Điều 18. Miễn nghĩa vụ lập Hồ sơ xác định giá giao dịch liên kết</strong></p>
      <p>1. Người nộp thuế được miễn nghĩa vụ kê khai xác định giá giao dịch liên kết và miễn lập Hồ sơ xác định giá giao dịch liên kết trong trường hợp chỉ phát sinh giao dịch với các bên liên kết là đối tượng nộp thuế TNDN tại Việt Nam, áp dụng cùng mức thuế suất thuế TNDN và không bên nào được hưởng ưu đãi thuế TNDN trong kỳ tính thuế.</p>
      <p>2. Người nộp thuế có trách nhiệm kê khai nhưng được miễn lập Hồ sơ xác định giá nếu đáp ứng một trong các điều kiện:</p>
      <p>a) Người nộp thuế có tổng doanh thu phát sinh của kỳ tính thuế dưới 100 tỷ đồng và tổng giá trị tất cả các giao dịch liên kết phát sinh dưới 50 tỷ đồng;</p>
      <p>b) Người nộp thuế đã ký kết Thỏa thuận trước về phương pháp xác định giá tính thuế (APA) thực hiện nộp Báo cáo thường niên theo quy định.</p>
    `
  },
  {
    id: 'doc-cv-1188-gdlk-2025',
    title: 'Công văn 1188/TCT-TTKT hướng dẫn kê khai giao dịch liên kết và xử lý chi phí lãi vay',
    document_number: '1188/TCT-TTKT',
    document_type: 'cong_van',
    issuing_body: 'Tổng cục Thuế',
    signer: 'Mai Sơn',
    issued_date: '2025-03-22',
    effective_date: '2025-03-22',
    status: 'hieu_luc',
    category_id: 'cat-tax-gdlk',
    secondary_category_ids: ['cat-ent-gdlk'],
    summary_main: 'Tổng cục Thuế hướng dẫn việc kê khai các phụ lục giao dịch liên kết, phương pháp tính EBITDA và cách kết chuyển chi phí lãi vay không được trừ sang các năm tiếp theo trong kỳ quyết toán thuế TNDN.',
    summary_new_points: 'Làm rõ công thức tính EBITDA chuẩn xác khi bù trừ lãi tiền gửi và lãi cho vay; hướng dẫn chi tiết hồ sơ chứng minh giao dịch độc lập khi vay ngân hàng thương mại.',
    summary_affected_parties: 'Các doanh nghiệp có vốn vay lớn, doanh nghiệp phát sinh giao dịch với công ty liên kết.',
    summary_accounting_impact: 'Ghi nhận thuế thu nhập hoãn lại phải thu (Tài khoản 243) đối với khoản chi phí lãi vay tạm thời chưa được trừ trong năm.',
    summary_audit_impact: 'Thu thập bằng chứng kiểm toán về phương pháp xác định giá so sánh độc lập (CUP) hoặc tỷ suất lợi nhuận thuần (TNMM).',
    summary_actions_needed: 'Lập bảng tính chi tiết EBITDA và phân bổ chi phí lãi vay theo đúng mẫu biểu quy định.',
    html_content: `
      <h2>CÔNG VĂN SỐ 1188/TCT-TTKT CỦA TỔNG CỤC THUẾ</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 22/03/2025 | <strong>Cơ quan ban hành:</strong> Tổng cục Thuế | <strong>Người ký:</strong> Phó Tổng cục trưởng Mai Sơn</p>
      <p>Kính gửi: Cục Thuế các tỉnh, thành phố trực thuộc Trung ương.</p>
      <p>Để đảm bảo thực hiện thống nhất các quy định về quản lý thuế đối với doanh nghiệp có giao dịch liên kết, Tổng cục Thuế hướng dẫn cụ thể về việc xác định chi phí lãi vay và lập phụ lục quyết toán thuế TNDN như sau:</p>
      <p><strong>1. Về xác định chi phí lãi vay được trừ theo trần EBITDA:</strong></p>
      <p>Chỉ tiêu EBITDA được xác định = Lợi nhuận thuần từ hoạt động kinh doanh + Chi phí lãi vay phát sinh thuần (Chi phí lãi vay - Doanh thu lãi tiền gửi, lãi cho vay) + Chi phí khấu hao TSCĐ phát sinh trong kỳ.</p>
      <p>Trường hợp EBITDA âm hoặc bằng 0, toàn bộ chi phí lãi vay thuần phát sinh trong kỳ không được trừ khi xác định thu nhập chịu thuế TNDN và được chuyển sang kỳ tính thuế tiếp theo theo quy định.</p>
      <p><strong>2. Về việc theo dõi và kết chuyển chi phí lãi vay không được trừ:</strong></p>
      <p>Doanh nghiệp phải lập sổ theo dõi riêng số chi phí lãi vay chưa được trừ chuyển kỳ sau theo nguyên tắc chi phí lãi vay phát sinh trước được chuyển trừ trước vào các năm tiếp theo nếu trong năm đó tổng chi phí lãi vay chưa chạm trần 30% EBITDA.</p>
    `
  },
  {
    id: 'doc-cv-3058-gdlk-2025',
    title: 'Công văn 3058/TCT-CS về xác định quan hệ liên kết qua giao dịch vay vốn và bảo lãnh ngân hàng',
    document_number: '3058/TCT-CS',
    document_type: 'cong_van',
    issuing_body: 'Tổng cục Thuế',
    signer: 'Vũ Xuân Bách',
    issued_date: '2025-07-15',
    effective_date: '2025-07-15',
    status: 'hieu_luc',
    category_id: 'cat-tax-gdlk',
    secondary_category_ids: ['cat-ent-gdlk'],
    summary_main: 'Hướng dẫn cụ thể về tiêu chí xác định bên liên kết theo điểm d khoản 2 Điều 5 đối với các khoản vay tại Ngân hàng thương mại hoạt động độc lập.',
    summary_new_points: 'Khẳng định quan hệ vay vốn giữa doanh nghiệp và Ngân hàng thương mại thông thường theo lãi suất thị trường không mặc nhiên làm phát sinh quan hệ liên kết nếu ngân hàng không tham gia điều hành, kiểm soát hay chi phối hoạt động sản xuất kinh doanh của doanh nghiệp.',
    summary_affected_parties: 'Các doanh nghiệp vay vốn ngân hàng thương mại để tài trợ vốn lưu động và dự án đầu tư.',
    summary_accounting_impact: 'Giảm bớt gánh nặng kê khai quan hệ liên kết không cần thiết đối với các khoản vay thương mại thông thường.',
    summary_audit_impact: 'Đánh giá tính độc lập của tổ chức tín dụng tài trợ vốn khi lập hồ sơ kiểm toán.',
    summary_actions_needed: 'Rà soát hợp đồng tín dụng và điều khoản cam kết với ngân hàng cho vay.',
    html_content: `
      <h2>CÔNG VĂN SỐ 3058/TCT-CS CỦA TỔNG CỤC THUẾ</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 15/07/2025 | <strong>Người ký:</strong> Phó Tổng cục trưởng Vũ Xuân Bách</p>
      <p>Trả lời kiến nghị của các Hiệp hội doanh nghiệp về việc xác định bên liên kết qua quan hệ tín dụng ngân hàng, Tổng cục Thuế có ý kiến như sau:</p>
      <p>Căn cứ quy định tại Nghị định quản lý thuế đối với doanh nghiệp có giao dịch liên kết:</p>
      <p>Trường hợp doanh nghiệp vay vốn của Ngân hàng thương mại độc lập, giao dịch vay diễn ra theo đúng quy định của Luật Các tổ chức tín dụng, lãi suất theo giá thị trường bình thường và Ngân hàng không cử người tham gia Hội đồng quản trị, Ban giám đốc hoặc nắm quyền chi phối quyết định kinh doanh thì không thuộc đối tượng áp dụng các biện pháp ấn định thuế giao dịch liên kết.</p>
    `
  },

  // =========================================================================
  // CHUYÊN ĐỀ 2: DOANH NGHIỆP & ĐĂNG KÝ KINH DOANH MỚI (2025 - 2026)
  // =========================================================================
  {
    id: 'doc-luat-76-dn-2025',
    title: 'Luật số 76/2025/QH15 sửa đổi, bổ sung một số điều của Luật Doanh nghiệp',
    document_number: '76/2025/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2025-06-17',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-ent-luat',
    summary_main: 'Luật sửa đổi bổ sung Luật Doanh nghiệp 2020 quy định bắt buộc minh bạch Chủ sở hữu hưởng lợi (Beneficial Ownership), cải cách quy trình đăng ký doanh nghiệp hoàn toàn trực tuyến và tháo gỡ vướng mắc về chuyển nhượng vốn góp.',
    summary_new_points: '1. Bổ sung khái niệm và nghĩa vụ kê khai "Chủ sở hữu hưởng lợi" (người nắm giữ từ 25% vốn hoặc có quyền chi phối thực tế) nhằm phòng chống rửa tiền.\n2. Công nhận 100% hồ sơ đăng ký doanh nghiệp qua môi trường điện tử với chữ ký số cá nhân/tổ chức.\n3. Rút ngắn thời gian xử lý thay đổi nội dung đăng ký kinh doanh từ 3 ngày xuống còn tối đa 2 ngày làm việc.\n4. Đơn giản hóa thủ tục chia, tách, sáp nhập doanh nghiệp và quy định về chi trả cổ tức.',
    summary_affected_parties: 'Toàn bộ các loại hình doanh nghiệp: Công ty Cổ phần, Công ty TNHH, Doanh nghiệp tư nhân, Hợp danh.',
    summary_accounting_impact: 'Rà soát sổ đăng ký thành viên/cổ đông, cập nhật danh sách chủ sở hữu thực tế trong thuyết minh báo cáo tài chính.',
    summary_audit_impact: 'Kiểm toán viên xác minh tính hợp pháp của danh sách cổ đông sáng lập và các bên liên quan theo Luật Doanh nghiệp mới.',
    summary_actions_needed: 'Doanh nghiệp tiến hành thu thập và kê khai thông tin Chủ sở hữu hưởng lợi trước thời hạn hiệu lực.',
    html_content: `
      <h2>LUẬT SỬA ĐỔI, BỔ SUNG MỘT SỐ ĐIỀU CỦA LUẬT DOANH NGHIỆP SỐ 76/2025/QH15</h2>
      <p class="meta"><strong>Ban hành:</strong> 17/06/2025 | <strong>Hiệu lực:</strong> 01/07/2025 | <strong>Cơ quan ban hành:</strong> Quốc hội khóa XV</p>

      <div class="legal-box warning">
        <h4>ĐIỂM NỔI BẬT: NGHĨA VỤ KÊ KHAI CHỦ SỞ HỮU HƯỞNG LỢI (BENEFICIAL OWNERSHIP)</h4>
        <p>Mọi doanh nghiệp thành lập hoặc đang hoạt động tại Việt Nam có nghĩa vụ lưu giữ, cập nhật và cung cấp cho cơ quan đăng ký kinh doanh thông tin về cá nhân là Chủ sở hữu hưởng lợi thực tế.</p>
      </div>

      <h3>ĐIỀU 1. SỬA ĐỔI, BỔ SUNG MỘT SỐ ĐIỀU CỦA LUẬT DOANH NGHIỆP SỐ 59/2020/QH14</h3>
      <p><strong>1. Bổ sung Điều 15a về Chủ sở hữu hưởng lợi của doanh nghiệp:</strong></p>
      <p>a) Chủ sở hữu hưởng lợi là cá nhân thực tế sở hữu, kiểm soát hoặc chi phối doanh nghiệp thông qua việc sở hữu trực tiếp hoặc gián tiếp từ 25% vốn điều lệ trở lên hoặc có quyền biểu quyết chi phối các quyết định quan trọng của doanh nghiệp;</p>
      <p>b) Doanh nghiệp có trách nhiệm thu thập, lưu giữ thông tin về chủ sở hữu hưởng lợi và đăng ký với Cơ quan đăng ký kinh doanh khi thành lập hoặc khi có thay đổi.</p>
      <p><strong>2. Sửa đổi Điều 26 về Trình tự, thủ tục đăng ký doanh nghiệp trực tuyến:</strong></p>
      <p>Người thành lập doanh nghiệp hoặc người được ủy quyền thực hiện đăng ký doanh nghiệp trực tuyến tại Cổng thông tin quốc gia về đăng ký doanh nghiệp. Hồ sơ đăng ký điện tử có giá trị pháp lý tương đương hồ sơ bằng bản giấy.</p>
    `
  },
  {
    id: 'doc-nd-168-dn-2025',
    title: 'Nghị định 168/2025/NĐ-CP quy định về đăng ký doanh nghiệp',
    document_number: '168/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-06-30',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-ent-nd',
    summary_main: 'Nghị định 168/2025/NĐ-CP thay thế toàn diện Nghị định 01/2021/NĐ-CP, quy định chi tiết quy trình đăng ký thành lập mới, thay đổi nội dung, tạm ngừng, giải thể doanh nghiệp qua Cổng thông tin quốc gia.',
    summary_new_points: 'Liên thông thủ tục đăng ký doanh nghiệp với đăng ký mã số thuế, bảo hiểm xã hội và mở tài khoản ngân hàng điện tử tự động.',
    summary_affected_parties: 'Cá nhân, tổ chức khởi nghiệp, người đại diện theo pháp luật của doanh nghiệp.',
    summary_accounting_impact: 'Mã số doanh nghiệp đồng thời là mã số thuế và mã số đơn vị tham gia BHXH.',
    summary_audit_impact: 'Xác nhận tính hợp lệ của Giấy chứng nhận đăng ký doanh nghiệp số.',
    summary_actions_needed: 'Sử dụng tài khoản VNeID hoặc chữ ký số cá nhân để thực hiện các thủ tục doanh nghiệp.',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 168/2025/NĐ-CP VỀ ĐĂNG KÝ DOANH NGHIỆP</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 30/06/2025 | <strong>Hiệu lực:</strong> 01/07/2025 | <strong>Thay thế:</strong> Nghị định 01/2021/NĐ-CP</p>
      <p>Nghị định quy định chi tiết việc đăng ký thành lập, thay đổi, giải thể doanh nghiệp, hộ kinh doanh và liên thông tự động với cơ quan quản lý chuyên ngành.</p>
    `
  },
  {
    id: 'doc-tt-68-bkhdt-2025',
    title: 'Thông tư 68/2025/TT-BKHĐT quy định hệ thống biểu mẫu điện tử sử dụng trong đăng ký doanh nghiệp, hộ kinh doanh',
    document_number: '68/2025/TT-BKHĐT',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Kế hoạch và Đầu tư',
    signer: 'Nguyễn Chí Dũng',
    issued_date: '2025-06-30',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_id: 'cat-ent-tt',
    summary_main: 'Ban hành hệ thống biểu mẫu chuẩn hóa quốc gia dùng cho việc thành lập, thay đổi thông tin cổ đông, thành viên, ngành nghề kinh doanh và chủ sở hữu hưởng lợi.',
    summary_new_points: 'Bổ sung Phụ lục mẫu biểu kê khai danh sách Chủ sở hữu hưởng lợi (Mẫu II-18) và biểu mẫu đăng ký số hóa.',
    summary_affected_parties: 'Doanh nghiệp, hộ kinh doanh trên phạm vi toàn quốc.',
    summary_accounting_impact: 'Sử dụng đúng mẫu biểu khi lập hồ sơ thay đổi vốn điều lệ và cơ cấu sở hữu.',
    summary_actions_needed: 'Tải và sử dụng các mẫu biểu mới theo Thông tư 68/2025.',
    html_content: `
      <h2>THÔNG TƯ SỐ 68/2025/TT-BKHĐT BAN HÀNH HỆ THỐNG BIỂU MẪU ĐĂNG KÝ DOANH NGHIỆP</h2>
      <p class="meta"><strong>Ban hành:</strong> 30/06/2025 | <strong>Hiệu lực:</strong> 01/07/2025 | <strong>Bộ Kế hoạch và Đầu tư</strong></p>
      <p>Thông tư ban hành toàn bộ hệ thống mẫu biểu đăng ký doanh nghiệp trực tuyến tương thích với cơ sở dữ liệu quốc gia về dân cư và đăng ký kinh doanh.</p>
    `
  },
  {
    id: 'doc-tt-121-bkhdt-2026',
    title: 'Thông tư 121/2026/TT-BKHĐT sửa đổi, bổ sung một số điều của Thông tư 68/2025/TT-BKHĐT về biểu mẫu đăng ký kinh doanh',
    document_number: '121/2026/TT-BKHĐT',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Kế hoạch và Đầu tư',
    signer: 'Trần Quốc Phương',
    issued_date: '2026-07-10',
    effective_date: '2026-08-21',
    status: 'hieu_luc',
    category_id: 'cat-ent-tt',
    summary_main: 'Cập nhật, chuẩn hóa một số biểu mẫu liên quan đến việc xác thực danh tính điện tử người nộp hồ sơ qua hệ thống định danh VNeID mức độ 2.',
    summary_new_points: 'Cho phép quét mã QR trên Căn cước công dân và tích hợp tự động dữ liệu thông tin đại diện pháp luật.',
    summary_affected_parties: 'Cá nhân thực hiện thủ tục đăng ký kinh doanh cho doanh nghiệp.',
    summary_actions_needed: 'Cập nhật phần mềm nộp hồ sơ đăng ký kinh doanh.',
    html_content: `
      <h2>THÔNG TƯ SỐ 121/2026/TT-BKHĐT SỬA ĐỔI THÔNG TƯ 68/2025/TT-BKHĐT</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 10/07/2026 | <strong>Hiệu lực:</strong> 21/08/2026</p>
      <p>Cập nhật quy định về xác thực điện tử và phương thức ký số trong biểu mẫu đăng ký doanh nghiệp trực tuyến.</p>
    `
  },
  {
    id: 'doc-nd-210-dn-2025',
    title: 'Nghị định 210/2025/NĐ-CP sửa đổi, bổ sung Nghị định 38/2018/NĐ-CP về đầu tư cho doanh nghiệp nhỏ và vừa khởi nghiệp sáng tạo',
    document_number: '210/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-07-28',
    effective_date: '2025-09-15',
    status: 'hieu_luc',
    category_id: 'cat-ent-nd',
    summary_main: 'Quy định các cơ chế ưu đãi tài chính, quỹ đầu tư khởi nghiệp sáng tạo, cơ chế thử nghiệm có kiểm soát (Sandbox) và hỗ trợ thuế đối với doanh nghiệp đổi mới sáng tạo.',
    summary_new_points: 'Nới lỏng điều kiện góp vốn của nhà đầu tư thiên thần và quỹ mạo hiểm tư nhân.',
    summary_affected_parties: 'Doanh nghiệp Startup, Quỹ đầu tư khởi nghiệp, vườn ươm doanh nghiệp.',
    summary_accounting_impact: 'Hạch toán chi phí R&D và các khoản vốn tài trợ không hoàn lại vào thu nhập được miễn/giảm thuế.',
    summary_actions_needed: 'Đăng ký công nhận doanh nghiệp khoa học công nghệ hoặc khởi nghiệp sáng tạo để hưởng ưu đãi.',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 210/2025/NĐ-CP VỀ ĐẦU TƯ KHỞI NGHIỆP SÁNG TẠO</h2>
      <p class="meta"><strong>Ban hành:</strong> 28/07/2025 | <strong>Hiệu lực:</strong> 15/09/2025</p>
      <p>Quy định chi tiết điều kiện thành lập và hoạt động của Quỹ đầu tư khởi nghiệp sáng tạo tại Việt Nam.</p>
    `
  },
  {
    id: 'doc-nd-248-dn-2025',
    title: 'Nghị định 248/2025/NĐ-CP quy định chế độ tiền lương, thù lao, tiền thưởng của người quản lý doanh nghiệp và đại diện vốn nhà nước',
    document_number: '248/2025/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-08-01',
    effective_date: '2025-09-15',
    status: 'hieu_luc',
    category_id: 'cat-ent-nd',
    summary_main: 'Quy định khung định mức thù lao, tiền lương gắn với hiệu quả sản xuất kinh doanh (KPI) và tỷ suất sinh lời trên vốn chủ sở hữu (ROE).',
    summary_new_points: 'Phân loại thang bảng lương quản lý linh hoạt tiệm cận thị trường quốc tế.',
    summary_affected_parties: 'Thành viên HĐQT, Ban Giám đốc, Ban kiểm soát các doanh nghiệp nhà nước và công ty cổ phần có vốn nhà nước.',
    summary_accounting_impact: 'Trích lập quỹ lương và chi trả thù lao người quản lý theo đúng phê duyệt của Đại hội đồng cổ đông.',
    summary_actions_needed: 'Xây dựng quy chế trả lương thưởng gắn với KPI năm tài chính.',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 248/2025/NĐ-CP VỀ TIỀN LƯƠNG NGƯỜI QUẢN LÝ DOANH NGHIỆP</h2>
      <p class="meta"><strong>Ban hành:</strong> 01/08/2025 | <strong>Hiệu lực:</strong> 15/09/2025</p>
      <p>Quy định về nguyên tắc trả lương, thưởng và thù lao cho người quản lý doanh nghiệp nhà nước và công ty đại chúng.</p>
    `
  },
  {
    id: 'doc-nd-145-ck-2026',
    title: 'Nghị định 145/2026/NĐ-CP quy định về quản lý tài chính và xếp loại doanh nghiệp kinh doanh chứng khoán',
    document_number: '145/2026/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2026-05-08',
    effective_date: '2026-06-22',
    status: 'hieu_luc',
    category_id: 'cat-ent-nd',
    summary_main: 'Quy định các chỉ tiêu an toàn tài chính, tỷ lệ vốn khả dụng tối thiểu, chế độ trích lập dự phòng rủi ro thị trường và phân loại công ty chứng khoán, quản lý quỹ.',
    summary_new_points: 'Bắt buộc kiểm toán độc lập đối với báo cáo tỷ lệ an toàn tài chính định kỳ 06 tháng và cả năm.',
    summary_affected_parties: 'Các Công ty Chứng khoán, Công ty Quản lý Quỹ đầu tư chứng khoán.',
    summary_accounting_impact: 'Tuân thủ các phương pháp đánh giá lại tài sản tài chính ghi nhận qua lãi/lỗ (FVTPL).',
    summary_audit_impact: 'Kiểm toán viên phát hành Báo cáo kiểm toán tỷ lệ an toàn tài chính theo chuẩn mực VSA chuyên ngành.',
    summary_actions_needed: 'Rà soát danh mục tự doanh và đảm bảo tỷ lệ vốn khả dụng luôn đạt trên 180%.',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 145/2026/NĐ-CP VỀ QUẢN LÝ TÀI CHÍNH DOANH NGHIỆP KINH DOANH CHỨNG KHOÁN</h2>
      <p class="meta"><strong>Ban hành:</strong> 08/05/2026 | <strong>Hiệu lực:</strong> 22/06/2026</p>
      <p>Quy định chế độ quản lý tài chính, kiểm soát rủi ro và đánh giá xếp hạng đối với các tổ chức kinh doanh chứng khoán.</p>
    `
  },

  // =========================================================================
  // CHUYÊN ĐỀ 3: KẾ TOÁN & KIỂM TOÁN ĐỘC LẬP (2025 - 2026)
  // =========================================================================
  {
    id: 'doc-nd-132-xphc-kt-2026',
    title: 'Nghị định 132/2026/NĐ-CP sửa đổi, bổ sung Nghị định 41/2018/NĐ-CP về xử phạt vi phạm hành chính trong lĩnh vực kế toán, kiểm toán độc lập',
    document_number: '132/2026/NĐ-CP',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2026-04-05',
    effective_date: '2026-05-21',
    status: 'hieu_luc',
    category_id: 'cat-aud-xphc',
    secondary_category_ids: ['cat-aud-nd', 'cat-acc-nd'],
    summary_main: 'Sửa đổi, siết chặt các khung xử phạt hành chính đối với hành vi vi phạm chuẩn mực kế toán, ký khống báo cáo kiểm toán, vi phạm quy định phòng chống rửa tiền và không tuân thủ đạo đức nghề nghiệp.',
    summary_new_points: '1. Phạt tiền từ 50 - 100 triệu đồng và đình chỉ hành nghề 12 - 24 tháng đối với KTV độc lập đưa ra ý kiến kiểm toán sai lệch nghiêm trọng.\n2. Tăng mức phạt đối với doanh nghiệp không thực hiện kiểm toán bắt buộc báo cáo tài chính hàng năm.\n3. Bổ sung chế tài xử phạt đối với đơn vị cung cấp dịch vụ kế toán không đánh giá rủi ro rửa tiền đối với khách hàng.',
    summary_affected_parties: 'Doanh nghiệp kiểm toán, Kiểm toán viên hành nghề, Giám đốc tài chính, Kế toán trưởng các doanh nghiệp bắt buộc kiểm toán.',
    summary_accounting_impact: 'Nâng cao trách nhiệm giải trình số liệu, tránh cung cấp thông tin sai lệch cho kiểm toán viên.',
    summary_audit_impact: 'Kiểm soát chất lượng hồ sơ kiểm toán nghiêm ngặt để tránh bị cơ quan quản lý xử phạt hoặc rút giấy phép hành nghề.',
    summary_actions_needed: 'Rà soát quy trình kiểm soát chất lượng nội bộ (ISQC 1 / ISQM 1) trước khi phát hành báo cáo kiểm toán.',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 132/2026/NĐ-CP SỬA ĐỔI NGHỊ ĐỊNH 41/2018/NĐ-CP VỀ XỬ PHẠT KẾ TOÁN, KIỂM TOÁN</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 05/04/2026 | <strong>Hiệu lực:</strong> 21/05/2026 | <strong>Chính phủ</strong></p>
      
      <div class="legal-box alert">
        <h4>CẢNH BÁO QUAN TRỌNG VỀ XỬ PHẠT HÀNH NGHỀ KIỂM TOÁN</h4>
        <p>Nghị định tăng gấp đôi khung phạt đối với hành vi không tuân thủ chuẩn mực kiểm toán Việt Nam (VSA) và bổ sung hình phạt bổ sung tước quyền sử dụng Giấy chứng nhận đăng ký hành nghề kiểm toán.</p>
      </div>

      <p><strong>Nội dung sửa đổi trọng tâm:</strong></p>
      <p>1. Hành vi vi phạm về tính độc lập của kiểm toán viên: Phạt tiền từ 30 - 50 triệu đồng đối với kiểm toán viên thực hiện kiểm toán cho đơn vị mà mình có lợi ích kinh tế hoặc quan hệ gia đình trực tiếp với ban điều hành.</p>
      <p>2. Hành vi phát hành báo cáo kiểm toán có ý kiến không phù hợp với bằng chứng kiểm toán thu thập được: Phạt tiền từ 80 - 100 triệu đồng đối với doanh nghiệp kiểm toán.</p>
    `
  },
  {
    id: 'doc-tt-118-ifrs-2026',
    title: 'Thông tư 118/2026/TT-BTC hướng dẫn đối tượng, phạm vi và lộ trình áp dụng Chuẩn mực Báo cáo Tài chính Quốc tế (IFRS / VFRS) tại Việt Nam',
    document_number: '118/2026/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2026-08-18',
    effective_date: '2026-10-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-cm',
    secondary_category_ids: ['cat-aud-cm', 'cat-acc-tt'],
    summary_main: 'Quy định lộ trình chuyển đổi bắt buộc áp dụng IFRS đối với các Công ty đại chúng quy mô lớn, công ty mẹ có công ty con niêm yết, doanh nghiệp 100% vốn FDI và khuyến khích các doanh nghiệp khác tự nguyện áp dụng.',
    summary_new_points: '1. Khung thời gian chuyển đổi chính thức sang Chuẩn mực Báo cáo Tài chính Quốc tế (IFRS/VFRS) từ năm tài chính 2026-2027.\n2. Hướng dẫn việc lập Báo cáo tài chính chuyển đổi lần đầu theo IFRS 1 (First-time Adoption).\n3. Quy định phương pháp xác định giá trị hợp lý (Fair Value - IFRS 13) và ghi nhận tổn thất tài sản (Impairment - IAS 36).',
    summary_affected_parties: 'Các tập đoàn niêm yết, công ty vốn FDI quy mô lớn, đơn vị có lợi ích công chúng.',
    summary_accounting_impact: 'Thay đổi toàn diện phương pháp ghi nhận tài sản, công nợ từ giá gốc sang giá trị hợp lý; điều chỉnh hệ thống ERP kế toán.',
    summary_audit_impact: 'Kiểm toán viên cần có chứng chỉ quốc tế (ACCA, CPA Australia, ICAEW) và kỹ năng kiểm toán định giá phức tạp theo IFRS.',
    summary_actions_needed: 'Lập ban dự án chuyển đổi IFRS nội bộ, đánh giá sự khác biệt giữa VAS và IFRS và chuẩn bị dữ liệu quá khứ cho báo cáo so sánh.',
    html_content: `
      <h2>THÔNG TƯ SỐ 118/2026/TT-BTC VỀ LỘ TRÌNH ÁP DỤNG IFRS TẠI VIỆT NAM</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 18/08/2026 | <strong>Hiệu lực:</strong> 01/10/2026 | <strong>Bộ Tài chính</strong></p>
      
      <p>Thông tư 118/2026/TT-BTC đánh dấu bước ngoặt hội nhập quốc tế của hệ thống kế toán Việt Nam, công bố chi tiết danh mục các chuẩn mực IFRS được dịch nguyên văn và hướng dẫn áp dụng thực tế.</p>
    `
  },
  {
    id: 'doc-tt-101-kt-2025',
    title: 'Thông tư 101/2025/TT-BTC hướng dẫn chế độ kế toán đối với doanh nghiệp bảo hiểm, tái bảo hiểm và môi giới bảo hiểm',
    document_number: '101/2025/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2025-11-20',
    effective_date: '2026-01-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-tt',
    summary_main: 'Quy định phương pháp hạch toán doanh thu phí bảo hiểm, trích lập dự phòng nghiệp vụ bảo hiểm theo mô hình quản lý rủi ro hiện đại tương thích Luật Kinh doanh bảo hiểm.',
    summary_new_points: 'Cập nhật hệ thống tài khoản kế toán bảo hiểm theo IFRS 17 (Hợp đồng bảo hiểm).',
    summary_affected_parties: 'Các doanh nghiệp bảo hiểm nhân thọ, phi nhân thọ và môi giới bảo hiểm.',
    summary_accounting_impact: 'Hạch toán phân bổ doanh thu phí bảo hiểm theo thời gian bảo hiểm thực tế có hiệu lực.',
    summary_actions_needed: 'Nâng cấp phần mềm lõi bảo hiểm (Core Insurance) kết nối đồng bộ phân hệ kế toán.',
    html_content: `
      <h2>THÔNG TƯ SỐ 101/2025/TT-BTC VỀ CHẾ ĐỘ KẾ TOÁN DOANH NGHIỆP BẢO HIỂM</h2>
      <p class="meta"><strong>Ban hành:</strong> 20/11/2025 | <strong>Hiệu lực:</strong> 01/01/2026</p>
      <p>Hướng dẫn chi tiết tài khoản và phương pháp hạch toán nghiệp vụ bảo hiểm.</p>
    `
  },
  {
    id: 'doc-tt-107-kt-2025',
    title: 'Thông tư 107/2025/TT-BTC hướng dẫn chế độ kế toán các quỹ tài chính nhà nước ngoài ngân sách',
    document_number: '107/2025/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Võ Thành Hưng',
    issued_date: '2025-12-10',
    effective_date: '2026-01-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-hcsn',
    summary_main: 'Quy định phương pháp kế toán thu, chi, quản lý vốn bảo toàn và báo cáo tài chính của các quỹ ngoài ngân sách (Quỹ Bảo vệ môi trường, Quỹ Phát triển KHCN, Quỹ Đổi mới công nghệ...).',
    summary_new_points: 'Minh bạch hóa dòng tiền hỗ trợ doanh nghiệp và quy trình hạch toán giải ngân viện trợ.',
    summary_affected_parties: 'Ban quản lý các quỹ tài chính, doanh nghiệp nhận tài trợ từ các quỹ nhà nước.',
    summary_actions_needed: 'Lập báo cáo quyết toán quỹ theo đúng phụ lục biểu mẫu mới.',
    html_content: `
      <h2>THÔNG TƯ SỐ 107/2025/TT-BTC VỀ CHẾ ĐỘ KẾ TOÁN QUỸ TÀI CHÍNH</h2>
      <p class="meta"><strong>Ban hành:</strong> 10/12/2025 | <strong>Hiệu lực:</strong> 01/01/2026</p>
      <p>Quy định chi tiết việc quản lý và hạch toán kế toán các quỹ tài chính ngoài ngân sách nhà nước.</p>
    `
  },
  {
    id: 'doc-qd-1293-btc-2026',
    title: 'Quyết định 1293/QĐ-BTC công bố bãi bỏ, đơn giản hóa các thủ tục hành chính trong lĩnh vực kế toán, kiểm toán độc lập',
    document_number: '1293/QĐ-BTC',
    document_type: 'quyet_dinh',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2026-06-15',
    effective_date: '2026-07-01',
    status: 'hieu_luc',
    category_id: 'cat-aud-hd',
    secondary_category_ids: ['cat-acc-cv'],
    summary_main: 'Cắt giảm 09 thủ tục hành chính rườm rà trong việc cấp, gia hạn Giấy chứng nhận đăng ký hành nghề kiểm toán, kế toán và thẩm định điều kiện doanh nghiệp đủ điều kiện kinh doanh dịch vụ kiểm toán.',
    summary_new_points: 'Chuyển đổi 100% sang tiếp nhận và trả kết quả qua Cổng Dịch vụ công Quốc gia; không yêu cầu nộp bản sao chứng thực các giấy tờ đã có trên Cơ sở dữ liệu quốc gia.',
    summary_affected_parties: 'Kiểm toán viên hành nghề, người hành nghề kế toán, doanh nghiệp kiểm toán độc lập.',
    summary_actions_needed: 'Nộp hồ sơ cấp đổi chứng chỉ và đăng ký hành nghề trực tuyến.',
    html_content: `
      <h2>QUYẾT ĐỊNH SỐ 1293/QĐ-BTC CÔNG BỐ BÃI BỎ THỦ TỤC HÀNH CHÍNH KẾ TOÁN, KIỂM TOÁN</h2>
      <p class="meta"><strong>Ban hành:</strong> 15/06/2026 | <strong>Hiệu lực:</strong> 01/07/2026 | <strong>Bộ Tài chính</strong></p>
      <p>Quyết định công bố danh mục các thủ tục hành chính bãi bỏ và tích hợp toàn trình lên Cổng Dịch vụ công Quốc gia.</p>
    `
  },
  {
    id: 'doc-tt-24-hcsn-2024',
    title: 'Thông tư 24/2024/TT-BTC hướng dẫn Chế độ kế toán hành chính, sự nghiệp (Áp dụng từ năm 2025)',
    document_number: '24/2024/TT-BTC',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Võ Thành Hưng',
    issued_date: '2024-04-17',
    effective_date: '2025-01-01',
    status: 'hieu_luc',
    category_id: 'cat-acc-hcsn',
    summary_main: 'Thay thế toàn diện Thông tư 107/2017/TT-BTC từ ngày 01/01/2025, ban hành Chế độ kế toán mới cho tất cả các cơ quan nhà nước, đơn vị sự nghiệp công lập, ban quản lý dự án.',
    summary_new_points: 'Đổi mới căn bản hệ thống chứng từ kế toán, sổ kế toán và hệ thống tài khoản kế toán; thống nhất hạch toán nguồn kinh phí tự chủ và nguồn ngân sách cấp.',
    summary_affected_parties: 'Các đơn vị sự nghiệp công lập, trường học, bệnh viện, cơ quan hành chính nhà nước.',
    summary_accounting_impact: 'Chuyển đổi toàn bộ số dư tài khoản kế toán cũ sang hệ thống tài khoản theo Thông tư 24 từ ngày 01/01/2025.',
    summary_audit_impact: 'Kiểm toán Nhà nước và Kiểm toán độc lập sử dụng Thông tư 24 làm cơ sở kiểm tra quyết toán ngân sách.',
    summary_actions_needed: 'Đào tạo cán bộ kế toán và cập nhật phần mềm kế toán hành chính sự nghiệp trước niên độ tài chính 2025.',
    html_content: `
      <h2>THÔNG TƯ SỐ 24/2024/TT-BTC VỀ CHẾ ĐỘ KẾ TOÁN HÀNH CHÍNH, SỰ NGHIỆP</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 17/04/2024 | <strong>Áp dụng:</strong> 01/01/2025 | <strong>Thay thế:</strong> Thông tư 107/2017/TT-BTC</p>
      <p>Chế độ kế toán hành chính, sự nghiệp mới nhất áp dụng từ năm 2025 với hệ thống tài khoản kế toán và mẫu biểu báo cáo tài chính mới.</p>
    `
  }
];

// 3. NEW DOCUMENT RELATIONS
const newRelations = [
  // GDLK
  { source_document_id: 'doc-nd-255-gdlk-2026', target_document_id: 'doc-nd-132-2020', relation_type: 'thay_the', notes: 'Thay thế hoàn toàn Nghị định 132/2020/NĐ-CP từ kỳ tính thuế 2026' },
  { source_document_id: 'doc-nd-255-gdlk-2026', target_document_id: 'doc-nd-20-gdlk-2025', relation_type: 'thay_the', notes: 'Thay thế Nghị định 20/2025/NĐ-CP từ 01/07/2026' },
  { source_document_id: 'doc-cv-1188-gdlk-2025', target_document_id: 'doc-nd-20-gdlk-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn kê khai và khống chế trần lãi vay 30% EBITDA' },
  { source_document_id: 'doc-cv-3058-gdlk-2025', target_document_id: 'doc-nd-132-2020', relation_type: 'huong_dan', notes: 'Làm rõ tiêu chí quan hệ liên kết qua ngân hàng thương mại' },
  
  // Doanh nghiệp
  { source_document_id: 'doc-luat-76-dn-2025', target_document_id: 'doc-luat-dn-2020', relation_type: 'sua_doi', notes: 'Sửa đổi, bổ sung Luật Doanh nghiệp 2020 về chủ sở hữu hưởng lợi và đăng ký điện tử' },
  { source_document_id: 'doc-nd-168-dn-2025', target_document_id: 'doc-luat-76-dn-2025', relation_type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Luật Doanh nghiệp về đăng ký kinh doanh' },
  { source_document_id: 'doc-tt-68-bkhdt-2025', target_document_id: 'doc-nd-168-dn-2025', relation_type: 'huong_dan', notes: 'Ban hành hệ thống biểu mẫu điện tử đăng ký doanh nghiệp' },
  { source_document_id: 'doc-tt-121-bkhdt-2026', target_document_id: 'doc-tt-68-bkhdt-2025', relation_type: 'sua_doi', notes: 'Sửa đổi, bổ sung biểu mẫu đăng ký kinh doanh xác thực qua VNeID' },
  { source_document_id: 'doc-nd-210-dn-2025', target_document_id: 'doc-luat-dn-2020', relation_type: 'huong_dan', notes: 'Quy định đầu tư khởi nghiệp sáng tạo cho doanh nghiệp vừa và nhỏ' },
  { source_document_id: 'doc-nd-248-dn-2025', target_document_id: 'doc-luat-dn-2020', relation_type: 'huong_dan', notes: 'Quy định lương thưởng người quản lý và đại diện vốn doanh nghiệp' },

  // Kế toán - Kiểm toán
  { source_document_id: 'doc-nd-132-xphc-kt-2026', target_document_id: 'doc-nd-84-2016', relation_type: 'sua_doi', notes: 'Siết chặt khung xử phạt vi phạm hành chính trong kiểm toán và kế toán' },
  { source_document_id: 'doc-tt-118-ifrs-2026', target_document_id: 'doc-luat-kt-2015', relation_type: 'huong_dan', notes: 'Hướng dẫn lộ trình áp dụng Chuẩn mực BCTC Quốc tế IFRS tại Việt Nam' },
  { source_document_id: 'doc-tt-118-ifrs-2026', target_document_id: 'doc-tt-99-ketoan-2025', relation_type: 'lien_quan', notes: 'Đối chiếu chuyển đổi số liệu giữa TT 99 và IFRS' },
  { source_document_id: 'doc-qd-1293-btc-2026', target_document_id: 'doc-luat-kiemtoan-2011', relation_type: 'huong_dan', notes: 'Bãi bỏ 09 thủ tục hành chính trong lĩnh vực kiểm toán độc lập' },
  { source_document_id: 'doc-tt-101-kt-2025', target_document_id: 'doc-luat-kt-2015', relation_type: 'huong_dan', notes: 'Chế độ kế toán đặc thù cho doanh nghiệp bảo hiểm' }
];

async function run() {
  console.log('🚀 BẮT ĐẦU CẬP NHẬT VÀ ĐỒNG BỘ VĂN BẢN PHÁP LUẬT 2025 - 2026...');

  // 1. Upsert extra categories to Supabase Cloud
  console.log('\n📁 1. Cập nhật danh mục con lên Supabase...');
  for (const cat of extraCategories) {
    const parentUuid = cat.parent_id ? toUUID(cat.parent_id) : null;
    const catUuid = toUUID(cat.id);
    const { error: catErr } = await supabase.from('categories').upsert({
      id: catUuid,
      parent_id: parentUuid,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      order_index: cat.order_index,
      icon: cat.icon,
      is_active: cat.is_active,
    });
    if (catErr) {
      console.error(`Lỗi tạo danh mục ${cat.name}:`, catErr.message);
    } else {
      console.log(`  + Đã cập nhật danh mục: [${cat.name}]`);
    }
  }

  // 2. Upsert new documents to Supabase Cloud
  console.log('\n📄 2. Đồng bộ văn bản pháp luật mới 2025-2026 lên Supabase...');
  for (const doc of newDocuments) {
    const docUuid = toUUID(doc.id);
    const { error: docErr } = await supabase.from('legal_documents').upsert({
      id: docUuid,
      title: doc.title,
      document_number: doc.document_number,
      document_type: doc.document_type,
      issuing_body: doc.issuing_body,
      signer: doc.signer,
      issued_date: doc.issued_date,
      effective_date: doc.effective_date,
      expiry_date: null,
      status: doc.status,
      html_content: doc.html_content,
      summary_main: doc.summary_main,
      summary_new_points: doc.summary_new_points,
      summary_affected_parties: doc.summary_affected_parties,
      summary_accounting_impact: doc.summary_accounting_impact,
      summary_audit_impact: doc.summary_audit_impact,
      summary_actions_needed: doc.summary_actions_needed,
      summary_is_ai_generated: true,
      is_published: true,
      review_status: 'published',
    });

    if (docErr) {
      console.error(`Lỗi nạp văn bản ${doc.document_number}:`, docErr.message);
    } else {
      console.log(`  + Supabase Cloud: [${doc.document_number}] ${doc.title.slice(0, 50)}...`);
    }

    // Link primary category
    const catUuid = toUUID(doc.category_id);
    await supabase.from('document_category_links').upsert({
      id: toUUID(`${doc.id}->${doc.category_id}`),
      document_id: docUuid,
      category_id: catUuid,
      is_primary: true,
    });

    // Link secondary categories
    if (doc.secondary_category_ids && doc.secondary_category_ids.length > 0) {
      for (const secCatId of doc.secondary_category_ids) {
        await supabase.from('document_category_links').upsert({
          id: toUUID(`${doc.id}->${secCatId}`),
          document_id: docUuid,
          category_id: toUUID(secCatId),
          is_primary: false,
        });
      }
    }
  }

  // 3. Upsert relations to Supabase Cloud
  console.log('\n🔗 3. Thiết lập quan hệ phả hệ văn bản trên Supabase...');
  for (const rel of newRelations) {
    const { error: relErr } = await supabase.from('document_relations').upsert({
      id: toUUID(`${rel.source_document_id}->${rel.target_document_id}`),
      source_document_id: toUUID(rel.source_document_id),
      target_document_id: toUUID(rel.target_document_id),
      relation_type: rel.relation_type,
      notes: rel.notes,
    });
    if (relErr) {
      console.error(`Lỗi quan hệ:`, relErr.message);
    } else {
      console.log(`  + Quan hệ: ${rel.source_document_id} [${rel.relation_type}] ${rel.target_document_id}`);
    }
  }

  console.log('✅ Hoàn tất nạp lên Cloud!');
}

run();
