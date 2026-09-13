# Phase 2: Administrative HTML Cleaner & Deduplication

## 1. Mục tiêu
Lọc sạch toàn bộ rác định dạng, lặp đoạn tiêu đề, lặp ngày tháng và xóa bỏ hoàn toàn các dòng ký thừa giả định trong toàn văn các công văn và nghị định.

## 2. Các Mẫu Lỗi Cần Xóa (Pattern Matching)
1. **Lặp cụm "Kính gửi":**
   - Đoạn văn bản lặp lại nhiều dòng `<p>Kính gửi: Cục Thuế...</p>` liên tiếp do quá trình bóc tách OCR.
2. **Lặp ngày tháng địa danh:**
   - Các dòng `<p>Hà Nội, ngày 15 tháng 7 năm 2025</p>` xuất hiện nhiều lần giữa phần mở đầu.
3. **Các dòng chữ ký giả định thừa ở cuối văn bản:**
   - `<p>THỦ TRƯỞNG CƠ QUAN</p>`
   - `<p>(Đã ký điện tử)</p>`
   - `<p>Lãnh đạo cơ quan ban hành</p>`
   - `<p>PHÓ TỔNG CỤC TRƯỞNG</p>` nằm rải rác không đúng vị trí.

## 3. Các bước Thực thi
1. Viết helper `cleanAdministrativeHtmlContent(html: string): string` trong `src/lib/legal-formatter.ts`.
2. Áp dụng chuẩn hóa trực tiếp vào `src/lib/demo-data.ts` trên toàn bộ các công văn (đặc biệt là CV 3058, 1585, 1920, 3970...).
3. Đảm bảo cấu trúc hiển thị theo đúng chuẩn Nghị định 30/2020/NĐ-CP:
   - Phần đầu: Bảng 2 cột (Cơ quan ban hành / Quốc hiệu tiêu ngữ)
   - Phần kính gửi: 1 dòng duy nhất, in đậm
   - Phần nội dung hướng dẫn: Các khoản 1, 2... phân tách rõ ràng
   - Phần nơi nhận và chữ ký: Grid 2 cột (Bên trái: Nơi nhận; Bên phải: Chức vụ, chữ ký điện tử và tên lãnh đạo thật).

## 4. Nghiệm thu
- Mở Công văn 3058/TCT-CS và các công văn khác: Không còn bất kỳ dòng lặp nào, không còn dòng "Lãnh đạo cơ quan ban hành". Văn bản sạch đẹp, trang trọng như công văn in giấy.
