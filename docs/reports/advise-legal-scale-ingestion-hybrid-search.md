# Báo Cáo Tư Vấn Chiến Lược: Mở Rộng Quy Mô Dữ Liệu, Tự Động Hóa Ingestion & Supabase Hybrid Search (LegalBook)

> **Tác giả:** Cố vấn Kỹ thuật Cấp cao (ak-advise)  
> **Dự án:** LegalBook — Hệ Sinh Thái Tra Cứu & Phân Tích Pháp Luật Thuế Kế Toán  
> **Ngày lập:** 29/08/2026  
> **Mục tiêu:** Mở rộng quy mô từ 62 văn bản mẫu lên 1.500+ văn bản thực tế, tự động hóa Ingestion Pipeline và xây dựng Supabase Hybrid Search (BM25 + pgvector).

---

## 1. ĐÁNH GIÁ TỔNG QUAN (VERDICT)

LegalBook hiện đã sở hữu giao diện Reader, bộ công cụ AI RAG, phân tích liên văn bản và ma trận kiểm thử hồi quy (253/253 tests pass) vượt trội so với hầu hết các nền tảng tra cứu pháp luật truyền thống. **Tuy nhiên, rào cản lớn nhất ngăn LegalBook trở thành công cụ làm việc hàng ngày của kế toán, kiểm toán viên và chuyên viên pháp chế chính là: Độ phủ dữ liệu (Data Coverage).**

Việc bạn lựa chọn tập trung mở rộng dữ liệu vào **Chuyên đề Thuế, Kế toán, BHXH, Lao động & Doanh nghiệp giai đoạn 2024–2026** thay vì cào dàn trải 50 năm văn bản cũ là **quyết định chiến lược hoàn toàn đúng đắn**. Giai đoạn 2024–2026 là thời kỳ chuyển giao lịch sử của pháp luật kinh tế Việt Nam (Luật Thuế TNDN mới, Luật Thuế GTGT 2024, Luật Thuế TNCN 2025, Thông tư chế độ kế toán mới thay thế TT 200/2014, hóa đơn điện tử máy tính tiền, giảm trừ gia cảnh 15.5 triệu). Khách hàng sẵn sàng trả tiền để có dữ liệu mới nhất, chuẩn xác nhất và có file gốc (.docx/.pdf) để tải về.

---

## 2. NHỮNG VIỆC NÊN LÀM (WHAT YOU SHOULD DO)

### 1. Xây dựng Pipeline Ingestion 4 Tầng Tự Động Hóa
```
[Crawler Engine (Node.js/Python)]
       │
       ▼
[Tải file gốc (.docx / .pdf / HTML)] ──► [Lưu trữ Supabase Storage]
       │
       ▼
[Parser & Converter NĐ 30/2020] ──────► [Tạo DOM ID dieu-X, chuong-X chuẩn]
       │
       ▼
[Article-Level Chunking & Embeddings] ─► [pgvector + tsvector trên Supabase]
       │
       ▼
[Bộ Chấm Điểm 4 Chiều (Quality Score)]
       ├── Điểm >= 90% ───────────────► Auto-Publish (Lên Live tức thì)
       └── Điểm < 90% ────────────────► Đưa vào Hàng Đợi Admin (/admin/verification-queue)
```

### 2. Triển khai Article-Level Chunking & Supabase Hybrid Search
- **Không băm theo độ dài token cố định (500 tokens):** Văn bản pháp lý có đơn vị ngữ nghĩa độc lập là **Điều (Article)** và **Khoản (Clause)**. Băm theo từng Điều giúp trích dẫn không bao giờ bị đứt đoạn câu và luôn gắn liền với `id="dieu-X"`.
- **Hybrid Search RPC (`search_provisions_hybrid`):**
  - **BM25 Keyword Search (`tsvector`):** Khớp chính xác các từ khóa kỹ thuật (ví dụ: `15,5 triệu`, `EBITDA 30%`, `hóa đơn máy tính tiền`).
  - **Vector Semantic Search (`pgvector`):** Khớp ý nghĩa ngữ cảnh (ví dụ: `chi phí tiếp khách quá mức`, `điều kiện thanh toán bằng thẻ cá nhân`).
  - **Reciprocal Rank Fusion (RRF):** Kết hợp điểm số 2 luồng để xếp hạng kết quả chính xác nhất trong < 150ms.

### 3. Tận dụng Tệp Gốc .DOCX làm "Nguồn Chân Lý" (Ground Truth)
- Ưu tiên parse nội dung từ file `.docx` chính thống do Bộ Tài chính, Tổng cục Thuế phát hành (vì file DOCX đã có sẵn cấu trúc paragraph, heading, bảng biểu sạch, không bị rác HTML hay dính mã độc tracking).
- Tệp PDF scan chỉ đưa qua OCR khi không tìm thấy file Word gốc.

