# Báo cáo Audit toàn bộ dự án LegalBook — 2026-08-29

Phạm vi: `legalbook/` (Next.js 16.3.3 App Router, ~46.800 dòng TypeScript, 27 bảng Supabase, 9 migrations, Vercel cron, Python worker OCR).

## Kết luận tổng quan

Dự án **chưa hoàn chỉnh để coi là " xong production"**. Phần ứng dụng (UI, reader, search, engines) đã rất chín: TypeScript 0 lỗi, eslint 0 lỗi (5 warnings), không còn TODO/FIXME, git history sạch, secrets hygiene tốt. Tuy nhiên còn **2 vấn đề nghiêm trọng mang tính quyết định** (mâu thuẫn schema seed-vs-app, tự nâng quyền admin qua RLS) và **3 vấn đề cao** cần xử lý trước khi tin cậy deployment.

## Checks đã chạy

| Check | Kết quả |
|---|---|
| `tsc --noEmit` | PASS — 0 lỗi |
| `eslint` | PASS — 0 errors, 5 warnings (`DocumentReader.tsx`: unused vars, 1 missing hook dep) |
| `npm test` (regression) | KHÔNG CHẠY ĐƯỢC trong sandbox (binary esbuild win32; registry chặn) — cần chạy trên máy Windows của bạn để xác nhận |
| `npm run build` | KHÔNG CHẠY ĐƯỢC trong sandbox (thiếu swc linux, mạng bị chặn) |
| Git working tree | 7 file "modified" chỉ là CRLF/LF, không thay đổi nội dung |

## CRITICAL

### C1. Mâu thuẫn schema: seed/deployment docs dùng bảng KHÁC với app
- `supabase/production_master_schema.sql` tạo bảng `documents` (10 bảng).
- migrations 001–009 + `src/lib/data-service.ts` (dòng 127, 246, 307…) dùng `legal_documents` và **17 bảng mà master schema không có** (`document_nodes`, `legal_relationships`, `legal_changesets`, `provision_anchors`, `organizations`, `organization_members`, `bookmarks`, `notes`, `tags`, …).
- `scripts/seed_supabase_production.ts:162` upsert vào `documents` — seed theo docs sẽ ghi đúng bảng… nhưng app đọc `legal_documents`, nên app production không thấy dữ liệu nào, và `document_provisions` (009) FK vào `legal_documents` nên seed chạy theo master schema sẽ lỗi FK.
- `docs/deployment.md` bước 2 hướng dẫn chạy master schema → làm theo runbook sẽ tạo DB **sai hoàn toàn**.

**Fix**: chọn migrations 001–009 là nguồn sự thật; cập nhật seed script + deployment.md sang `legal_documents` và đủ 27 bảng, hoặc xoá master schema. Sau đó chạy seed fresh trên project staging để xác nhận end-to-end.

### C2. Tự nâng quyền admin qua RLS `profiles`
`001_initial_schema.sql:594-599`: policy `profiles_update_own` cho phép user đã đăng nhập UPDATE row của mình, không chặn cột `role`. Mọi `authenticated` user có thể `UPDATE profiles SET role='admin'` → qua mặt toàn bộ gate `get_user_role()`.
**Fix**: trigger `BEFORE UPDATE` chặn đổi `role` nếu `get_user_role() <> 'admin'`.

## HIGH

### H1. Demo mode bật mặc định trong production (rủi ro dữ liệu pháp lý)
`next.config.ts` default `NEXT_PUBLIC_DEMO_MODE = "true"` → `isStrictProductionMode()` không bao giờ true → khi Supabase lỗi/thiếu dữ liệu, app **âm thầm** trả `DEMO_DOCUMENTS` (dữ liệu mô phỏng trong bundle 5.598 dòng) mà UI không hiển thị cảnh báo (không có tham chiếu `embedded_repository` nào trong components). Với database văn bản luật, đây là rủi ro nghiêm trọng nhất về mặt nghiệp vụ.
**Fix**: default `false` (hoặc chỉ bật demo khi biến môi trường được set tường minh), và hiện banner nguồn dữ liệu khi `source !== 'supabase_live'`.

### H2. AI chat dùng demo data kể cả production; không auth, không rate limit
`src/app/api/ai/chat/route.ts:85` — `allDocs = DEMO_DOCUMENTS` hardcode, tức câu trả lời AI (kèm citation) ground trên dữ liệu mô phỏng. Endpoint công khai, không `auth.getUser()`, không giới hạn tốc độ → tiêu hao Gemini key của bạn.
**Fix**: query Supabase (hoặc corpus đã verify), thêm auth + rate limit.

### H3. 3 bảng không có RLS
`data_quality_audit_history` (005:61), `organizations` (007:148), `organization_members` (007:160) — anon đọc/ghi được qua PostgREST; fabricate membership được.
**Fix**: migration mới `ENABLE RLS` + policies tối thiểu.

## MEDIUM

- `007:71-73, 97-107`: `SECURITY DEFINER` bỏ sót `SET search_path` (đã làm đúng ở 003, bị tái phạm ở 007; 009 cũng cần rà).
- Cron endpoint trả về **5 văn bản "simulated" hardcode trông như thật** (`route.ts:68-174`) — nếu admin bấm approve ở crawler UI thì văn bản bịa vào library. Cần watermark rõ hoặc chỉ dùng khi crawl thật chạy.
- `CRON_SECRET` có trong `docs/deployment.md:87` nhưng **không có trong `.env.example`** (cùng `GEMINI_API_KEY`, `GEMINI_API_BACKUP_KEY`) → setup theo example sẽ thiếu, và trong dev cron không cần auth.
- `workers/document-processor` (Python OCR worker): env `PROCESSOR_WORKER_URL` không tồn tại ở bất kỳ đâu (kể cả docs) → tính năng OCR remote nhiều khả năng chưa từng được bật/verify.

## LOW

- `src/app/admin/*` không có server-side auth gate (chỉ RLS chặn ghi — nhưng kết hợp C2 thì bị vượt). Thêm check trong `middleware.ts`/layout server.
- `006:165` tautology `document_id = document_id` trong WITH CHECK.
- `err.message` trả về client ở 2 API routes.
- `.gitignore` pattern `.env*` chặn luôn `.env.example` khỏi git (hiện file này đang được track — OK, nhưng thêm `!.env.example` cho an toàn).
- `demo-data.backup.ts` (3.722 dòng) không được tham chiếu — cân nhắc xoá.
- 5 warnings eslint ở `DocumentReader.tsx` (dòng 11, 593, 802, 2028, 2182).

## Điểm tốt đã xác nhận

Service-role key không xuất hiện trong `src/` (chỉ scripts ops); không có SSRF (crawler chỉ fetch 4 portal hardcode, timeout 2.5s); cron fail-closed trong production; migrations 003/004 sửa advisor đúng cách; writes không có policy `USING(true)`; secrets chưa từng commit vào git; coverage test regression rất rộng (29 nhóm) — chỉ cần chạy được trên máy dev để xác nhận pass.

## Việc cần làm trước khi tuyên bố "hoàn chỉnh"

1. Sửa C1 (schema seed/docs) rồi chạy seed + `npm test` + `npm run build` trên máy Windows, xác nhận cả ba pass.
2. Migration chặn tự đổi role (C2) + RLS cho 3 bảng (H3).
3. Tắt default demo mode (H1) và chuyển AI chat sang dữ liệu thật + auth (H2).
4. Dọn MEDIUM/LOW theo danh sách.
