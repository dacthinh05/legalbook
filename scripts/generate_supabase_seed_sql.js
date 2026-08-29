const fs = require('fs');
const path = require('path');

// Import real categories, documents, links and relations from demo-data.ts / paco-data.ts
const demoData = require('../src/lib/paco-data.ts');

const seedSql = `-- ============================================================
-- LegalBook - Supabase Seed SQL
-- Dữ liệu Văn bản Pháp luật Chính thức 2025 - 2026
-- ============================================================

-- 1. Thêm danh mục pháp luật (Categories)
INSERT INTO categories (id, parent_id, name, slug, description, order_index, icon, is_active)
VALUES
  ('cat-accounting', NULL, 'Kế toán', 'ke-toan', 'Luật, nghị định, thông tư, chuẩn mực kế toán', 1, 'BookOpen', true),
  ('cat-audit', NULL, 'Kiểm toán', 'kiem-toan', 'Luật, nghị định, chuẩn mực kiểm toán', 2, 'ClipboardCheck', true),
  ('cat-tax', NULL, 'Thuế', 'thue', 'Các sắc thuế và văn bản hướng dẫn', 3, 'Calculator', true),
  ('cat-bhxh', NULL, 'Bảo hiểm xã hội', 'bao-hiem-xa-hoi', 'Luật BHXH, BHYT, BHTN và văn bản hướng dẫn', 4, 'Shield', true),
  ('cat-labor', NULL, 'Lao động và tiền lương', 'lao-dong-tien-luong', 'Bộ luật lao động, lương tối thiểu, HĐLĐ', 5, 'Users', true),
  ('cat-enterprise', NULL, 'Doanh nghiệp', 'doanh-nghiep', 'Luật Doanh nghiệp, thành lập, giải thể', 6, 'Building2', true),
  ('cat-investment', NULL, 'Đầu tư', 'dau-tu', 'Luật Đầu tư, FDI, ưu đãi đầu tư', 7, 'TrendingUp', true),

  ('cat-acc-luat', 'cat-accounting', 'Luật kế toán', 'ke-toan-luat', NULL, 1, NULL, true),
  ('cat-acc-nd', 'cat-accounting', 'Nghị định kế toán', 'ke-toan-nghi-dinh', NULL, 2, NULL, true),
  ('cat-acc-tt', 'cat-accounting', 'Thông tư kế toán', 'ke-toan-thong-tu', NULL, 3, NULL, true),
  ('cat-acc-cm', 'cat-accounting', 'Chuẩn mực kế toán (VAS)', 'ke-toan-chuan-muc', NULL, 4, NULL, true),
  ('cat-acc-cv', 'cat-accounting', 'Công văn hướng dẫn', 'ke-toan-cong-van', NULL, 5, NULL, true),

  ('cat-aud-luat', 'cat-audit', 'Luật kiểm toán', 'kiem-toan-luat', NULL, 1, NULL, true),
  ('cat-aud-nd', 'cat-audit', 'Nghị định kiểm toán', 'kiem-toan-nghi-dinh', NULL, 2, NULL, true),
  ('cat-aud-cm', 'cat-audit', 'Chuẩn mực kiểm toán (VSA)', 'kiem-toan-chuan-muc', NULL, 3, NULL, true),
  ('cat-aud-hd', 'cat-audit', 'Hướng dẫn nghiệp vụ', 'kiem-toan-huong-dan', NULL, 4, NULL, true),

  ('cat-tax-gtgt', 'cat-tax', 'Thuế GTGT', 'thue-gtgt', 'Thuế giá trị gia tăng', 1, NULL, true),
  ('cat-tax-tndn', 'cat-tax', 'Thuế TNDN', 'thue-tndn', 'Thuế thu nhập doanh nghiệp', 2, NULL, true),
  ('cat-tax-tncn', 'cat-tax', 'Thuế TNCN', 'thue-tncn', 'Thuế thu nhập cá nhân', 3, NULL, true),
  ('cat-tax-hd', 'cat-tax', 'Hóa đơn, chứng từ', 'hoa-don-chung-tu', NULL, 4, NULL, true),
  ('cat-tax-qlt', 'cat-tax', 'Quản lý thuế', 'quan-ly-thue', NULL, 5, NULL, true),
  ('cat-tax-nt', 'cat-tax', 'Thuế nhà thầu', 'thue-nha-thau', NULL, 6, NULL, true),

  ('cat-gtgt-luat', 'cat-tax-gtgt', 'Luật thuế GTGT', 'thue-gtgt-luat', NULL, 1, NULL, true),
  ('cat-gtgt-nd', 'cat-tax-gtgt', 'Nghị định thuế GTGT', 'thue-gtgt-nghi-dinh', NULL, 2, NULL, true),
  ('cat-gtgt-tt', 'cat-tax-gtgt', 'Thông tư thuế GTGT', 'thue-gtgt-thong-tu', NULL, 3, NULL, true),
  ('cat-gtgt-cv', 'cat-tax-gtgt', 'Công văn thuế GTGT', 'thue-gtgt-cong-van', NULL, 4, NULL, true),

  ('cat-bhxh-luat', 'cat-bhxh', 'Luật BHXH', 'bhxh-luat', NULL, 1, NULL, true),
  ('cat-bhxh-nd', 'cat-bhxh', 'Nghị định BHXH', 'bhxh-nghi-dinh', NULL, 2, NULL, true),
  ('cat-bhxh-tt', 'cat-bhxh', 'Thông tư BHXH', 'bhxh-thong-tu', NULL, 3, NULL, true),
  ('cat-bhxh-qd', 'cat-bhxh', 'Quyết định BHXH', 'bhxh-quyet-dinh', NULL, 4, NULL, true),
  ('cat-bhxh-cv', 'cat-bhxh', 'Công văn BHXH', 'bhxh-cong-van', NULL, 5, NULL, true),

  ('cat-labor-bllao', 'cat-labor', 'Bộ luật lao động', 'lao-dong-bo-luat', NULL, 1, NULL, true),
  ('cat-labor-nd', 'cat-labor', 'Nghị định lao động', 'lao-dong-nghi-dinh', NULL, 2, NULL, true),
  ('cat-labor-tt', 'cat-labor', 'Thông tư lao động', 'lao-dong-thong-tu', NULL, 3, NULL, true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;

-- 2. Thêm các Storage Buckets cho Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents', 'documents', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy cho phép đọc public từ storage
CREATE POLICY "Public Access Documents" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
`;

fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), seedSql);
console.log('Saved supabase/seed.sql');