---

## 3. NHỮNG VIỆC TUYỆT ĐỐI KHÔNG NÊN LÀM (WHAT YOU SHOULDN'T DO)

1. **KHÔNG cào diện rộng văn bản cũ trước năm 2015:** Dữ liệu cũ bị lỗi font TCVN3/VNI, file PDF scan mờ, văn bản đã hết hiệu lực chiếm tới 70% dung lượng nhưng người dùng thực tế không ai đọc, chỉ làm loãng vector database và tốn chi phí embeddings vô ích.
2. **KHÔNG tự động ghi đè quan hệ pháp lý mà AI suy đoán vào CSDL:** AI chỉ có nhiệm vụ đề xuất (suggestions); chỉ những văn bản có căn cứ rõ ràng (`Căn cứ Luật số...`, `Sửa đổi Điều 5 của Nghị định...`) mới được ghi vào bảng quan hệ chính thức.
3. **KHÔNG dùng pure vector search cho pháp luật:** Thuật toán vector thuần túy thường xuyên "bỏ quên" các con số định lượng cụ thể (như `5 triệu`, `20%`, `30 ngày`). Bắt buộc phải là **Hybrid Search (Từ khóa + Vector)**.
4. **KHÔNG lưu trữ file đính kèm trực tiếp trong PostgreSQL:** Phải đưa tệp `.docx`/`.pdf` lên Object Storage (Supabase Storage / Cloudflare R2), cơ sở dữ liệu chỉ lưu URL và hash checksum (`source_file_hash`).

---

## 4. GIẢI PHÁP TỐI ƯU CHI PHÍ & HIỆU SUẤT (BETTER & CHEAPER PATHS)

| Hạng mục | Phương án Đắt đỏ / Cồng kềnh | Phương án Khuyên dùng (LegalBook) | Tiết kiệm / Hiệu quả |
| :--- | :--- | :--- | :--- |
| **Embeddings Model** | Tự dựng model server GPU (vLLM / HuggingFace) | `text-embedding-3-small` của OpenAI ($0.02 / 1M tokens) | Tiết kiệm 90% chi phí hạ tầng, chất lượng tiếng Việt xuất sắc |
| **Vector Database** | Mua cụm Pinecone / Milvus riêng biệt | Tích hợp sẵn extension `pgvector` ngay trong PostgreSQL của Supabase | Không cần đồng bộ dữ liệu giữa 2 database, độ trễ < 50ms |
| **Lưu trữ Tệp gốc** | AWS S3 Standard có phí băng thông cao | Supabase Storage tích hợp hoặc Cloudflare R2 (Miễn phí egress bandwidth) | Giảm 100% chi phí tải file của người dùng |
| **OCR Scanner** | Thuê API OCR trả phí đắt đỏ của Google Cloud Vision | Worker Python Document Processor (`pdfplumber` + `mammoth` + `Tesseract/PaddleOCR` cục bộ) | Tự chủ hoàn toàn, chi phí 0đ |

---

## 5. LỘ TRÌNH TRIỂN KHAI CHI TIẾT (HOW TO GET THERE)

```
[Tuần 1: Database & Hybrid Search] ──► [Tuần 2: Crawler Thuế & Kế toán 2024-2026] ──► [Tuần 3: Ingestion Pipeline & Quality Governance]
```

### Bước 1: Khởi tạo Cấu trúc pgvector & Hybrid RPC trên Supabase
1. Kích hoạt extension `pgvector` trên PostgreSQL Supabase.
2. Tạo bảng `document_provisions` lưu từng Điều/Khoản:
   - `id`, `document_id`, `article_number`, `article_title`, `clause_content`, `tsv (tsvector)`, `embedding (vector(1536))`.
3. Viết hàm SQL RPC `search_provisions_hybrid` kết hợp full-text và vector similarity qua thuật toán RRF (Reciprocal Rank Fusion).

### Bước 2: Xây dựng Crawler Chuyên đề Thuế & Kế toán (2024–2026)
1. Tải danh mục văn bản mới từ 3 nguồn uy tín:
   - Cổng Thông tin Điện tử Tổng cục Thuế / Cục Thuế.
   - Cổng TTĐT Bộ Tài chính & Bộ Kế hoạch và Đầu tư.
   - Nguồn kiểm chứng Thư Viện Pháp Luật.
