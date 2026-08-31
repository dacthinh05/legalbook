# Báo cáo Tư vấn Kỹ thuật: Lộ trình Triển khai Production & Khắc phục Rủi ro Phụ thuộc Dữ liệu Mẫu (LegalBook)

- **Ngày lập**: 2026-08-31 (Cập nhật rà soát toàn diện mã nguồn thực tế)
- **Phạm vi**: `legalbook/` (Next.js 16.3.3 App Router, Supabase Cloud PostgreSQL, Storage, Vercel Cron, Gemini AI RAG)
- **Tài liệu đối chiếu**: `src/app/api/ai/chat/route.ts`, `src/lib/data-service.ts`, `src/app/admin/data-quality/page.tsx`, `src/app/admin/upload/page.tsx`, `scripts/seed_supabase_production.ts`

---

## 1. Verdict (Đánh giá Thực tế & Cảnh báo Rủi ro)

Mặc dù dự án đã vượt qua 300/300 bài test regression và build Turbopack thành công, **hệ thống trước đó tồn tại các điểm nghẽn kiến trúc cần được khắc phục trước khi đưa lên Production**:

1. **Luồng Chat AI (`/api/ai/chat`)**: 
   - **Thực tế hoạt động**: Khi `GEMINI_API_KEY` được cấu hình, Gemini nhận nội dung của `targetDoc` (văn bản người dùng đang đọc) hoặc `docsToAnalyze` (tập văn bản chọn đối chiếu), chứ không gửi toàn bộ kho 58 văn bản.
   - **Vấn đề đã xử lý**: Trước đây, `targetDoc` được tìm từ mảng tĩnh `DEMO_DOCUMENTS` theo `documentId` (và mảng này cũng làm ngữ cảnh cho `local_rag` khi offline). Nếu một văn bản mới được nạp vào Supabase, `targetDoc` sẽ trả về `null` khiến Gemini không có nội dung văn bản mới. Hiện tại đã được refactor gọi `getDocumentById(documentId)` và `getDocuments()` từ `@/lib/data-service` để truy vấn trực tiếp CSDL Supabase.
2. **Kiểm định Chất lượng Dữ liệu Admin (`/admin/data-quality`)**:
   - Trước đó khởi tạo cứng `useState(DEMO_DOCUMENTS)` → Đã chuyển đổi hoàn toàn sang kiến trúc **fail-closed**: khởi tạo state rỗng `[]`, hiển thị Skeleton loader khi đang tải, và hiện banner lỗi rõ ràng khi CSDL `source === 'unavailable'`.
3. **Phê duyệt Tải lên & OCR Admin (`/admin/upload` & `DocumentImportModal`)**:
   - Đã refactor hoàn toàn sang hàm `saveDocument(newLegalDoc, attachments)`:
     - Tự động upload tệp nhị phân (`fileBuffer`) lên Supabase Storage bucket `documents` với đường dẫn định danh duy nhất chống ghi đè: `imports/${docId}/${fileId}_${name}`.
     - Lưu URL chính thức vào bảng `document_files` và bản ghi vào `legal_documents` với `UUID` chuẩn RFC4122 (không truyền string literal vào cột UUID).
     - Cơ chế rollback an toàn: Nếu bước lưu tệp hoặc CSDL thất bại, hệ thống tự động xóa các file đã tải lên Storage và chỉ rollback parent document nếu đây là văn bản mới tạo, tránh xóa nhầm văn bản cũ khi cập nhật.
---

## 2. Làm rõ Cơ chế Biến Môi Trường & Bộ Nhớ Đệm (Cache TTL)

### A. Cơ chế Fail-Closed & Biến môi trường
- **`NEXT_PUBLIC_DEMO_MODE=false`** (kết hợp với `NODE_ENV=production` tự động trên Vercel) là **công tắc chính thức** để tắt hoàn toàn dữ liệu mô phỏng. Khi CSDL Supabase không kết nối được, hệ thống strictly trả về `source: 'unavailable'` để bảo đảm tính toàn vẹn pháp lý.
- **`NEXT_PUBLIC_STRICT_PROD=true`**: Đã được đồng bộ trong cả `src/lib/data-service.ts` (`isStrictProductionMode`) và `src/lib/supabase/middleware.ts` để cho phép cưỡng chế chế độ strict ngay cả ở môi trường staging/preview.

### B. Bộ nhớ đệm Client (Cache TTL) & Quy trình Smoke Test
- `src/lib/data-service.ts` triển khai bộ nhớ đệm client với thời gian sống **60 giây** (`CACHE_TTL_MS = 60000`) nhằm tối ưu tốc độ phản hồi < 5ms.
- **Lưu ý khi Smoke Test**: 
  - Khi thêm mới hoặc chỉnh sửa văn bản trực tiếp từ Supabase Table Editor / SQL Editor, giao diện client sẽ cập nhật sau khi hết chu kỳ 60s TTL (hoặc khi người dùng thực hiện các thao tác xóa/sửa trên UI vốn tự động kích hoạt `invalidateDocumentCache()`).

---

## 3. Lộ trình Triển khai Chuẩn 3 Giai đoạn (What You Should Do)

