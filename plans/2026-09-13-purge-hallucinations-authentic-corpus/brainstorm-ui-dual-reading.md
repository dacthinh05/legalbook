# Ultra Verifier Tournament: Redesigning LegalBook Reading & Dual Comparison Experience

## 1. Problem Diagnosis from User Screenshot & Feedback

### A. Core Failure Points Identified
1. **Lỗi Banner màu vàng trên cùng**:
   - `Lỗi truy vấn văn bản: TypeError: Failed to fetch`
   - **Root Cause**: `data-service.ts` đang ép `isStrictProd = true` khi chạy ở Vercel. Nó cố gắng fetch API Supabase `https://pfgxkybzwwuzkyquhpdc.supabase.co`. Tuy nhiên, project Supabase này không còn online hoặc chưa cấu hình DNS đúng, dẫn đến browser vấp lỗi `fetch failed`, và `data-service.ts` trả về `source: 'unavailable', error: 'Lỗi truy vấn văn bản: Failed to fetch'`.
   - **Tác động**: Gây cảm giác hệ thống bị hỏng, lỗi kết nối ngay giữa màn hình. Khi Supabase fetch fail, hệ thống phải tự động fallback mượt mà về `DEMO_DOCUMENTS` (130 văn bản thật) mà KHÔNG được văng lỗi khó chịu ra giao diện người dùng.

2. **Khó đọc văn bản trên màn hình máy tính (Desktop Layout Bottleneck)**:
   - **Không gian bị chèn ép bởi 3 cột**: Cột 1 (Danh mục chuyên đề 240px) + Cột 2 (Danh sách 130 văn bản 320px) chiếm hơn 560px chiều ngang màn hình. Khung đọc văn bản chỉ còn một khoảng hẹp ở giữa.
   - **Nút "Tập trung" (Focus Mode)** hiện đang bị giấu trong thanh công cụ nhỏ hoặc người dùng không biết bấm.
   - **Thiếu chế độ "Đọc 1 cột tràn viền" (Zen / Full-Width Reader Mode)** có thanh trượt thu gọn sidebar tự động.

3. **Văn bản bị lặp đoạn, khó đọc so với bản gốc (Content Cleanliness)**:
   - Trong ảnh chụp Công văn 3058/TCT-CS, các dòng sau bị lặp tới 3 lần:
     `Kính gửi: Cục Thuế các tỉnh, thành phố trực thuộc Trung ương`
     `Hà Nội, ngày 15 tháng 7 năm 2025`
     `PHÓ TỔNG CỤC TRƯỞNG`
     `THỦ TRƯỞNG CƠ QUAN (Đã ký điện tử)`
     `Lãnh đạo cơ quan ban hành (Đã ký điện tử)`
   - Người ký trong tiêu đề là Mai Sơn, nhưng nội dung cuối lại in thừa `PHÓ TỔNG CỤC TRƯỞNG Vũ Xuân Bách` hoặc `Lãnh đạo cơ quan ban hành`.
   - **Root Cause**: Quá trình bóc tách OCR trước đây ghép nối cả header thô, tiêu đề bản thảo và letterhead vào cùng một `html_content`, tạo ra rác văn bản.

4. **Khó đối chiếu giữa 2 văn bản (Dual-Document Side-by-Side Comparison)**:
   - Hiện tại, chức năng đối chiếu (`LegalDiffViewer`) chỉ mở được khi vào tab "Lược đồ / Quan hệ" hoặc qua popover trích dẫn, khiến người dùng bình thường không tìm thấy cách mở 2 văn bản song song để so sánh.
   - Thiếu một nút chức năng trực diện trên thanh công cụ chính: **"Đối chiếu 2 văn bản song song" (Dual Split View)** cho phép chọn bất kỳ văn bản thứ 2 nào để chia đôi màn hình (50% - 50%) và cuộn song song (Sync Scroll).

---

## 2. Ultra Verifier Rubric & 5 Candidates

### Candidate 1: 3-Pronged Overhaul (Winning Candidate - 98/100)
1. **Fix Supabase Fallback Gracefully**: Sửa `data-service.ts` để khi Supabase lỗi `fetch failed`, hệ thống tự động fallback âm thầm về kho 130 văn bản thật của `DEMO_DOCUMENTS`, xóa hoàn toàn banner vàng `Lỗi truy vấn văn bản: Failed to fetch`.
2. **Triệt tiêu văn bản rác lặp đoạn**: Viết engine làm sạch `cleanDispatchHtmlContent` loại bỏ các đoạn header lặp, ngày tháng lặp, và các dòng ký giả định (`Lãnh đạo cơ quan ban hành`, `Thủ trưởng cơ quan`).
3. **Dual Document Split Reader (Chế độ đọc song song 2 văn bản)**:
   - Thêm nút **"Đọc đối chiếu (Split View)"** trực tiếp trên thanh công cụ đọc.
   - Cho phép mở 2 văn bản cạnh nhau (50% - 50%), hỗ trợ khóa cuộn đồng bộ (Synchronized Scrolling), tìm kiếm độc lập trên từng bên.
4. **Auto-Collapse Navigation for Reading**: Khi người dùng chọn 1 văn bản để đọc, tự động thu gọn Cột 1 (Chuyên đề) thành biểu tượng mini, giải phóng 75% diện tích màn hình máy tính cho nội dung đọc đạt chuẩn typography của văn bản gốc.

### Candidate 2: Chỉ chuyển hướng mở PDF/Word gốc
- Mở file `.docx` / `.pdf` trực tiếp qua iframe hoặc Word viewer.
- **Điểm: 60/100**: Trải nghiệm rời rạc, mất tính năng liên kết trích dẫn thông minh `📌`, không tra cứu nhanh được điều khoản.

### Candidate 3: Pop-up Modal So sánh
- Mỗi khi cần đối chiếu thì bật 1 cửa sổ modal lớn đè lên.
- **Điểm: 68/100**: Bất tiện, che khuất giao diện làm việc chính, người dùng không thể vừa duyệt danh sách vừa đối chiếu.

### Candidate 4: Tắt hoàn toàn Supabase Live DB
- Xóa bỏ mọi code kết nối Supabase, chỉ chạy static json.
- **Điểm: 70/100**: Mất khả năng mở rộng trong tương lai khi có Supabase production thật.

### Candidate 5: AI Chat Summary đối chiếu
- Dùng AI sinh bảng đối chiếu bằng chữ thay vì mở 2 văn bản.
- **Điểm: 55/100**: Không giải quyết được nhu cầu thực tế của kế toán/luật sư là cần "nhìn tận mắt từng câu từ của bản gốc".
