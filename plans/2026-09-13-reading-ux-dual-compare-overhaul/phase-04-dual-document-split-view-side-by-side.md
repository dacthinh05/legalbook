# Phase 4: Dual Document Split View (Side-by-Side Comparison)

## 1. Mục tiêu
Cung cấp chế độ đọc chia đôi màn hình 50% - 50% (Dual Split View) để người dùng có thể mở và đối chiếu trực tiếp giữa 2 văn bản bất kỳ một cách dễ dàng và trực quan.

## 2. Thiết kế Chức năng
1. **Nút "Đọc đối chiếu song song" (Dual Split View Button):**
   - Đặt trên thanh công cụ Reader Header của `DocumentReader.tsx`, cạnh nút "Tập trung".
   - Icon: `<Columns2 className="w-4 h-4 text-blue-600" />` + Label: `"Đọc đối chiếu"`.
2. **Bộ chọn Văn bản Đối chiếu (Compare Document Selector):**
   - Khi bấm vào nút "Đọc đối chiếu", một modal/dropdown gọn gàng xuất hiện:
     - Gợi ý sẵn các văn bản có quan hệ trực tiếp (ví dụ: đang đọc Công văn 3058 thì gợi ý ngay Nghị định 132/2020 về giao dịch liên kết).
     - Ô tìm kiếm nhanh số hiệu hoặc tên bất kỳ văn bản nào khác trong kho 130 tài liệu.
3. **Không gian Đọc Song Song (Side-by-Side Split Workspace):**
   - Khung đọc chia đôi: Cột Trái (Văn bản hiện tại) | Cột Phải (Văn bản đối chiếu).
   - Mỗi bên có thanh tiêu đề độc lập (Tên văn bản, số hiệu, nút đổi văn bản, nút đóng cột đối chiếu).
   - **Tính năng Khóa Cuộn Đồng Bộ (Sync Scroll Toggle):** Khi bật nút "Cuộn đồng bộ", cuộn bên trái thì bên phải cuộn theo tỉ lệ tương ứng để đối chiếu liên tục; khi tắt thì cuộn độc lập từng bên.
   - Hỗ trợ xem toàn văn HTML chuẩn của cả 2 văn bản.

## 3. Nghiệm thu
- Người dùng có thể mở song song 2 văn bản bất kỳ (ví dụ: Công văn và Nghị định), xem trọn vẹn cả 2 bên cùng lúc trên một màn hình mà không cần chuyển tab.
- Thao tác đóng mở mượt mà, phản hồi dưới 100ms.
