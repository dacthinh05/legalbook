# Phase 3: Category Relinking & Relations Wiring

## 1. Mục tiêu
Cập nhật bảng liên kết danh mục (`DEMO_CATEGORY_LINKS`) và bảng quan hệ pháp lý (`DEMO_RELATIONS`), loại bỏ các liên kết trỏ tới văn bản ảo đã xóa và thiết lập các quan hệ phả hệ chuẩn xác cho văn bản thật.

## 2. Nhiệm vụ Chi tiết
1. **Dọn dẹp Category Links**:
   - Quét qua `DEMO_CATEGORY_LINKS`: Xóa các record có `document_id` thuộc danh sách 59 văn bản ảo đã thanh lọc.
   - Gắn các văn bản thật vào danh mục tương ứng (Thuế TNDN, Thuế GTGT, Thuế TNCN, Hóa đơn - Chứng từ, Kế toán - Kiểm toán, Bảo hiểm xã hội).
2. **Tái thiết lập Document Relations (Cây Phả hệ & Viện dẫn)**:
   - Xóa bỏ các quan hệ mồ côi (dangling relations: trỏ tới ID không tồn tại).
   - Nối quan hệ chuẩn 4 tầng:
     - `Luật Thuế GTGT 48/2024` $\rightarrow$ các Nghị định hướng dẫn.
     - `Luật Quản lý thuế 38/2019` $\rightarrow$ `Nghị định 125/2020` (Xử phạt) & `Nghị định 123/2020` (Hóa đơn) $\rightarrow$ `Thông tư 80/2021/TT-BTC` $\rightarrow$ Các Công văn giải đáp vướng mắc.
     - `Luật Doanh nghiệp 59/2020` $\rightarrow$ `Nghị định 01/2021` (Đăng ký DN).
     - `Luật Kế toán 88/2015` $\rightarrow$ `Thông tư 200/2014/TT-BTC`.
3. **Cập nhật Cây Danh mục Sidebar (`CategoryTree.tsx`)**:
   - Đảm bảo số lượng đếm văn bản (count badges) hiển thị chính xác theo từng danh mục.

## 3. Nghiệm thu Phase 3
- Không có bất kỳ liên kết quan hệ (relation) nào trỏ tới văn bản không tồn tại.
- Mọi danh mục chính đều có văn bản thật tương ứng.
