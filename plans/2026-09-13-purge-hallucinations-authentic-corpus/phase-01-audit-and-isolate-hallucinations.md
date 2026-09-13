# Phase 1: Audit & Isolate Hallucinations

## 1. Mục tiêu
Xác định và thanh lọc dứt điểm toàn bộ 59 văn bản ảo, lỗi định dạng, số hiệu giả lập hoặc mang signer generic khỏi tập dữ liệu `src/lib/demo-data.ts`.

## 2. Danh sách Tiêu chí Nhận diện Văn bản Cần Thanh lọc
1. **Số hiệu tương lai / chưa ban hành**:
   - `58/2026/TT-BTC`, `144/2026/NĐ-CP`, `08/2026/TT-BLĐTBXH`, `20/2026/TT-BTC`, `121/2026/TT-BKHĐT`, `87/2026/TT-BTC`, `20-2026-TT-BTC`
   - `99/2025/TT-BTC`, `168/2025/NĐ-CP`, `20/2025NĐ-CP`, `248/2025/NĐ-CP`, `210/2025/NĐ-CP`, `76/2025/QH15`, `110/2025/UBTVQH15`, `107/2025/TT-BTC`, `68/2025/TT-BKHĐT`
   - `320/2025/NĐ-CP`, `167/2025/NĐ-CP`, `69/2025/TT-BTC`, `101/2025/TT-BTC`, `174/2025/NĐ-CP`, `67/2025/QH15`, `20/2025/NĐ-CP`, `181/2025/NĐ-CP`, `109/2025/QH15`, `70/2025/NĐ-CP`, `70/2025NĐ-CP`
2. **Số hiệu dị dạng / thiếu dấu**:
   - `2026` (tiêu đề "58 HD che do ke toan cho DN sieu nho")
   - `123/2020/N` (bị gãy ký tự số hiệu)
3. **Signer placeholder**:
   - Tất cả các văn bản có `signer === 'Lãnh đạo cơ quan ban hành'` mà không có quyết định ban hành thực tế.
4. **Văn bản stub ngắn cụt**:
   - Các bản ghi Luật/Nghị định/Thông tư có độ dài `html_content` dưới 2.000 ký tự (thiếu toàn văn điều luật).

## 3. Các bước Thực thi
1. Tạo script kiểm định `scripts/audit_and_purge_synthetic_docs.ts`.
2. Trích xuất danh sách 120 văn bản thực tế, chính thống (bao gồm các Luật 48/2024, 125/2020, 123/2020, 200/2014, 132/2020, và hơn 90 công văn thực tế từ TCT).
3. Đảm bảo các văn bản thật này được giữ lại đầy đủ metadata: ID, số hiệu, ngày ban hành, người ký thật, cơ quan ban hành.
4. Lưu bản sao lưu trước khi thanh lọc vào `docs/snapshots/corpus_pre_purge_20260913.json`.

## 4. Nghiệm thu Phase 1
- `DEMO_DOCUMENTS` không còn bất kỳ văn bản nào mang năm tương lai hoặc signer giả lập.
