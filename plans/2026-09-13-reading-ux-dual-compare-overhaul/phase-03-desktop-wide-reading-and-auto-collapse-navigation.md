# Phase 3: Desktop Wide Reading & Auto-Collapse Navigation

## 1. Mục tiêu
Giải phóng không gian hiển thị trên màn hình máy tính (desktop/laptop), cho phép người đọc trải nghiệm toàn văn trọn vẹn với kích thước trang giấy A4 thoải mái.

## 2. Các Cải tiến Giao diện
1. **Cơ chế Auto-Collapse Thông minh:**
   - Trong `src/app/page.tsx`: Khi người dùng click chọn 1 văn bản để bắt đầu đọc, sidebar Cột 1 (Chuyên đề) sẽ tự động thu hẹp thành thanh hẹp mini **(Icon Rail 56px - 64px)**.
   - Khi cần duyệt danh mục, người dùng chỉ cần rê chuột hoặc click vào thanh icon rail để mở lại.
2. **Nút Thu gọn / Mở rộng Sidebar Trực diện:**
   - Đặt nút bấm thu gọn (Chevron Left / Right) nổi bật ở góc trên bên trái của danh sách văn bản để người dùng có thể chủ động giấu toàn bộ cột danh mục bất kỳ lúc nào.
3. **Nâng cấp Khung Đọc Văn bản (Reading Container Typography):**
   - Thiết lập khung đọc trung tâm dạng tờ giấy A4 (`max-w-4xl`), lề trang đối xứng (`px-8 py-10`), nền trắng nhẹ với viền bóng đổ êm mắt (`shadow-sm border border-slate-200/80`).
   - Tối ưu typography: Font chữ thanh lịch, cỡ chữ mặc định 15.5px, line-height 1.7, khoảng cách giữa các đoạn văn chuẩn văn bản hành chính Việt Nam.

## 3. Nghiệm thu
- Không gian đọc tăng từ ~40% lên hơn **75% diện tích màn hình**.
- Đọc văn bản dài không bị mỏi mắt, thao tác thu phóng lề mượt mà.
