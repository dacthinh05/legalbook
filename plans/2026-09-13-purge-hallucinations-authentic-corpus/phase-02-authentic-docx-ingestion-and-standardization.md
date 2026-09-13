# Phase 2: Authentic DOCX Ingestion & Standardization

## 1. Mục tiêu
Bổ sung và chuẩn hóa toàn văn các văn bản pháp quy trọng yếu từ 214 file `.docx` trong thư mục `public/documents/`, đưa vào kho dữ liệu chính thức dưới dạng HTML chuẩn Nghị định 30/2020/NĐ-CP.

## 2. Nguồn Văn bản Đầu vào
- Các tệp tin `.docx` trong `public/documents/`:
  - `Luat_48.2024.QH15.docx` (Luật Thuế Giá trị gia tăng 2024)
  - `ND 74.2024.NĐ-CP - 74-2024-NĐ-CP quy định mức lương tối thiểu.docx`
  - `TT 214.2012.TT-BTC - 214-2012-TT-BTC Hệ thống Chuẩn mực kiểm toán.docx`
  - Các công văn Tổng cục Thuế và Cục thuế địa phương (Hà Nội, TP.HCM, Bình Dương, Nghệ An, Thanh Hóa, Hải Phòng, Quảng Ninh...).
- Các văn bản đã có toàn văn trong kho:
  - Nghị định 125/2020/NĐ-CP (Xử phạt vi phạm hành chính về thuế, hóa đơn)
  - Nghị định 132/2020/NĐ-CP (Giao dịch liên kết)
  - Nghị định 123/2020/NĐ-CP (Hóa đơn, chứng từ)
  - Thông tư 200/2014/TT-BTC (Chế độ kế toán doanh nghiệp)
  - Thông tư 80/2021/TT-BTC (Hướng dẫn Luật Quản lý thuế)
  - Luật Quản lý thuế 38/2019/QH14, Luật Doanh nghiệp 59/2020/QH14, Luật Kế toán 88/2015/QH13.

## 3. Quy chuẩn Định dạng Toàn văn (Decree 30/2020)
- **Tiêu đề & Quốc hiệu**: Trình bày bảng 2 cột chuẩn văn bản hành chính Việt Nam.
- **Cấu trúc phân cấp**:
  - `Phần / Chương / Mục / Điều / Khoản / Điểm`.
  - Mỗi Điều phải có thẻ neo HTML: `<div class="legal-article" id="dieu-X">`.
  - Tiêu đề Điều: `<h3 class="article-title">Điều X. [Tên điều]</h3>`.
- **Search Vector**: Tạo lại vector tìm kiếm FTS PostgreSQL cho từng văn bản.

## 4. Nghiệm thu Phase 2
- 100% văn bản quy phạm đều có `html_content` với cấu trúc Điều/Khoản rõ ràng.
- Người ký là các lãnh đạo thật (Thủ tướng, Bộ trưởng, Thứ trưởng, Tổng cục trưởng, Cục trưởng).
