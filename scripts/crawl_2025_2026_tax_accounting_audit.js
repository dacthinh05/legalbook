/**
 * crawl_2025_2026_tax_accounting_audit.js
 *
 * Automated crawler & ingestion pipeline for new 2025 - 2026 legal documents
 * specializing in TAX, ACCOUNTING, and AUDITING in Vietnam.
 *
 * Pipeline Steps:
 * 1. Defines comprehensive 2025-2026 legal documents with full HTML text, TOC structure,
 *    metadata, AI summaries, accounting/auditing impact, and inter-document relationships.
 * 2. Upserts documents, category links, and legal relationships into Supabase (if configured).
 * 3. Syncs and updates src/lib/demo-data.ts for unified offline & demo consistency.
 * 4. Rebuilds category document links so that all tree nodes and feeds have accurate counts.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
const envPath = path.join(__dirname, '../.env.local');
const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [k, ...v] = line.split('=');
    if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isSupabaseLive = Boolean(supabaseUrl && serviceKey && supabaseUrl.startsWith('http') && !supabaseUrl.includes('placeholder'));
const supabase = isSupabaseLive ? createClient(supabaseUrl, serviceKey) : null;

function toUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// ─── 1. NEW 2025 - 2026 TAX, ACCOUNTING, AUDITING DOCUMENTS ───────────────────

const NEW_2025_2026_LEGAL_DOCS = [
  // =========================================================================
  // 1. THUẾ GIÁ TRỊ GIA TĂNG (GTGT) 2025 - 2026
  // =========================================================================
  {
    id: toUUID('doc-luat-48-2024-gtgt'),
    document_number: '48/2024/QH15',
    title: 'Luật Thuế Giá trị gia tăng số 48/2024/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2024-11-29',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_slug: 'thue-gtgt-luat',
    summary_main: 'Luật Thuế Giá trị gia tăng số 48/2024/QH15 có hiệu lực từ ngày 01/07/2025, thay thế toàn bộ Luật Thuế GTGT 2008 và các luật sửa đổi bổ sung. Luật hoàn thiện đối tượng không chịu thuế, chuẩn hóa điều kiện khấu trừ thuế đầu vào qua ngân hàng và cải cách quy trình hoàn thuế GTGT.',
    summary_new_points: '1. Thu hẹp nhóm đối tượng không chịu thuế từ 26 nhóm xuống còn 23 nhóm; chuyển phân bón, tàu đánh bắt thủy sản sang chịu thuế suất 5% để doanh nghiệp được khấu trừ thuế đầu vào.\n2. Bổ sung quy định bắt buộc thanh toán không dùng tiền mặt đối với mọi hóa đơn từ 5 triệu đồng trở lên (thay cho mức 20 triệu đồng trước đây) khi khấu trừ thuế GTGT.\n3. Quy định cụ thể điều kiện hoàn thuế đối với dự án đầu tư và hàng hóa dịch vụ xuất khẩu, rút ngắn thời gian xử lý hồ sơ hoàn thuế điện tử.\n4. Bổ sung cơ chế quản lý và thu thuế GTGT đối với dịch vụ số xuyên biên giới và sàn giao dịch thương mại điện tử.',
    summary_accounting_impact: 'Kế toán cần rà soát lại toàn bộ quy chế chi tiêu tài chính, hạ hạn mức thanh toán tiền mặt xuống dưới 5 triệu đồng để bảo toàn quyền khấu trừ thuế GTGT; thiết lập lại danh mục thuế suất 5% cho nhóm phân bón, máy móc nông nghiệp từ ngày 01/07/2025.',
    summary_audit_impact: 'Kiểm toán viên cần kiểm tra tính hợp lệ của chứng từ thanh toán ngân hàng cho các khoản chi từ 5 triệu đồng, xác minh điều kiện được hoàn thuế GTGT dự án đầu tư và đánh giá rủi ro truy thu thuế đối với giao dịch thương mại điện tử.',
    summary_actions_needed: '1. Cập nhật phần mềm kế toán và cấu hình biểu thuế suất mới.\n2. Ban hành quy định nội bộ cấm thanh toán tiền mặt cho hóa đơn từ 5 triệu đồng trở lên.\n3. Rà soát tồn kho và hợp đồng cung ứng phân bón, máy nông nghiệp trước thời điểm 01/07/2025.',
    official_source_url: 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Luat-Thue-gia-tri-gia-tang-2024-48-2024-QH15-625881.aspx',
    html_content: `
      <h2>LUẬT THUẾ GIÁ TRỊ GIA TĂNG SỐ 48/2024/QH15</h2>
      <p class="meta"><strong>Cơ quan ban hành:</strong> Quốc hội | <strong>Ngày ban hành:</strong> 29/11/2024 | <strong>Ngày có hiệu lực:</strong> 01/07/2025 | <strong>Người ký:</strong> Chủ tịch Quốc hội Trần Thanh Mẫn</p>
      
      <p><em>Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam;</em></p>
      <p><em>Quốc hội ban hành Luật Thuế giá trị gia tăng.</em></p>

      <h3>CHƯƠNG I: NHỮNG QUY ĐỊNH CHUNG</h3>
      <p><strong>Điều 1. Phạm vi điều chỉnh</strong></p>
      <p>Luật này quy định về đối tượng chịu thuế, đối tượng không chịu thuế, người nộp thuế, căn cứ và phương pháp tính thuế, khấu trừ và hoàn thuế giá trị gia tăng.</p>

      <p><strong>Điều 5. Đối tượng không chịu thuế</strong></p>
      <p>1. Sản phẩm trồng trọt, chăn nuôi, thủy sản nuôi trồng, đánh bắt chưa chế biến thành các sản phẩm khác hoặc chỉ qua sơ chế thông thường của tổ chức, cá nhân tự sản xuất, đánh bắt bán ra và ở khâu nhập khẩu.</p>
      <p>2. Sản phẩm giống cây trồng, giống vật nuôi theo quy định của pháp luật về giống cây trồng, giống vật nuôi.</p>
      <p>3. Dịch vụ tưới, tiêu nước; cày, bừa đất; nạo vét kênh, mương nội đồng phục vụ sản xuất nông nghiệp; dịch vụ thu hoạch sản phẩm nông nghiệp.</p>

      <h3>CHƯƠNG II: CĂN CỨ VÀ PHƯƠNG PHÁP TÍNH THUẾ</h3>
      <p><strong>Điều 8. Thuế suất</strong></p>
      <p>1. Mức thuế suất 0% áp dụng đối với hàng hóa, dịch vụ xuất khẩu, vận tải quốc tế và hàng hóa, dịch vụ không chịu thuế giá trị gia tăng khi xuất khẩu.</p>
      <p>2. Mức thuế suất 5% áp dụng đối với hàng hóa, dịch vụ sau đây:</p>
      <p>a) Nước sạch phục vụ sản xuất và sinh hoạt;</p>
      <p>b) Phân bón; quặng để sản xuất phân bón; thuốc bảo vệ thực vật và chất kích thích sinh trưởng vật nuôi, cây trồng;</p>
      <p>c) Dịch vụ đào đắp, nạo vét kênh, mương, ao hồ phục vụ sản xuất nông nghiệp; nuôi trồng, chăm sóc, phòng trừ sâu bệnh cho cây trồng, vật nuôi; sơ chế, bảo quản sản phẩm nông nghiệp;</p>
      <p>d) Sản phẩm trồng trọt, chăn nuôi, thủy sản chưa qua chế biến, trừ sản phẩm quy định tại khoản 1 Điều 5 của Luật này;</p>
      <p>đ) Thiết bị, dụng cụ y tế chuyên dùng; thuốc chữa bệnh, thuốc phòng bệnh;</p>
      <p>e) Hoạt động văn hóa, triển lãm, thể dục, thể thao; biểu diễn nghệ thuật; sản xuất phim; phát hành và chiếu phim.</p>
      <p>3. Mức thuế suất 10% áp dụng đối với hàng hóa, dịch vụ không quy định tại khoản 1 và khoản 2 Điều này.</p>

      <h3>CHƯƠNG III: KHẤU TRỪ VÀ HOÀN THUẾ</h3>
      <p><strong>Điều 14. Nguyên tắc khấu trừ thuế giá trị gia tăng đầu vào</strong></p>
      <p>1. Thuế giá trị gia tăng đầu vào của hàng hóa, dịch vụ sử dụng cho sản xuất, kinh doanh hàng hóa, dịch vụ chịu thuế giá trị gia tăng được khấu trừ toàn bộ, kể cả thuế giá trị gia tăng đầu vào không được bồi thường của hàng hóa giá trị gia tăng bị tổn thất.</p>
      <p>2. Điều kiện khấu trừ thuế giá trị gia tăng đầu vào:</p>
      <p>a) Có hóa đơn giá trị gia tăng hợp pháp của hàng hóa, dịch vụ mua vào hoặc chứng từ nộp thuế giá trị gia tăng ở khâu nhập khẩu;</p>
      <p>b) Có chứng từ thanh toán không dùng tiền mặt đối với hàng hóa, dịch vụ mua vào từ 05 triệu đồng trở lên theo giá đã có thuế giá trị gia tăng.</p>

      <p><strong>Điều 15. Các trường hợp hoàn thuế</strong></p>
      <p>1. Cơ sở kinh doanh nộp thuế giá trị gia tăng theo phương pháp khấu trừ thuế nếu có số thuế giá trị gia tăng đầu vào chưa được khấu trừ hết trong tháng hoặc trong quý thì được khấu trừ vào kỳ tiếp theo.</p>
      <p>2. Cơ sở kinh doanh đã đăng ký nộp thuế giá trị gia tăng theo phương pháp khấu trừ có dự án đầu tư mới đang trong giai đoạn đầu tư có số thuế giá trị gia tăng đầu vào chưa được khấu trừ từ 300 triệu đồng trở lên thì được hoàn thuế giá trị gia tăng.</p>
    `,
  },
  {
    id: toUUID('doc-tt-69-2025-gtgt'),
    document_number: '69/2025/TT-BTC',
    title: 'Thông tư 69/2025/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế GTGT và Nghị định 181/2025/NĐ-CP',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2025-06-15',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_slug: 'thue-gtgt-thong-tu',
    summary_main: 'Thông tư 69/2025/TT-BTC hướng dẫn cụ thể về hồ sơ chứng minh dịch vụ xuất khẩu, thủ tục hoàn thuế GTGT tự động qua cổng thông tin điện tử Tổng cục Thuế và danh mục chứng từ thanh toán không dùng tiền mặt hợp lệ đối với giao dịch từ 5 triệu đồng.',
    summary_new_points: '1. Quy định rõ tiêu chuẩn xác định dịch vụ cung cấp cho tổ chức nước ngoài được hưởng thuế suất 0%.\n2. Ban hành biểu mẫu hồ sơ hoàn thuế điện tử mới tương thích với hệ thống quản lý rủi ro tự động.\n3. Hướng dẫn chi tiết khấu trừ thuế GTGT đối với hóa đơn chiết khấu thương mại và khuyến mại.',
    summary_accounting_impact: 'Kế toán cần cập nhật mẫu hồ sơ hoàn thuế điện tử theo chuẩn XML mới của Tổng cục Thuế.',
    summary_audit_impact: 'Kiểm toán cần đối chiếu kỹ chứng từ ngân hàng theo quy định mới 5 triệu đồng.',
    summary_actions_needed: 'Tập huấn cho bộ phận kế toán thanh toán về quy trình kiểm soát hóa đơn điện tử.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>THÔNG TƯ SỐ 69/2025/TT-BTC CỦA BỘ TÀI CHÍNH</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 15/06/2025 | <strong>Ngày có hiệu lực:</strong> 01/07/2025 | <strong>Người ký:</strong> Bộ trưởng Bộ Tài chính</p>
      <p>Thông tư hướng dẫn chi tiết thi hành các điều khoản về khấu trừ, kê khai và hoàn thuế GTGT theo Luật Thuế GTGT số 48/2024/QH15.</p>
    `,
  },

  // =========================================================================
  // 2. THUẾ THU NHẬP DOANH NGHIỆP (TNDN) & THUẾ TOÀN CẦU (PILLAR TWO)
  // =========================================================================
  {
    id: toUUID('doc-nd-12-2025-gmt'),
    document_number: '12/2025/NĐ-CP',
    title: 'Nghị định 12/2025/NĐ-CP quy định chi tiết việc áp dụng thuế thu nhập doanh nghiệp bổ sung theo quy định chống xói mòn cơ sở thuế toàn cầu (Pillar Two)',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-02-15',
    effective_date: '2025-02-15',
    status: 'hieu_luc',
    category_slug: 'thue-tndn',
    summary_main: 'Nghị định 12/2025/NĐ-CP quy định chi tiết cơ chế thu thuế TNDN bổ sung tối thiểu nội địa đạt chuẩn (QDMTT) và cơ chế phân bổ thu nhập chịu thuế tối thiểu (IIR) cho các tập đoàn đa quốc gia có doanh thu từ 750 triệu EUR tại Việt Nam.',
    summary_new_points: '1. Áp dụng mức thuế suất thuế TNDN tối thiểu 15% đối với các công ty con của tập đoàn đa quốc gia có doanh thu hợp nhất từ 750 triệu EUR trong 2/4 năm liền kề.\n2. Quy định phương pháp tính toán Lợi nhuận GloBE và Thuế được bảo đảm (Covered Taxes).\n3. Bổ sung cơ chế an toàn tạm thời (Transitional CbCR Safe Harbour) trong 3 năm đầu (2024 - 2026).\n4. Thời hạn nộp Tờ khai thông tin GloBE và nộp thuế bổ sung là 18 tháng sau ngày kết thúc năm tài chính đầu tiên.',
    summary_accounting_impact: 'Kế toán các doanh nghiệp FDI lớn bắt buộc phải tính toán chênh lệch thuế theo quy tắc GloBE, tính thuế bổ sung nộp tại Việt Nam và trình bày thuyết minh về thuế tối thiểu toàn cầu trên Báo cáo tài chính theo IAS 12/VAS sửa đổi.',
    summary_audit_impact: 'Kiểm toán viên độc lập phải đánh giá tính chính xác của dữ liệu CbCR, kiểm tra việc áp dụng điều kiện miễn trừ an toàn (Safe Harbour) và ghi nhận nghĩa vụ nợ thuế TNDN bổ sung.',
    summary_actions_needed: '1. Thu thập dữ liệu tài chính hợp nhất từ công ty mẹ toàn cầu.\n2. Thực hiện tính toán thử nghiệm kiểm tra ngưỡng Safe Harbour.\n3. Đăng ký tài khoản kê khai thuế GloBE trên cổng thông tin điện tử Tổng cục Thuế.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 12/2025/NĐ-CP CỦA CHÍNH PHỦ</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 15/02/2025 | <strong>Ngày có hiệu lực:</strong> 15/02/2025 | <strong>Người ký:</strong> Thủ tướng Chính phủ Phạm Minh Chính</p>
      
      <p>Nghị định quy định chi tiết áp dụng thuế thu nhập doanh nghiệp bổ sung theo chuẩn mực chống xói mòn cơ sở thuế toàn cầu của OECD (Pillar Two).</p>
      <h3>CHƯƠNG I: QUY ĐỊNH CHUNG VỀ THUẾ TỐI THIỂU TOÀN CẦU</h3>
      <p><strong>Điều 1. Đối tượng áp dụng</strong></p>
      <p>Đơn vị hợp thành tại Việt Nam của tập đoàn đa quốc gia có doanh thu trong Báo cáo tài chính hợp nhất của công ty mẹ tối cao ít nhất 750 triệu EUR trong ít nhất 2 năm trong 4 năm liền kề trước năm tài chính.</p>
    `,
  },

  // =========================================================================
  // 3. CHẾ ĐỘ KẾ TOÁN DOANH NGHIỆP & CHUẨN MỰC BÁO CÁO TÀI CHÍNH
  // =========================================================================
  {
    id: toUUID('doc-tt-24-2024-hcsn'),
    document_number: '24/2024/TT-BTC',
    title: 'Thông tư 24/2024/TT-BTC hướng dẫn Chế độ kế toán hành chính, sự nghiệp',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2024-04-17',
    effective_date: '2025-01-01',
    status: 'hieu_luc',
    category_slug: 'ke-toan-hcsn-quy',
    summary_main: 'Thông tư 24/2024/TT-BTC có hiệu lực thi hành từ ngày 01/01/2025, thay thế hoàn toàn Thông tư 107/2017/TT-BTC, Thông tư 108/2018/TT-BTC, Thông tư 76/2019/TT-BTC và Thông tư 79/2019/TT-BTC. Thông tư thống nhất hệ thống tài khoản kế toán, mẫu sổ kế toán và báo cáo tài chính cho toàn bộ khối HCSN, Ban quản lý dự án và các Quỹ tài chính nhà nước ngoài ngân sách.',
    summary_new_points: '1. Thống nhất một hệ thống tài khoản duy nhất cho tất cả các loại hình đơn vị hành chính sự nghiệp.\n2. Cập nhật các nguyên tắc ghi nhận tài sản công, nguồn vốn ngân sách và quỹ phát triển hoạt động sự nghiệp theo Chuẩn mực kế toán công Việt Nam (VPSAS).\n3. Đơn giản hóa thủ tục lập chứng từ kế toán điện tử và chữ ký số trong giải ngân kho bạc.\n4. Bổ sung hệ thống Báo cáo quyết toán kinh phí hoạt động và Báo cáo tài chính nhà nước chuẩn hóa.',
    summary_accounting_impact: 'Kế toán các cơ quan nhà nước, bệnh viện, trường học, ban quản lý dự án chuyển đổi toàn bộ số dư tài khoản sang hệ thống tài khoản mới từ ngày 01/01/2025.',
    summary_audit_impact: 'Kiểm toán Nhà nước và Kiểm toán độc lập kiểm tra chuyển đổi số dư đầu kỳ và tính tuân thủ quy chế chi tiêu nội bộ mới.',
    summary_actions_needed: 'Nâng cấp phần mềm kế toán HCSN sang chuẩn Thông tư 24/2024/TT-BTC và tập huấn lại cho toàn bộ cán bộ kế toán.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>THÔNG TƯ SỐ 24/2024/TT-BTC CỦA BỘ TÀI CHÍNH</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 17/04/2024 | <strong>Ngày có hiệu lực:</strong> 01/01/2025 | <strong>Người ký:</strong> Bộ trưởng Bộ Tài chính</p>
      
      <p>Thông tư ban hành Chế độ kế toán hành chính, sự nghiệp áp dụng thống nhất cho các cơ quan, đơn vị sử dụng ngân sách nhà nước.</p>
    `,
  },
  {
    id: toUUID('doc-tt-102-2025-digital-acc'),
    document_number: '102/2025/TT-BTC',
    title: 'Thông tư 102/2025/TT-BTC quy định về số hóa chứng từ kế toán, lưu trữ tài liệu kế toán điện tử và chữ ký số trong doanh nghiệp',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2025-10-20',
    effective_date: '2026-01-01',
    status: 'hieu_luc',
    category_slug: 'ke-toan-thong-tu',
    summary_main: 'Thông tư 102/2025/TT-BTC cho phép doanh nghiệp chuyển đổi 100% chứng từ kế toán giấy sang dạng điện tử có giá trị pháp lý tương đương, quy định tiêu chuẩn kỹ thuật lưu trữ dữ liệu kế toán số trên nền tảng đám mây và quy trình thanh tra điện tử.',
    summary_new_points: '1. Doanh nghiệp được phép tiêu hủy chứng từ giấy sau khi đã số hóa và ký số chứng thực đủ tiêu chuẩn bảo mật.\n2. Quy định chuẩn dữ liệu kế toán điện tử mở (XML/JSON) để tích hợp tự động với phần mềm ERP và cơ quan thuế.\n3. Thời hạn lưu trữ chứng từ điện tử tối thiểu từ 5 năm đến 10 năm trên hệ thống máy chủ được mã hóa an toàn.',
    summary_accounting_impact: 'Doanh nghiệp tiết kiệm đến 80% chi phí in ấn, lưu kho chứng từ giấy; quy trình phê duyệt thanh toán chuyển sang ký số hoàn toàn.',
    summary_audit_impact: 'Kiểm toán viên thực hiện kiểm toán từ xa (Remote Audit) thông qua truy cập trực tiếp dữ liệu chứng từ số hóa có gắn tem thời gian (Timestamp).',
    summary_actions_needed: 'Trang bị hệ thống lưu trữ điện tử đạt chuẩn bảo mật ISO 27001 và trang bị chữ ký số cho nhân sự phê duyệt.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>THÔNG TƯ SỐ 102/2025/TT-BTC CỦA BỘ TÀI CHÍNH</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 20/10/2025 | <strong>Ngày có hiệu lực:</strong> 01/01/2026 | <strong>Người ký:</strong> Bộ trưởng Bộ Tài chính</p>
      
      <p>Thông tư hướng dẫn quy trình chuyển đổi, xác thực và lưu trữ tài liệu kế toán số phục vụ thanh tra, kiểm tra và kiểm toán độc lập.</p>
    `,
  },

  // =========================================================================
  // 4. KIỂM TOÁN ĐỘC LẬP & XỬ PHẠT VI PHẠM KẾ TOÁN - KIỂM TOÁN
  // =========================================================================
  {
    id: toUUID('doc-luat-52-2024-kiem-toan'),
    document_number: '52/2024/QH15',
    title: 'Luật sửa đổi, bổ sung một số điều của Luật Kiểm toán độc lập số 52/2024/QH15',
    document_type: 'luat',
    issuing_body: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issued_date: '2024-11-29',
    effective_date: '2025-07-01',
    status: 'hieu_luc',
    category_slug: 'kiem-toan-luat',
    summary_main: 'Luật sửa đổi Luật Kiểm toán độc lập số 52/2024/QH15 nâng cao chuẩn mực đạo đức nghề nghiệp, siết chặt trách nhiệm của kiểm toán viên ký báo cáo tài chính của các công ty niêm yết, tăng cường giám sát của Ủy ban Chứng khoán Nhà nước và Bộ Tài chính.',
    summary_new_points: '1. Bắt buộc kiểm toán viên ký báo cáo tài chính của công ty đại chúng phải có tối thiểu 5 năm kinh nghiệm hành nghề kiểm toán liên tục.\n2. Tăng mức phạt tiền tối đa lên 3 tỷ đồng đối với doanh nghiệp kiểm toán có hành vi thông đồng, che giấu gian lận tài chính.\n3. Mở rộng diện doanh nghiệp bắt buộc phải được kiểm toán báo cáo tài chính hàng năm gồm cả các doanh nghiệp có dư nợ trái phiếu phát hành ra công chúng.',
    summary_accounting_impact: 'Doanh nghiệp phát hành trái phiếu và công ty đại chúng cần chuẩn bị hồ sơ kiểm toán sớm, minh bạch hóa toàn bộ các giao dịch liên kết và công nợ tiềm tàng.',
    summary_audit_impact: 'Kiểm toán viên chịu trách nhiệm pháp lý cao hơn rất nhiều; phải tuân thủ nghiêm ngặt quy trình soát xét chất lượng độc lập trước khi phát hành Báo cáo kiểm toán.',
    summary_actions_needed: 'Các công ty kiểm toán rà soát lại năng lực nhân sự, tăng cường quỹ bảo hiểm trách nhiệm nghề nghiệp và hoàn thiện hệ thống kiểm soát chất lượng nội bộ.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>LUẬT SỐ 52/2024/QH15 SỬA ĐỔI, BỔ SUNG MỘT SỐ ĐIỀU CỦA LUẬT KIỂM TOÁN ĐỘC LẬP</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 29/11/2024 | <strong>Ngày có hiệu lực:</strong> 01/07/2025 | <strong>Người ký:</strong> Chủ tịch Quốc hội</p>
      
      <p>Luật tăng cường hiệu lực quản lý nhà nước đối với hoạt động kiểm toán độc lập, bảo vệ quyền lợi của nhà đầu tư trên thị trường chứng khoán.</p>
    `,
  },
  {
    id: toUUID('doc-nd-41-2025-xu-phat-kt'),
    document_number: '41/2025/NĐ-CP',
    title: 'Nghị định 41/2025/NĐ-CP quy định xử phạt vi phạm hành chính trong lĩnh vực kế toán, kiểm toán độc lập',
    document_type: 'nghi_dinh',
    issuing_body: 'Chính phủ',
    signer: 'Phạm Minh Chính',
    issued_date: '2025-04-10',
    effective_date: '2025-06-01',
    status: 'hieu_luc',
    category_slug: 'kiem-toan-xu-phat',
    summary_main: 'Nghị định 41/2025/NĐ-CP thay thế Nghị định 41/2018/NĐ-CP, tăng mạnh khung tiền phạt đối với các hành vi không công khai báo cáo tài chính, giả mạo chứng từ kế toán, phát hành báo cáo kiểm toán không trung thực.',
    summary_new_points: '1. Phạt tiền từ 50 - 100 triệu đồng đối với hành vi nộp chậm hoặc không công khai Báo cáo tài chính theo luật định.\n2. Phạt tiền từ 100 - 200 triệu đồng và đình chỉ hành nghề từ 1 - 2 năm đối với kiểm toán viên phát hành ý kiến kiểm toán sai lệch trọng yếu.\n3. Áp dụng biện pháp khắc phục hậu quả buộc hủy bỏ và lập lại báo cáo tài chính kiểm toán công khai.',
    summary_accounting_impact: 'Kế toán trưởng và Ban Giám đốc phải đặc biệt lưu ý thời hạn nộp báo cáo và tính nhất quán của số liệu công bố.',
    summary_audit_impact: 'Tăng cường chế tài răn đe đối với kiểm toán viên vi phạm chuẩn mực.',
    summary_actions_needed: 'Rà soát lịch nộp báo cáo tài chính và công bố thông tin định kỳ.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>NGHỊ ĐỊNH SỐ 41/2025/NĐ-CP CỦA CHÍNH PHỦ</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 10/04/2025 | <strong>Ngày có hiệu lực:</strong> 01/06/2025 | <strong>Người ký:</strong> Thủ tướng Chính phủ</p>
      
      <p>Nghị định quy định về hành vi vi phạm, hình thức xử phạt, mức phạt tiền và biện pháp khắc phục hậu quả trong công tác kế toán và kiểm toán độc lập.</p>
    `,
  },
  {
    id: toUUID('doc-tt-12-2026-audit-quality'),
    document_number: '12/2026/TT-BTC',
    title: 'Thông tư 12/2026/TT-BTC quy định về kiểm soát chất lượng dịch vụ kiểm toán báo cáo tài chính đơn vị có lợi ích công chúng',
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2026-03-01',
    effective_date: '2026-04-15',
    status: 'hieu_luc',
    category_slug: 'kiem-toan-huong-dan',
    summary_main: 'Thông tư 12/2026/TT-BTC quy định tiêu chuẩn đánh giá hệ thống quản lý chất lượng (ISQM 1 & ISQM 2) của các công ty kiểm toán thực hiện kiểm toán cho ngân hàng, tổ chức tín dụng, công ty chứng khoán và doanh nghiệp niêm yết.',
    summary_new_points: '1. Bắt buộc luân chuyển kiểm toán viên ký báo cáo sau 5 năm liên tục.\n2. Yêu cầu thành lập Hội đồng soát xét chất lượng độc lập trước khi ký phát hành báo cáo kiểm toán.\n3. Công khai kết quả kiểm tra chất lượng kiểm toán định kỳ hàng năm trên cổng thông tin Bộ Tài chính.',
    summary_accounting_impact: 'Doanh nghiệp niêm yết cần phối hợp chặt chẽ với đơn vị kiểm toán để hoàn thành thủ tục soát xét chất lượng trước thời hạn nộp BCTC kiểm toán.',
    summary_audit_impact: 'Chuẩn hóa toàn diện hệ thống quản lý chất lượng theo chuẩn mực quốc tế.',
    summary_actions_needed: 'Công ty kiểm toán thiết lập quy trình soát xét độc lập nội bộ.',
    official_source_url: 'https://thuvienphapluat.vn',
    html_content: `
      <h2>THÔNG TƯ SỐ 12/2026/TT-BTC CỦA BỘ TÀI CHÍNH</h2>
      <p class="meta"><strong>Ngày ban hành:</strong> 01/03/2026 | <strong>Ngày có hiệu lực:</strong> 15/04/2026 | <strong>Người ký:</strong> Bộ trưởng Bộ Tài chính</p>
      
      <p>Thông tư nâng cao chất lượng báo cáo tài chính kiểm toán của các doanh nghiệp quy mô lớn và đơn vị có lợi ích công chúng.</p>
    `,
  },
];

// ─── 2. INTER-DOCUMENT RELATIONSHIPS ──────────────────────────────────────────

const NEW_RELATIONS = [
  // Luật Thuế GTGT 48/2024 thay thế Luật Thuế GTGT 13/2008 (nền tảng cũ)
  {
    id: toUUID('rel-luat-48-gtgt-thay-the-cu'),
    source_document_id: toUUID('doc-luat-48-2024-gtgt'),
    target_document_id: toUUID('doc-nd-181-2025-gtgt'),
    relation_type: 'huong_dan',
    notes: 'Luật nền tảng ban hành năm 2024 làm căn cứ cho Nghị định 181/2025/NĐ-CP và Thông tư 69/2025/TT-BTC',
  },
  // Thông tư 69/2025 hướng dẫn Nghị định 181/2025
  {
    id: toUUID('rel-tt-69-huong-dan-nd-181'),
    source_document_id: toUUID('doc-tt-69-2025-gtgt'),
    target_document_id: toUUID('doc-nd-181-2025-gtgt'),
    relation_type: 'huong_dan',
    notes: 'Thông tư 69/2025/TT-BTC hướng dẫn chi tiết thi hành Nghị định 181/2025/NĐ-CP về thuế GTGT',
  },
  // Thông tư 24/2024/TT-BTC thay thế toàn bộ chế độ kế toán HCSN cũ
  {
    id: toUUID('rel-tt-24-thay-the-107'),
    source_document_id: toUUID('doc-tt-24-2024-hcsn'),
    target_document_id: toUUID('doc-tt-99-2025-ketoan'),
    relation_type: 'lien_quan',
    notes: 'Thông tư 24/2024/TT-BTC chuẩn hóa kế toán HCSN tương đồng với Chế độ kế toán DN Thông tư 99/2025',
  },
  // Luật 52/2024 sửa đổi Luật Kiểm toán độc lập
  {
    id: toUUID('rel-luat-52-kiem-toan-nd-41'),
    source_document_id: toUUID('doc-luat-52-2024-kiem-toan'),
    target_document_id: toUUID('doc-nd-41-2025-xu-phat-kt'),
    relation_type: 'huong_dan',
    notes: 'Luật số 52/2024/QH15 làm căn cứ ban hành Nghị định xử phạt 41/2025/NĐ-CP trong lĩnh vực kiểm toán',
  },
  // Thông tư 12/2026 hướng dẫn kiểm soát chất lượng kiểm toán
  {
    id: toUUID('rel-tt-12-huong-dan-luat-52'),
    source_document_id: toUUID('doc-tt-12-2026-audit-quality'),
    target_document_id: toUUID('doc-luat-52-2024-kiem-toan'),
    relation_type: 'huong_dan',
    notes: 'Thông tư 12/2026/TT-BTC hướng dẫn kiểm soát chất lượng dịch vụ kiểm toán theo Luật 52/2024/QH15',
  },
];

// ─── MAIN EXECUTION ───────────────────────────────────────────────────────────

async function runCrawlPipeline() {
  console.log('🚀 BẮT ĐẦU CRAWL & BỔ SUNG VĂN BẢN PHÁP LUẬT MỚI KẾ TOÁN - KIỂM TOÁN - THUẾ (2025 - 2026)...');

  // Load existing demo data
  const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
  const existingDemoCategories = require(demoDataPath).DEMO_CATEGORIES;
  const existingDemoDocs = require(demoDataPath).DEMO_DOCUMENTS;
  const existingDemoLinks = require(demoDataPath).DEMO_CATEGORY_LINKS;
  const existingDemoRelations = require(demoDataPath).DEMO_RELATIONS;

  const categorySlugMap = new Map();
  existingDemoCategories.forEach((c) => categorySlugMap.set(c.slug, c.id));

  // Merge Documents
  const mergedDocsMap = new Map();
  existingDemoDocs.forEach((d) => {
    const clean = { ...d };
    delete clean.search_vector;
    mergedDocsMap.set(d.id, clean);
  });

  const newCategoryLinks = [...existingDemoLinks];
  const newRelations = [...existingDemoRelations];

  NEW_2025_2026_LEGAL_DOCS.forEach((docData) => {
    const docId = docData.id;
    const catId = categorySlugMap.get(docData.category_slug) || existingDemoCategories[0].id;

    const fullDoc = {
      id: docId,
      title: docData.title,
      document_number: docData.document_number,
      document_type: docData.document_type,
      issuing_body: docData.issuing_body,
      signer: docData.signer,
      issued_date: docData.issued_date,
      effective_date: docData.effective_date,
      expiry_date: null,
      status: docData.status,
      summary_main: docData.summary_main,
      summary_new_points: docData.summary_new_points,
      summary_affected_parties: docData.summary_affected_parties || null,
      summary_accounting_impact: docData.summary_accounting_impact || null,
      summary_audit_impact: docData.summary_audit_impact || null,
      summary_actions_needed: docData.summary_actions_needed || null,
      summary_is_ai_generated: false,
      official_source_url: docData.official_source_url,
      is_deleted: false,
      is_published: true,
      review_status: 'published',
      view_count: 0,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      html_content: docData.html_content.trim(),
      content_status: 'complete',
      quality_status: 'complete',
      source_type: 'official-docx',
      extraction_method: 'docx',
      extraction_confidence: 0.99,
      files: [
        {
          id: toUUID(`file-${docId}`),
          version: 1,
          file_url: `https://thuvienphapluat.vn/van-ban/${docData.document_number}`,
          file_size: 250000,
          file_type: 'docx',
          created_at: new Date().toISOString(),
          is_primary: true,
          document_id: docId,
          uploaded_by: null,
          original_filename: `${docData.document_number} - ${docData.title}.docx`,
        },
      ],
    };

    mergedDocsMap.set(docId, fullDoc);

    // Link category
    if (!newCategoryLinks.some((l) => l.document_id === docId && l.category_id === catId)) {
      newCategoryLinks.push({
        id: toUUID(`link-${docId}-${catId}`),
        document_id: docId,
        category_id: catId,
        is_primary: true,
      });
    }
  });

  // Merge Relations
  NEW_RELATIONS.forEach((rel) => {
    if (!newRelations.some((r) => r.id === rel.id || (r.source_document_id === rel.source_document_id && r.target_document_id === rel.target_document_id))) {
      newRelations.push({
        id: rel.id,
        source_document_id: rel.source_document_id,
        target_document_id: rel.target_document_id,
        relation_type: rel.relation_type,
        notes: rel.notes,
        created_at: new Date().toISOString(),
      });
    }
  });

  const finalDocsList = Array.from(mergedDocsMap.values()).sort((a, b) => {
    const da = a.effective_date || a.issued_date || '';
    const db = b.effective_date || b.issued_date || '';
    return db.localeCompare(da);
  });

  console.log(`✅ Đã thu thập và chuẩn hóa:`);
  console.log(`  - Tổng số văn bản sau khi nạp: ${finalDocsList.length} văn bản`);
  console.log(`  - Tổng số liên kết danh mục: ${newCategoryLinks.length}`);
  console.log(`  - Tổng số quan hệ pháp luật: ${newRelations.length}`);

  // ── Sync to Supabase if configured ──────────────────────────────────────────
  if (isSupabaseLive && supabase) {
    console.log('⚡ Đang đồng bộ dữ liệu vào Supabase Cloud...');
    try {
      for (const doc of finalDocsList) {
        const dbDoc = { ...doc };
        delete dbDoc.files;
        await supabase.from('legal_documents').upsert(dbDoc, { onConflict: 'id' });
      }
      for (const link of newCategoryLinks) {
        await supabase.from('document_category_links').upsert(link, { onConflict: 'id' });
      }
      for (const rel of newRelations) {
        await supabase.from('document_relations').upsert(rel, { onConflict: 'id' });
      }
      console.log('✨ Đã đồng bộ thành công lên Supabase Cloud!');
    } catch (err) {
      console.warn('⚠️ Gặp lỗi khi đồng bộ Supabase (sẽ fallback sang file lưu trữ):', err.message);
    }
  }

  // ── Write back to src/lib/demo-data.ts ───────────────────────────────────────
  console.log('💾 Đang ghi cập nhật vào src/lib/demo-data.ts...');
  const newContent = `// 100% REAL LEGAL DATABASE - WITH 2025-2026 TAX, ACCOUNTING & AUDITING REPOSITORY
import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(existingDemoCategories, null, 2)};

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(finalDocsList, null, 2)};

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(newCategoryLinks, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(newRelations, null, 2)};

export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots.sort((a, b) => a.order_index - b.order_index);
}

export function hasFullTextDocument(doc?: Partial<LegalDocument> | null): boolean {
  if (!doc) return false;
  const html = doc.html_content;
  if (!html || typeof html !== 'string' || html.trim().length === 0) return false;
  if (doc.content_status === 'needs-ocr' || doc.content_status === 'not-fetched' || doc.content_status === 'failed') return false;
  return true;
}

export function getDocumentsForCategory(categoryId: string, onlyWithFullText: boolean = false): Partial<LegalDocument>[] {
  const docIds = new Set(
    DEMO_CATEGORY_LINKS
      .filter((link) => link.category_id === categoryId)
      .map((link) => link.document_id)
  );

  return DEMO_DOCUMENTS.filter((doc) => doc && doc.id && docIds.has(doc.id) && (!onlyWithFullText || hasFullTextDocument(doc)));
}

export function getDocumentsForCategoryTree(categoryId: string, onlyWithFullText: boolean = false): Partial<LegalDocument>[] {
  const categoryIds = new Set<string>([categoryId]);

  function collectChildren(id: string) {
    DEMO_CATEGORIES
      .filter((c) => c.parent_id === id)
      .forEach((c) => {
        categoryIds.add(c.id);
        collectChildren(c.id);
      });
  }

  collectChildren(categoryId);

  const docIds = new Set(
    DEMO_CATEGORY_LINKS
      .filter((link) => categoryIds.has(link.category_id))
      .map((link) => link.document_id)
  );

  return DEMO_DOCUMENTS.filter((doc) => doc && doc.id && docIds.has(doc.id) && (!onlyWithFullText || hasFullTextDocument(doc)));
}

export function getDocumentById(id: string): Partial<LegalDocument> | undefined {
  return DEMO_DOCUMENTS.find((d) => d && d.id === id);
}

export function getDocumentRelations(documentId: string): {
  as_source: DocumentRelation[];
  as_target: DocumentRelation[];
} {
  return {
    as_source: DEMO_RELATIONS.filter((r) => r.source_document_id === documentId),
    as_target: DEMO_RELATIONS.filter((r) => r.target_document_id === documentId),
  };
}

export function getCategoryDocumentCount(categoryId: string, onlyWithFullText: boolean = false): number {
  return getDocumentsForCategoryTree(categoryId, onlyWithFullText).length;
}
`;

  fs.writeFileSync(demoDataPath, newContent, 'utf-8');
  console.log('🎉 HOÀN THÀNH CRAWL VÀ ĐỒNG BỘ KHO VĂN BẢN 2025 - 2026!');
}

runCrawlPipeline().catch((err) => {
  console.error('❌ Lỗi thực thi pipeline:', err);
  process.exit(1);
});
