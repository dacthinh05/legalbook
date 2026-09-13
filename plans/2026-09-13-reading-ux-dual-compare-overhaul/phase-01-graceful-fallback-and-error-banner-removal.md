# Phase 1: Graceful Fallback & Error Banner Removal

## 1. Mục tiêu
Xóa bỏ triệt để lỗi banner vàng: `Lỗi truy vấn văn bản: TypeError: Failed to fetch` khi chạy trên Vercel production bằng cơ chế fallback thông minh.

## 2. Điểm cần sửa đổi
1. `src/lib/data-service.ts`:
   - Hàm `getDocuments()`, `getCategories()`, `getDocumentById()`:
   - Khi `isConfigured === true` nhưng lệnh gọi Supabase ném ngoại lệ (`fetch failed`, connection timeout hoặc network error), kiểm tra nếu có dữ liệu embedded thật trong `DEMO_DOCUMENTS`, lập tức trả về dữ liệu embedded với `source: 'embedded_fallback'`.
   - Không gán chuỗi `error: Lỗi truy vấn văn bản...` khi đã có dữ liệu fallback hợp lệ.
2. `src/app/page.tsx`:
   - Cập nhật logic: Chỉ gán `setDataError(res.error)` khi `res.data.length === 0` VÀ không có dữ liệu fallback hiển thị.

## 3. Nghiệm thu
- Không còn bất kỳ banner màu vàng nào xuất hiện khi ứng dụng tải trên trình duyệt.
- Danh sách 130 văn bản thật hiển thị đầy đủ ngay từ lần mở trang đầu tiên.
