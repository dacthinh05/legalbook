# Hướng Dẫn Triển Khai Production (Vercel & Supabase Cloud Runbook) - LegalBook

Tài liệu hướng dẫn chi tiết từng bước đưa ứng dụng **LegalBook** lên môi trường Production với cơ sở dữ liệu **Supabase Cloud**, hệ thống lưu trữ **Supabase Storage**, tự động hóa **Vercel Cron** và phân quyền quản trị bảo mật.

---

## 1. Thông Tin Nền Tảng

- **Hạ tầng Ứng dụng**: Vercel Serverless (Next.js 16.3.3 App Router / Turbopack / Node.js 24.x).
- **Cơ sở Dữ liệu & Storage**: Supabase Cloud (PostgreSQL 15+ with `pg_trgm`, `uuid-ossp`, `unaccent`, and Supabase Storage S3-compatible bucket `documents`).
- **Tự động hóa Quét luật mới**: Vercel Cron (`vercel.json`) lịch chạy `0 23 * * *` (06:00 AM giờ Việt Nam UTC+7).
- **Miền Production**: [https://legalbook-six.vercel.app](https://legalbook-six.vercel.app)

---

## 2. Quy Trình Triển Khai 5 Bước (Step-by-Step Runbook)

```
[1. Supabase Project Setup]
             │
             ▼
[2. Run SQL Migrations (001 → 010)] ──> supabase/migrations/*.sql
             │
             ▼
[3. Run Data Seed & Storage Sync] ──> npm run seed:supabase
             │
             ▼
[4. Setup Vercel Environment Variables] ──> Vercel Dashboard
             │
             ▼
[5. Deploy & Verify Cron / Reader] ──> 🚀 PRODUCTION LIVE
```

---

### Bước 1: Khởi tạo Project trên Supabase Cloud
1. Truy cập [https://supabase.com/dashboard](https://supabase.com/dashboard) và tạo project mới (ví dụ: `legalbook-production`).
2. Ghi lại các thông số kết nối từ mục **Settings > API**:
   - `Project URL` (e.g. `https://your-project.supabase.co`)
   - `anon public key`
   - `service_role secret key`

---

### Bước 2: Thực thi SQL Migrations (001 → 010)
> **Lưu ý (2026-08-29):** `supabase/production_master_schema.sql` đã bị deprecated (nội dung cũ mâu thuẫn với app). Nguồn sự thật duy nhất cho schema là thư mục `supabase/migrations/`.

1. Mở **SQL Editor** trong Supabase Dashboard.
2. Chạy lần lượt **từng file** trong `supabase/migrations/` theo đúng thứ tự số:
   `001_initial_schema.sql` → `002…` → … → `010_security_hardening.sql`.
   (Không chạy song song — các migration sau phụ thuộc object của migration trước.)
3. Nếu dùng Supabase CLI và đã `supabase link`, có thể chạy gộp:
   ```bash
   supabase db push
   ```
4. Kết quả:
   - Toàn bộ 27 bảng dữ liệu (bao gồm `legal_documents`, `categories`, `document_category_links`, `document_relations`, `document_files`, `document_provisions`, `legal_effects`, `document_annotations`, `provision_anchors`, `organizations`, `organization_members`, `data_quality_audit_history`, …).
   - Trigger tự động tính `tsvector` cho tìm kiếm toàn văn (`compute_legal_document_search_vector`, `compute_provision_search_vector`).
   - Hàm hybrid search `search_legal_documents_hybrid` / `search_provisions_hybrid` và (nếu bật) `pgvector` ở migration 009.
   - Storage buckets và toàn bộ chính sách Row Level Security (RLS).
   - Migration 010: vá bảo mật — chặn tự nâng `role` trên `profiles`, bật RLS cho `data_quality_audit_history` / `organizations` / `organization_members`, pin `search_path` cho 2 hàm hybrid search, sửa policy `annotations_update`.

---

### Bước 3: Nạp dữ liệu tự động & Đồng bộ File đính kèm lên Storage
1. Tạo tệp `.env.local` ở thư mục gốc của dự án trên máy phát triển:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```
2. Chạy lệnh nạp dữ liệu tự động:
   ```bash
   npm run seed:supabase
   ```
3. **Kết quả mong đợi**:
   - Tự động tải lên toàn bộ file `.docx`, `.pdf`, `.doc` từ thư mục `public/documents/` lên bucket `documents`.
   - Nạp đủ **58 văn bản luật** chuẩn kèm toàn văn HTML.
   - Nạp toàn bộ cây danh mục, liên kết quan hệ và tác động điều khoản (*legal effects*).

---

### Bước 4: Cấu hình Biến Môi Trường trên Vercel
Truy cập **Vercel Dashboard > Project Settings > Environment Variables** và thiết lập:

| Tên biến | Giá trị mẫu | Mục đích |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Kết nối CSDL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Public API Key của Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Secret Key cho tác vụ nạp / cron crawler |
| `NEXT_PUBLIC_DEMO_MODE` | `false` (bắt buộc trên production) | Tắt chế độ demo; mặc định là TẮT — chỉ bật tường minh khi dev muốn dùng dữ liệu mô phỏng |
| `NEXT_PUBLIC_STRICT_PROD` | `true` | Bật chế độ kiểm tra nghiêm ngặt không dùng dữ liệu mô phỏng trên production |
| `CRON_SECRET` | `your-high-entropy-token` | Mã bí mật bảo vệ endpoint quét lúc 06:00 AM |
| `GEMINI_API_KEY` | `AIzaSy...` | Khóa API Google AI phục vụ hỏi đáp & tóm tắt |
| `GEMINI_API_BACKUP_KEY` | `AIzaSy...` | (Tuỳ chọn) Khóa API dự phòng khi key chính lỗi quota |

---

### Bước 5: Kiểm tra Vercel Cron & Smoke Test Sau Triển Khai
1. Kiểm tra tab **Cron Jobs** trên Vercel Dashboard:
   - Endpoint: `/api/cron/crawl-legal-updates`
   - Schedule: `0 23 * * *` (tương đương 06:00 AM hàng ngày theo giờ Việt Nam UTC+7).
2. **Smoke Test Checklist trên Production**:
   - [x] Mở trang chủ: Hiển thị đúng danh mục pháp luật và danh sách văn bản mới từ Supabase.
   - [x] Mở văn bản (Ví dụ: `Luật Bảo hiểm xã hội 41/2024`): TOC cuộn mượt, highlight vàng TVPL hiển thị đúng, tải file Word `.docx` thành công.
   - [x] Tìm kiếm toàn cục (`Ctrl+K`): Nhập từ khóa (VD: `thuế GTGT`), kết quả trả về tức thì (< 5ms).
   - [x] Truy cập `/admin` khi chưa đăng nhập: trang hiển thị yêu cầu đăng nhập và mọi thao tác ghi đều bị RLS chặn (anon không có quyền ghi).
   - [x] Đăng nhập bằng tài khoản `reader`: không thể tự đổi `role` trên `profiles` (bị trigger chặn — xem migration 010).
