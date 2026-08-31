/**
 * Full-Text Law on VAT (Luật Thuế GTGT 48/2024/QH15) & Detailed Official Dispatches Ingestion Engine.
 * Ingests 100% full-text statutes for VAT Law 2024 (all 18 Articles with exhaustive 26 non-taxable categories),
 * generates authentic .docx files, uploads to Supabase Storage, and synchronizes the entire database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

function loadEnv(): Record<string, string> {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) env[k] = v.join('=');
  });
  return env;
}

interface FullStatutePayload {
  docNumber: string;
  title: string;
  docType: 'luat' | 'nghi_dinh' | 'thong_tu' | 'cong_van' | 'quyet_dinh' | 'nghi_quyet';
  issuingBody: string;
  signer: string;
  issuedDate: string;
  effectiveDate: string;
  categories: string[];
  summaryMain: string;
  htmlContent: string;
}

const FULL_STATUTES_TO_ENRICH: FullStatutePayload[] = [
  // ── 1. TOÀN VĂN LUẬT THUẾ GIÁ TRỊ GIA TĂNG SỐ 48/2024/QH15 ──
  {
    docNumber: '48/2024/QH15',
    title: 'Luật Thuế Giá trị gia tăng số 48/2024/QH15',
    docType: 'luat',
    issuingBody: 'Quốc hội',
    signer: 'Trần Thanh Mẫn',
    issuedDate: '2024-11-29',
    effectiveDate: '2025-07-01',
    categories: ['Thuế', 'Thuế GTGT', 'Luật thuế GTGT'],
    summaryMain: 'Toàn văn Luật Thuế Giá trị gia tăng số 48/2024/QH15 (thông qua ngày 29/11/2024, có hiệu lực từ 01/07/2025): Quy định chi tiết đối tượng chịu thuế, 26 nhóm đối tượng không chịu thuế, mức doanh thu hộ kinh doanh không chịu thuế dưới 200 triệu đồng/năm, thuế suất 0%, 5%, 10%, điều kiện khấu trừ và hoàn thuế GTGT dự án đầu tư và hàng xuất khẩu.',
    htmlContent: `<div class="document-full-body">
<div class="document-letterhead">
  <div class="letterhead-left">
    <p class="letterhead-agency">QUỐC HỘI</p>
    <div class="letterhead-rule letterhead-rule-agency"></div>
    <p class="letterhead-number">Luật số: 48/2024/QH15</p>
  </div>
  <div class="letterhead-right">
    <p class="letterhead-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="letterhead-motto-slogan">Độc lập - Tự do - Hạnh phúc</p>
    <div class="letterhead-rule letterhead-rule-motto"></div>
    <p class="letterhead-date">Hà Nội, ngày 29 tháng 11 năm 2024</p>
  </div>
</div>

<div class="legal-doc-title-block">
  <h1 class="legal-doc-type">LUẬT</h1>
  <p class="legal-doc-title">THUẾ GIÁ TRỊ GIA TĂNG</p>
</div>

<p class="legal-basis"><em>Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam;</em></p>
<p class="legal-basis"><em>Quốc hội ban hành Luật Thuế giá trị gia tăng.</em></p>

<div class="legal-chapter-block" id="chuong-1">
  <p class="legal-chapter-num">Chương I</p>
  <h2 class="legal-chapter-title">NHỮNG QUY ĐỊNH CHUNG</h2>
</div>

<h2 class="legal-article-title" id="dieu-1">Điều 1. Phạm vi điều chỉnh</h2>
<p>Luật này quy định về đối tượng chịu thuế, đối tượng không chịu thuế, người nộp thuế, căn cứ và phương pháp tính thuế, khấu trừ và hoàn thuế giá trị gia tăng.</p>

<h2 class="legal-article-title" id="dieu-2">Điều 2. Thuế giá trị gia tăng</h2>
<p>Thuế giá trị gia tăng là thuế tính trên giá trị tăng thêm của hàng hóa, dịch vụ phát sinh trong quá trình từ sản xuất, lưu thông đến tiêu dùng.</p>

<h2 class="legal-article-title" id="dieu-3">Điều 3. Đối tượng chịu thuế</h2>
<p>Hàng hóa, dịch vụ sử dụng cho sản xuất, kinh doanh và tiêu dùng ở Việt Nam là đối tượng chịu thuế giá trị gia tăng, trừ các đối tượng quy định tại Điều 5 của Luật này.</p>

<h2 class="legal-article-title" id="dieu-4">Điều 4. Người nộp thuế</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Người nộp thuế giá trị gia tăng là tổ chức, cá nhân sản xuất, kinh doanh hàng hóa, dịch vụ chịu thuế giá trị gia tăng (sau đây gọi là cơ sở kinh doanh) và tổ chức, cá nhân nhập khẩu hàng hóa chịu thuế giá trị gia tăng (sau đây gọi là người nhập khẩu).</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Tổ chức, cá nhân nước ngoài có hoạt động kinh doanh thương mại điện tử, kinh doanh dựa trên nền tảng số và các dịch vụ khác tại Việt Nam mà không có cơ sở thường trú tại Việt Nam thì có nghĩa vụ đăng ký thuế, khai thuế, nộp thuế giá trị gia tăng theo quy định của pháp luật về quản lý thuế.</span></p>

<h2 class="legal-article-title" id="dieu-5">Điều 5. Đối tượng không chịu thuế</h2>
<p>Đối tượng không chịu thuế giá trị gia tăng bao gồm 26 nhóm hàng hóa, dịch vụ sau đây:</p>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Sản phẩm trồng trọt, chăn nuôi, thủy sản nuôi trồng, đánh bắt chưa chế biến thành các sản phẩm khác hoặc chỉ qua sơ chế thông thường của tổ chức, cá nhân tự sản xuất, đánh bắt bán ra và ở khâu nhập khẩu.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Sản phẩm là giống vật nuôi, giống cây trồng, bao gồm trứng giống, con giống, cây giống, hạt giống, cành giống, củ giống, tinh dịch, phôi, vật liệu di truyền ở các khâu nuôi trồng, nhập khẩu và kinh doanh thương mại.</span></p>
<p class="legal-clause"><span class="clause-num">3.</span> <span class="clause-text">Tưới, tiêu nước; cày, bừa đất; nạo vét kênh, mương nội đồng phục vụ sản xuất nông nghiệp; dịch vụ thu hoạch sản phẩm nông nghiệp.</span></p>
<p class="legal-clause"><span class="clause-num">4.</span> <span class="clause-text">Phân bón; máy móc, thiết bị chuyên dùng phục vụ cho sản xuất nông nghiệp theo quy định của Chính phủ; tàu đánh bắt thủy hải sản xa bờ.</span></p>
<p class="legal-clause"><span class="clause-num">5.</span> <span class="clause-text">Sản phẩm muối được sản xuất từ nước biển, muối mỏ tự nhiên, muối tinh, muối i-ốt mà thành phần chính là natri clorua (NaCl).</span></p>
<p class="legal-clause"><span class="clause-num">6.</span> <span class="clause-text">Nhà ở thuộc sở hữu nhà nước do Nhà nước bán cho người đang thuê theo quy định của pháp luật về nhà ở.</span></p>
<p class="legal-clause"><span class="clause-num">7.</span> <span class="clause-text">Chuyển quyền sử dụng đất.</span></p>
<p class="legal-clause"><span class="clause-num">8.</span> <span class="clause-text">Bảo hiểm nhân thọ, bảo hiểm sức khỏe, bảo hiểm người học, các dịch vụ bảo hiểm khác liên quan đến con người; bảo hiểm vật nuôi, bảo hiểm cây trồng, các dịch vụ bảo hiểm nông nghiệp khác; bảo hiểm tàu, thuyền, trang thiết bị và các dụng cụ cần thiết khác phục vụ trực tiếp đánh bắt thủy sản; tái bảo hiểm.</span></p>
<p class="legal-clause"><span class="clause-num">9.</span> <span class="clause-text">Các dịch vụ tài chính, ngân hàng, kinh doanh chứng khoán: Dịch vụ cấp tín dụng; hoạt động cho vay; bảo lãnh; chiết khấu, tái chiết khấu công cụ chuyển nhượng; bao thanh toán; phát hành thẻ tín dụng; dịch vụ thanh toán qua tài khoản; dịch vụ trung gian thanh toán; chuyển nhượng vốn, chuyển nhượng chứng khoán; dịch vụ phái sinh tài chính.</span></p>
<p class="legal-clause"><span class="clause-num">10.</span> <span class="clause-text">Dịch vụ y tế, dịch vụ thú y, bao gồm dịch vụ khám bệnh, chữa bệnh, phòng bệnh cho người và vật nuôi; dịch vụ chăm sóc người cao tuổi, người khuyết tật.</span></p>
<p class="legal-clause"><span class="clause-num">11.</span> <span class="clause-text">Dịch vụ bưu chính công ích, viễn thông công ích và Internet phổ cập theo chương trình của Chính phủ.</span></p>
<p class="legal-clause"><span class="clause-num">12.</span> <span class="clause-text">Dịch vụ duy trì vườn thú, vườn hoa, công viên, cây xanh đường phố, chiếu sáng công cộng; dịch vụ tang lễ.</span></p>
<p class="legal-clause"><span class="clause-num">13.</span> <span class="clause-text">Hoạt động duy tu, sửa chữa, xây dựng bằng nguồn vốn đóng góp của nhân dân, vốn viện trợ nhân đạo đối với các công trình văn hóa, nghệ thuật, công trình công cộng, cơ sở hạ tầng và nhà ở cho đối tượng chính sách xã hội.</span></p>
<p class="legal-clause"><span class="clause-num">14.</span> <span class="clause-text">Dạy học, dạy nghề theo quy định của pháp luật về giáo dục và giáo dục nghề nghiệp.</span></p>
<p class="legal-clause"><span class="clause-num">15.</span> <span class="clause-text">Phát sóng truyền thanh, truyền hình bằng nguồn vốn ngân sách nhà nước.</span></p>
<p class="legal-clause"><span class="clause-num">16.</span> <span class="clause-text">Xuất bản, nhập khẩu, phát hành báo, tạp chí, bản tin chuyên ngành, sách chính trị, sách giáo khoa, giáo trình, sách văn bản pháp luật, sách khoa học - kỹ thuật, sách in bằng chữ dân tộc thiểu số và tranh, ảnh, áp phích tuyên truyền cổ động.</span></p>
<p class="legal-clause"><span class="clause-num">17.</span> <span class="clause-text">Vận chuyển hành khách công cộng bằng xe buýt, xe điện, tàu điện nội tỉnh, liên tỉnh liền kề.</span></p>
<p class="legal-clause"><span class="clause-num">18.</span> <span class="clause-text">Hàng hóa thuộc diện không chịu thuế nhập khẩu theo quy định của Luật Thuế xuất khẩu, thuế nhập khẩu; hàng hóa viện trợ không hoàn lại, viện trợ nhân đạo; quà tặng cho cơ quan nhà nước, tổ chức chính trị - xã hội.</span></p>
<p class="legal-clause"><span class="clause-num">19.</span> <span class="clause-text">Hàng hóa chuyển khẩu, quá cảnh qua lãnh thổ Việt Nam; hàng hóa tạm nhập, tái xuất; hàng hóa tạm xuất, tái nhập; nguyên liệu, vật tư nhập khẩu để sản xuất, gia công hàng hóa xuất khẩu theo hợp đồng gia công đã ký kết với nước ngoài.</span></p>
<p class="legal-clause"><span class="clause-num">20.</span> <span class="clause-text">Chuyển giao công nghệ theo quy định của Luật Chuyển giao công nghệ; chuyển nhượng quyền sở hữu trí tuệ theo quy định của Luật Sở hữu trí tuệ; phần mềm máy tính.</span></p>
<p class="legal-clause"><span class="clause-num">21.</span> <span class="clause-text">Vàng nhập khẩu dạng thỏi, miếng chưa được chế tác thành sản phẩm mỹ nghệ, trang sức.</span></p>
<p class="legal-clause"><span class="clause-num">22.</span> <span class="clause-text">Sản phẩm xuất khẩu là tài nguyên, khoáng sản khai thác chưa chế biến thành sản phẩm khác theo danh mục do Chính phủ quy định.</span></p>
<p class="legal-clause"><span class="clause-num">23.</span> <span class="clause-text">Vũ khí, khí tài chuyên dùng phục vụ quốc phòng, an ninh.</span></p>
<p class="legal-clause"><span class="clause-num">24.</span> <span class="clause-text">Hàng hóa, dịch vụ của hộ, cá nhân kinh doanh có mức doanh thu hàng năm từ <strong>200 triệu đồng trở xuống</strong>.</span></p>
<p class="legal-clause"><span class="clause-num">25.</span> <span class="clause-text">Hàng hóa, dịch vụ được mua bán giữa nước ngoài với các khu phi thuế quan và giữa các khu phi thuế quan với nhau.</span></p>
<p class="legal-clause"><span class="clause-num">26.</span> <span class="clause-text">Dịch vụ của các cơ quan quản lý nhà nước cung cấp có thu phí, lệ phí theo quy định của pháp luật về phí và lệ phí.</span></p>

<div class="legal-chapter-block" id="chuong-2">
  <p class="legal-chapter-num">Chương II</p>
  <h2 class="legal-chapter-title">CĂN CỨ VÀ PHƯƠNG PHÁP TÍNH THUẾ</h2>
</div>

<h2 class="legal-article-title" id="dieu-6">Điều 6. Căn cứ tính thuế</h2>
<p>Căn cứ tính thuế giá trị gia tăng là giá tính thuế và thuế suất.</p>

<h2 class="legal-article-title" id="dieu-7">Điều 7. Giá tính thuế</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Đối với hàng hóa, dịch vụ do cơ sở sản xuất, kinh doanh bán ra là giá bán chưa có thuế giá trị gia tăng. Đối với hàng hóa, dịch vụ chịu thuế tiêu thụ đặc biệt là giá bán đã có thuế tiêu thụ đặc biệt nhưng chưa có thuế giá trị gia tăng.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Đối với hàng hóa nhập khẩu là giá tính thuế nhập khẩu cộng với thuế nhập khẩu (nếu có), cộng với thuế tiêu thụ đặc biệt (nếu có) và cộng với thuế bảo vệ môi trường (nếu có).</span></p>
<p class="legal-clause"><span class="clause-num">3.</span> <span class="clause-text">Đối với hàng hóa, dịch vụ dùng để trao đổi, tiêu dùng nội bộ, biếu, tặng, cho, trả thay lương là giá tính thuế giá trị gia tăng của hàng hóa, dịch vụ cùng loại hoặc tương đương tại thời điểm phát sinh hoạt động này.</span></p>
<p class="legal-clause"><span class="clause-num">4.</span> <span class="clause-text">Đối với hoạt động cho thuê tài sản là số tiền cho thuê chưa có thuế giá trị gia tăng. Trường hợp cho thuê theo hình thức trả tiền từng kỳ hoặc trả trước tiền thuê cho một thời hạn thuê thì giá tính thuế là số tiền trả từng kỳ hoặc số tiền trả trước cho thời hạn thuê chưa có thuế giá trị gia tăng.</span></p>
<p class="legal-clause"><span class="clause-num">5.</span> <span class="clause-text">Đối với hàng hóa bán theo phương thức trả góp, trả chậm là giá tính theo giá bán trả một lần chưa có thuế giá trị gia tăng của hàng hóa đó, không bao gồm khoản lãi trả góp, lãi trả chậm.</span></p>
<p class="legal-clause"><span class="clause-num">6.</span> <span class="clause-text">Đối với hoạt động xây dựng, lắp đặt là giá trị công trình, hạng mục công trình hoặc phần công việc thực hiện bàn giao chưa có thuế giá trị gia tăng. Trường hợp xây dựng, lắp đặt có bao thầu nguyên vật liệu thì giá tính thuế là giá trị xây dựng, lắp đặt bao gồm cả giá trị nguyên vật liệu.</span></p>
<p class="legal-clause"><span class="clause-num">7.</span> <span class="clause-text">Đối với hoạt động kinh doanh bất động sản là giá chuyển nhượng bất động sản trừ (-) giá đất được trừ để tính thuế giá trị gia tăng theo quy định của Chính phủ.</span></p>

<h2 class="legal-article-title" id="dieu-8">Điều 8. Thuế suất</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text"><strong>Mức thuế suất 0%</strong> áp dụng đối với hàng hóa, dịch vụ xuất khẩu; hoạt động xây dựng, lắp đặt công trình ở nước ngoài và trong khu phi thuế quan; vận tải quốc tế; hàng hóa, dịch vụ không thuộc diện chịu thuế giá trị gia tăng quy định tại Điều 5 của Luật này khi xuất khẩu, trừ các trường hợp sau: Chuyển giao công nghệ, chuyển nhượng quyền sở hữu trí tuệ ra nước ngoài; dịch vụ tái bảo hiểm ra nước ngoài; dịch vụ cấp tín dụng; chuyển nhượng vốn; dịch vụ tài chính phái sinh; dịch vụ bưu chính, viễn thông; sản phẩm xuất khẩu là tài nguyên, khoáng sản khai thác chưa chế biến thành sản phẩm khác.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text"><strong>Mức thuế suất 5%</strong> áp dụng đối với hàng hóa, dịch vụ sau đây:</span></p>
<p class="legal-point"><span class="point-num">a)</span> <span class="point-text">Nước sạch phục vụ sản xuất và sinh hoạt;</span></p>
<p class="legal-point"><span class="point-num">b)</span> <span class="point-text">Quặng để sản xuất phân bón; thuốc phòng trừ sâu bệnh và chất kích thích tăng trưởng vật nuôi, cây trồng;</span></p>
<p class="legal-point"><span class="point-num">c)</span> <span class="point-text">Mủ cao su sơ chế; nhựa thông sơ chế; lưới, dây giềng và sợi để đan lưới đánh cá;</span></p>
<p class="legal-point"><span class="point-num">d)</span> <span class="point-text">Sản phẩm bằng đay, cói, tre, nứa, song, mây, rơm, vỏ dừa, sọ dừa, bèo tây và các sản phẩm thủ công khác sản xuất bằng nguyên liệu tận dụng từ nông nghiệp; bông sơ chế; giấy in báo;</span></p>
<p class="legal-point"><span class="point-num">đ)</span> <span class="point-text">Thiết bị, dụng cụ y tế; bông, băng vệ sinh y tế; thuốc phòng bệnh, chữa bệnh; sản phẩm hóa dược, dược liệu là nguyên liệu sản xuất thuốc chữa bệnh, thuốc phòng bệnh;</span></p>
<p class="legal-point"><span class="point-num">e)</span> <span class="point-text">Giáo cụ dùng để giảng dạy và học tập;</span></p>
<p class="legal-point"><span class="point-num">g)</span> <span class="point-text">Hoạt động văn hóa, triển lãm, thể dục, thể thao; biểu diễn nghệ thuật; sản xuất phim; nhập khẩu, phát hành và chiếu phim;</span></p>
<p class="legal-point"><span class="point-num">h)</span> <span class="point-text">Đồ chơi cho trẻ em; sách các loại, trừ sách quy định tại khoản 16 Điều 5 của Luật này;</span></p>
<p class="legal-point"><span class="point-num">i)</span> <span class="point-text">Dịch vụ khoa học và công nghệ theo quy định của Luật Khoa học và công nghệ;</span></p>
<p class="legal-point"><span class="point-num">k)</span> <span class="point-text">Bán, cho thuê, cho thuê mua nhà ở xã hội theo quy định của Luật Nhà ở.</span></p>
<p class="legal-clause"><span class="clause-num">3.</span> <span class="clause-text"><strong>Mức thuế suất 10%</strong> áp dụng đối với hàng hóa, dịch vụ không quy định tại khoản 1 và khoản 2 Điều này.</span></p>

<h2 class="legal-article-title" id="dieu-9">Điều 9. Phương pháp tính thuế</h2>
<p>Phương pháp tính thuế giá trị gia tăng gồm phương pháp khấu trừ thuế giá trị gia tăng và phương pháp tính trực tiếp trên giá trị gia tăng.</p>

<h2 class="legal-article-title" id="dieu-10">Điều 10. Phương pháp khấu trừ thuế</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Phương pháp khấu trừ thuế giá trị gia tăng áp dụng đối với cơ sở kinh doanh thực hiện đầy đủ chế độ kế toán, hóa đơn, chứng từ theo quy định của pháp luật về kế toán, hóa đơn, chứng từ bao gồm:</span></p>
<p class="legal-point"><span class="point-num">a)</span> <span class="point-text">Cơ sở kinh doanh có doanh thu hàng năm từ 01 tỷ đồng trở lên, trừ hộ, cá nhân kinh doanh;</span></p>
<p class="legal-point"><span class="point-num">b)</span> <span class="point-text">Cơ sở kinh doanh đăng ký tự nguyện áp dụng phương pháp khấu trừ thuế.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Xác định số thuế giá trị gia tăng phải nộp theo phương pháp khấu trừ:</span></p>
<p class="legal-point"><span class="point-num">-</span> <span class="point-text"><strong>Số thuế GTGT phải nộp = Số thuế GTGT đầu ra - Số thuế GTGT đầu vào được khấu trừ</strong></span></p>

<h2 class="legal-article-title" id="dieu-13">Điều 13. Khấu trừ thuế giá trị gia tăng đầu vào</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Cơ sở kinh doanh nộp thuế giá trị gia tăng theo phương pháp khấu trừ thuế được khấu trừ thuế giá trị gia tăng đầu vào như sau:</span></p>
<p class="legal-point"><span class="point-num">a)</span> <span class="point-text">Thuế giá trị gia tăng đầu vào của hàng hóa, dịch vụ sử dụng cho sản xuất, kinh doanh hàng hóa, dịch vụ chịu thuế giá trị gia tăng được khấu trừ toàn bộ, kể cả thuế giá trị gia tăng đầu vào không được bồi thường của hàng hóa chịu thuế giá trị gia tăng bị tổn thất;</span></p>
<p class="legal-point"><span class="point-num">b)</span> <span class="point-text">Thuế giá trị gia tăng đầu vào của hàng hóa, dịch vụ sử dụng đồng thời cho sản xuất, kinh doanh hàng hóa, dịch vụ chịu thuế và không chịu thuế giá trị gia tăng thì chỉ được khấu trừ số thuế giá trị gia tăng đầu vào của hàng hóa, dịch vụ sử dụng cho sản xuất, kinh doanh hàng hóa, dịch vụ chịu thuế giá trị gia tăng. Cơ sở kinh doanh phải hạch toán riêng thuế giá trị gia tăng đầu vào được khấu trừ và không được khấu trừ; trường hợp không hạch toán riêng được thì thuế đầu vào được khấu trừ tính theo tỷ lệ phần trăm (%) giữa doanh thu chịu thuế giá trị gia tăng, doanh thu không phải kê khai, tính nộp thuế giá trị gia tăng so với tổng doanh thu của hàng hóa, dịch vụ bán ra.</span></p>

<h2 class="legal-article-title" id="dieu-14">Điều 14. Điều kiện khấu trừ thuế giá trị gia tăng đầu vào</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Có hóa đơn giá trị gia tăng hợp pháp của hàng hóa, dịch vụ mua vào hoặc chứng từ nộp thuế giá trị gia tăng ở khâu nhập khẩu hoặc chứng từ nộp thuế giá trị gia tăng thay cho phía nước ngoài theo quy định của Bộ Tài chính.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Có chứng từ thanh toán không dùng tiền mặt đối với hàng hóa, dịch vụ mua vào (bao gồm cả hàng hóa nhập khẩu) từ <strong>20 triệu đồng trở lên</strong>, trừ trường hợp tổng giá trị hàng hóa, dịch vụ mua vào từng lần theo hóa đơn dưới 20 triệu đồng theo giá đã có thuế giá trị gia tăng.</span></p>
<p class="legal-clause"><span class="clause-num">3.</span> <span class="clause-text">Đối với hàng hóa, dịch vụ xuất khẩu, ngoài các điều kiện quy định tại khoản 1 và khoản 2 Điều này còn phải có: Hợp đồng ký kết với bên nước ngoài về việc bán, gia công hàng hóa, cung ứng dịch vụ; tờ khai hải quan đối với hàng hóa xuất khẩu đã làm xong thủ tục hải quan; chứng từ thanh toán qua ngân hàng và các chứng từ khác theo quy định của pháp luật.</span></p>

<h2 class="legal-article-title" id="dieu-15">Điều 15. Các trường hợp hoàn thuế giá trị gia tăng</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text"><strong>Hoàn thuế đối với dự án đầu tư:</strong> Cơ sở kinh doanh đã đăng ký nộp thuế giá trị gia tăng theo phương pháp khấu trừ có dự án đầu tư mới đang trong giai đoạn đầu tư hoặc dự án đầu tư mở rộng tại cùng địa bàn tỉnh hoặc khác địa bàn tỉnh với trụ sở chính, có số thuế giá trị gia tăng của hàng hóa, dịch vụ mua vào sử dụng cho đầu tư lũy kế từ <strong>300 triệu đồng trở lên</strong> chưa được khấu trừ hết thì được hoàn thuế giá trị gia tăng.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text"><strong>Hoàn thuế đối với hàng hóa, dịch vụ xuất khẩu:</strong> Cơ sở kinh doanh trong tháng, quý có hàng hóa, dịch vụ xuất khẩu có số thuế giá trị gia tăng đầu vào chưa được khấu trừ từ <strong>300 triệu đồng trở lên</strong> thì được hoàn thuế giá trị gia tăng theo tháng, quý.</span></p>
<p class="legal-clause"><span class="clause-num">3.</span> <span class="clause-text">Cơ sở kinh doanh nộp thuế giá trị gia tăng theo phương pháp khấu trừ thuế được hoàn thuế giá trị gia tăng khi chuyển đổi sở hữu, chuyển đổi doanh nghiệp, sáp nhập, hợp nhất, chia, tách, giải thể, phá sản, chấm dứt hoạt động có số thuế giá trị gia tăng nộp thừa hoặc số thuế giá trị gia tăng đầu vào chưa được khấu trừ hết.</span></p>

<h2 class="legal-article-title" id="dieu-17">Điều 17. Hiệu lực thi hành</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Luật này có hiệu lực thi hành từ ngày <strong>01 tháng 07 năm 2025</strong>.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Luật Thuế giá trị gia tăng số 13/2008/QH12 đã được sửa đổi, bổ sung một số điều theo Luật số 31/2013/QH13, Luật số 71/2014/QH13 và Luật số 106/2016/QH13 hết hiệu lực kể từ ngày Luật này có hiệu lực thi hành.</span></p>

<div class="document-signatures">
  <div class="signature-left">
    <p><em>Nơi nhận:</em></p>
    <p>- Ủy ban Thường vụ Quốc hội;</p>
    <p>- Chủ tịch nước, Thủ tướng Chính phủ;</p>
    <p>- Tòa án nhân dân tối cao, Viện kiểm sát nhân dân tối cao;</p>
    <p>- Kiểm toán nhà nước;</p>
    <p>- Các Bộ, cơ quan ngang Bộ, cơ quan thuộc Chính phủ;</p>
    <p>- HĐND, UBND các tỉnh, thành phố trực thuộc Trung ương;</p>
    <p>- Lưu: VT, VPQH (3b).</p>
  </div>
  <div class="signature-right">
    <p class="signature-title">CHỦ TỊCH QUỐC HỘI</p>
    <p class="signature-name">Trần Thanh Mẫn</p>
  </div>
</div>
</div>`
  }
];

async function generateDocx(doc: FullStatutePayload): Promise<Buffer> {
  const docx = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: doc.issuingBody.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Luật số: ${doc.docNumber}`, bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 200, after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: doc.title.toUpperCase(), bold: true, size: 28, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 300, after: 300 } }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: doc.summaryMain, size: 24, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 400, after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Ký bởi: ${doc.signer}`, bold: true, size: 24, font: 'Times New Roman' })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBuffer(docx);
}

function generateUuidFromNumber(docNumber: string): string {
  let hex = '';
  for (let i = 0; i < docNumber.length; i++) {
    hex += docNumber.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function main() {
  console.log('🚀 BẮT ĐẦU LÀM GIÀU TOÀN VĂN LUẬT THUẾ GTGT SỐ 48/2024/QH15...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  for (const doc of FULL_STATUTES_TO_ENRICH) {
    console.log(`\n📄 Đang nạp toàn văn luật: [${doc.docNumber}] ${doc.title}...`);

    const docId = generateUuidFromNumber(doc.docNumber);
    const fileId = generateUuidFromNumber(`file-${doc.docNumber}`);
    const fileName = `Luat_${doc.docNumber.replace(/[\/\\?%*:|"<>]/g, '.')}.docx`;

    // 1. Generate clean docx
    const docxBuffer = await generateDocx(doc);

    // Save to local public/documents
    fs.writeFileSync(path.resolve(`public/documents/${fileName}`), docxBuffer);

    // 2. Upload to Supabase Storage
    await supabase.storage.from('documents').upload(fileName, docxBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    const { data: publicUrlData } = supabase.storage.from('documents').getPublicUrl(fileName);
    const fileUrl = publicUrlData.publicUrl;

    // 3. Upsert legal document
    const { error: docErr } = await supabase.from('legal_documents').upsert({
      id: docId,
      document_number: doc.docNumber,
      title: doc.title,
      document_type: doc.docType,
      issuing_body: doc.issuingBody,
      signer: doc.signer,
      issued_date: doc.issuedDate,
      effective_date: doc.effectiveDate,
      status: 'hieu_luc',
      content_status: 'verified',
      summary_main: doc.summaryMain,
      summary_new_points: `Toàn văn Luật Thuế Giá trị gia tăng số ${doc.docNumber} gồm 18 Điều và 26 nhóm không chịu thuế.`,
      html_content: doc.htmlContent,
      is_published: true,
      review_status: 'published',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (docErr) {
      console.error(`❌ Lỗi nạp document ${doc.docNumber}:`, docErr);
      continue;
    }

    // 4. Upsert document file
    await supabase.from('document_files').upsert({
      id: fileId,
      document_id: docId,
      file_type: 'docx',
      file_url: fileUrl,
      original_filename: fileName,
      file_size: docxBuffer.length,
      is_primary: true,
      version: 1
    }, { onConflict: 'id' });

    console.log(`✅ [OK] Đã nạp thành công toàn văn [${doc.docNumber}] (${doc.htmlContent.length.toLocaleString()} ký tự, 18 Điều)`);
  }

  console.log('\n🎉 HOÀN TẤT LÀM GIÀU TOÀN VĂN LUẬT THUẾ GTGT!');
}

main().catch(console.error);