### Giai đoạn 1: Chuẩn hóa Tầng Truy cập Dữ liệu & Persistence (Đã hoàn tất 100%)
1. **Refactor `src/app/api/ai/chat/route.ts`**: Đã kết nối `getDocumentById` và `getDocuments()` từ `data-service.ts` để đọc trực tiếp văn bản từ Supabase.
2. **Refactor `src/app/admin/data-quality/page.tsx`**: Đã chuyển sang mô hình Fail-closed, nạp dữ liệu động từ `getDocuments()`.
3. **Refactor `src/app/admin/upload/page.tsx` & `DocumentImportModal.tsx`**: Đã kết nối `saveDocument(newLegalDoc, attachments)` để lưu trực tiếp vào CSDL Supabase và đồng bộ file lên Storage.
### Giai đoạn 2: Database Migration & Storage Sync
4. **Thực thi tuần tự 10 file migrations trên Supabase SQL Editor**:
   - Chạy lần lượt từ `001_initial_schema.sql` đến `010_security_hardening.sql`.
5. **Chạy script seed dữ liệu chuẩn**:
   - Chạy lệnh `npm run seed:supabase` trên máy dev (cung cấp `NEXT_PUBLIC_SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`).
   - Xác nhận: 58 văn bản trong `legal_documents`, 62 tệp đính kèm trong bucket `documents`.

### Giai đoạn 3: Cấu hình Vercel & Smoke Test End-to-End
6. **Thiết lập các biến môi trường trên Vercel Dashboard**:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
   - `NEXT_PUBLIC_DEMO_MODE=false` (Bắt buộc).
   - `NEXT_PUBLIC_STRICT_PROD=true` (Kích hoạt fail-closed).
   - `CRON_SECRET`, `GEMINI_API_KEY`.
7. **Phân quyền Admin**:
   - Đăng ký 1 tài khoản và gán `role = 'admin'` trong bảng `profiles`.
8. **Smoke Test Kịch bản "Văn bản Mới"**:
   - Thêm 1 văn bản mới vào Supabase qua Bàn quản trị.
   - Kiểm tra: Văn bản xuất hiện trong Tìm kiếm/Reader (sau 60s cache TTL hoặc sau thao tác refresh cache), và AI Chat trích dẫn chính xác văn bản mới đó.

---

## 4. What You Shouldn't Do (Những điều Tuyệt đối Tránh)

- **KHÔNG để `NEXT_PUBLIC_DEMO_MODE=true` trên production**: Tránh việc ứng dụng âm thầm trả về dữ liệu mẫu trong bundle khi có sự cố mạng.
- **KHÔNG hardcode `SUPABASE_SERVICE_ROLE_KEY` vào client code**: Key này chỉ được lưu trong Vercel Environment Variables cho Server Actions/API Routes.
- **KHÔNG bỏ qua bài test Fail-Closed**: Thử ngắt kết nối Supabase trên môi trường staging để bảo đảm UI hiển thị banner lỗi kết nối rõ ràng thay vì rơi về mock data.

---

## 5. Work Checklist & Success Metrics

### Work Checklist
- [x] **1.** Refactor `api/ai/chat/route.ts` để đọc `targetDoc` và corpus từ `data-service.ts` / Supabase.
- [x] **2.** Refactor `admin/data-quality/page.tsx` chuẩn Fail-closed, nạp danh sách từ `getDocuments()`.
- [x] **3.** Refactor `admin/upload/page.tsx` & `DocumentImportModal.tsx` lưu CSDL và tải Storage với cơ chế rollback.
- [x] **4.** Hỗ trợ `NEXT_PUBLIC_STRICT_PROD` trong `isStrictProductionMode()` (`data-service.ts`).
- [ ] **5.** Chạy tuần tự 10 file migrations (`001` → `010`) trên Supabase SQL Editor.
- [ ] **6.** Chạy `npm run seed:supabase` nạp dữ liệu và tải 62 file lên Storage bucket `documents`.
- [ ] **7.** Cấu hình 7 biến môi trường trên Vercel (`DEMO_MODE=false`, `STRICT_PROD=true`).
- [ ] **8.** Phân quyền `role = 'admin'` cho tài khoản quản trị trong bảng `profiles`.
- [ ] **9.** Smoke test: Kiểm tra Reader, Search, Data Quality và AI Chat với văn bản mới trên domain live.

### Success Metrics
1. **Zero Demo-Data Leaks**: Không có endpoint API nào trên production rơi về dữ liệu mẫu khi đã kết nối Supabase.
2. **Toàn vẹn Dữ liệu AI**: Hỏi đáp AI trích dẫn chính xác các văn bản mới được thêm vào CSDL Supabase.
3. **Fail-Closed Verification**: Khi ngắt kết nối Supabase, hệ thống trả về thông báo lỗi kết nối chính thống (`source: 'unavailable'`), không bao giờ âm thầm hiển thị dữ liệu mô phỏng.
4. **Cache Consistency**: Dữ liệu tra cứu phản hồi tức thì < 5ms trong chu kỳ TTL 60s và tự động đồng bộ khi có thao tác ghi/sửa.
