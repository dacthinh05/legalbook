# Phase 4: Verification & Anti-Fake Quality Gate

## 1. Mục tiêu
Thẩm định toàn diện hệ thống sau khi thanh lọc và nạp dữ liệu thật bằng bộ kiểm thử tự động và bộ lọc chất lượng pháp lý.

## 2. Các Kiểm định Bắt buộc
1. **Kiểm tra Chất lượng Nội dung (`ContentQualityValidator`)**:
   - Chạy kiểm tra toàn bộ văn bản qua hàm `ContentQualityValidator.inspectContent()`.
   - Điều kiện bắt buộc:
     - `isFakeOrPlaceholder === false` trên 100% văn bản.
     - `isSummaryRepetition === false` trên 100% văn bản.
     - `quality_score >= 85` đối với tất cả văn bản quy phạm (Luật, Nghị định, Thông tư).
2. **Kiểm tra Trích dẫn Thông minh (`Citation Linker`)**:
   - Thử nghiệm mở văn bản trên DocumentReader, bấm vào popover `📌` xem trước điều khoản, xác nhận nhảy đúng vị trí neo `dieu-X`.
3. **Kiểm tra Tìm kiếm Toàn diện (`Global Search V2`)**:
   - Thử nghiệm tìm kiếm các tình huống kiểm toán: "chi phí xăng xe khoán", "hóa đơn trên 20 triệu tiền mặt", "thời hạn nộp quyết toán thuế"... xác nhận trả về đúng Công văn và Điều luật tương ứng.
4. **Bộ Kiểm thử Tự động Toàn diện (`npm run test`)**:
   - Thực thi `scripts/run_regression_tests.mjs`.
   - Kết quả bắt buộc: 318/318 tests PASS (0 fail, 0 skipped).

## 3. Nghiệm thu Phase 4
- Toàn bộ pipeline kiểm thử xanh 100%.
- Báo cáo audit xác nhận hệ thống hoàn toàn sạch văn bản ảo.