2. Tải song song 3 định dạng: Nội dung HTML, tệp `.docx` (ưu tiên 1), tệp `.pdf` (ưu tiên 2).

### Bước 3: Đóng gói Pipeline Tự động hóa & Hybrid Auto-Publish
1. Pipeline tự động parse HTML/DOCX sang cấu trúc chuẩn Nghị định 30/2020 (`<h2 id="dieu-X">`, `<div id="chuong-X">`).
2. Sinh vector embedding cho từng Điều và lưu vào `document_provisions`.
3. Chạy bộ lọc chấm điểm 4 chiều:
   - *Đủ metadata, sạch định dạng, có file gốc đính kèm, trích dẫn chuẩn*.
   - Điểm $\ge 90\%$ $\rightarrow$ Công khai ngay (`is_published: true`).
   - Điểm $< 90\%$ $\rightarrow$ Xếp vào `/admin/verification-queue` để Admin duyệt 1-click.

---

## 6. LỢI ÍCH MANG LẠI (BENEFITS)

- **Độ tin cậy tuyệt đối:** 100% kết quả tìm kiếm và trích dẫn AI đều trỏ đến đúng Điều/Khoản thật, có thể mở đọc và tải file Word gốc tức thì.
- **Tốc độ tra cứu siêu tốc:** Tìm kiếm ngữ nghĩa kết hợp từ khóa trả kết quả trong **dưới 150ms**.
- **Tiết kiệm 95% công sức biên tập:** Hệ thống tự động thu thập, làm sạch và gắn thẻ mục lục; đội ngũ biên tập chỉ cần xử lý các trường hợp cảnh báo chất lượng thấp.

---

## 7. ĐÁNH ĐỔI & RỦI RO (TRADE-OFFS)

- **Chi phí API Embeddings ban đầu:** Khoảng $5 – $15 cho việc nhúng vector toàn bộ 1.500 văn bản (khoảng 30.000 Điều khoản). Chi phí này rất nhỏ và chỉ phát sinh một lần lúc ingest.
- **Rủi ro chống cào (Rate Limit / Anti-Scraping):** Các cổng thông tin có thể chặn IP nếu gửi request quá nhanh. Cần thiết lập rate-limiting (tối đa 2 request/giây) và cơ chế xoay vòng User-Agent / Proxy.

---

## 8. CHECKLIST HÀNH ĐỘNG & TIÊU CHÍ HOÀN THÀNH (SUCCESS METRICS)

### Checklist Hành Động (Work Checklist)
- [ ] **DB-01:** Tạo migration kích hoạt `pgvector` và tạo bảng `document_provisions` trong Supabase.
- [ ] **DB-02:** Tạo function RPC `search_provisions_hybrid` kết hợp `tsvector` và `vector(1536)` với RRF scoring.
- [ ] **CR-01:** Viết script crawler chuyên đề Thuế - Kế toán - Lao động (2024–2026) tải metadata và tệp `.docx`/`.pdf`.
- [ ] **PIPE-01:** Tích hợp bộ parse Article-Level Chunking tự động bóc tách từng Điều thành vector embeddings.
- [ ] **GOV-01:** Tích hợp bộ chấm điểm chất lượng tự động: Điểm $\ge 90\%$ phát hành ngay, điểm $< 90\%$ đưa vào Hàng đợi Admin.
- [ ] **UI-01:** Cập nhật ô tìm kiếm toàn cục để gọi `search_provisions_hybrid` khi người dùng nhập câu hỏi ngữ nghĩa dài.
- [ ] **ADMIN-01:** Hoàn thiện bảng điều khiển quản lý crawler và tình trạng đồng bộ dữ liệu tại `/admin/crawler`.

### Tiêu Chí Đo Lường Thành Công (Success Metrics)
1. **Số lượng văn bản:** Tối thiểu **1.000+ văn bản** chuyên đề 2024–2026 được nạp thành công vào hệ thống.
2. **Tỷ lệ có file đính kèm gốc:** Tối thiểu **90% văn bản** có file `.docx` hoặc `.pdf` gốc sẵn sàng tải về.
3. **Độ trễ tìm kiếm (Search Latency):** Phản hồi tìm kiếm Hybrid Search trung bình **dưới 150ms** trên 30.000 Điều khoản.
4. **Tỷ lệ khớp mục lục DOM:** Duy trì **100% mục lục** trích xuất khớp chính xác với ID heading trong Document Reader (`dieu-X`, `chuong-X`).
5. **Độ tin cậy RAG (Zero-Hallucination):** 100% câu trả lời AI đều có trích dẫn nguồn có thực và có thể nhấp chuột mở ngay trong Reader.
