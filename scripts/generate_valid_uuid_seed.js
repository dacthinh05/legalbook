const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate deterministic UUID v5/v4-like string from text key
function toUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

console.log('cat-accounting ->', toUUID('cat-accounting'));
console.log('cat-acc-luat ->', toUUID('cat-acc-luat'));

// Categories list
const categories = [
  { id: 'cat-accounting', parent_id: null, name: 'Kế toán', slug: 'ke-toan', description: 'Luật, nghị định, thông tư, chuẩn mực kế toán', order_index: 1, icon: 'BookOpen' },
  { id: 'cat-audit', parent_id: null, name: 'Kiểm toán', slug: 'kiem-toan', description: 'Luật, nghị định, chuẩn mực kiểm toán', order_index: 2, icon: 'ClipboardCheck' },
  { id: 'cat-tax', parent_id: null, name: 'Thuế', slug: 'thue', description: 'Các sắc thuế và văn bản hướng dẫn', order_index: 3, icon: 'Calculator' },
  { id: 'cat-bhxh', parent_id: null, name: 'Bảo hiểm xã hội', slug: 'bao-hiem-xa-hoi', description: 'Luật BHXH, BHYT, BHTN và văn bản hướng dẫn', order_index: 4, icon: 'Shield' },
  { id: 'cat-labor', parent_id: null, name: 'Lao động và tiền lương', slug: 'lao-dong-tien-luong', description: 'Bộ luật lao động, lương tối thiểu, HĐLĐ', order_index: 5, icon: 'Users' },
  { id: 'cat-enterprise', parent_id: null, name: 'Doanh nghiệp', slug: 'doanh-nghiep', description: 'Luật Doanh nghiệp, thành lập, giải thể', order_index: 6, icon: 'Building2' },
  { id: 'cat-investment', parent_id: null, name: 'Đầu tư', slug: 'dau-tu', description: 'Luật Đầu tư, FDI, ưu đãi đầu tư', order_index: 7, icon: 'TrendingUp' },

  { id: 'cat-acc-luat', parent_id: 'cat-accounting', name: 'Luật kế toán', slug: 'ke-toan-luat', description: null, order_index: 1, icon: null },
  { id: 'cat-acc-nd', parent_id: 'cat-accounting', name: 'Nghị định kế toán', slug: 'ke-toan-nghi-dinh', description: null, order_index: 2, icon: null },
  { id: 'cat-acc-tt', parent_id: 'cat-accounting', name: 'Thông tư kế toán', slug: 'ke-toan-thong-tu', description: null, order_index: 3, icon: null },
  { id: 'cat-acc-cm', parent_id: 'cat-accounting', name: 'Chuẩn mực kế toán (VAS)', slug: 'ke-toan-chuan-muc', description: null, order_index: 4, icon: null },
  { id: 'cat-acc-cv', parent_id: 'cat-accounting', name: 'Công văn hướng dẫn', slug: 'ke-toan-cong-van', description: null, order_index: 5, icon: null },

  { id: 'cat-aud-luat', parent_id: 'cat-audit', name: 'Luật kiểm toán', slug: 'kiem-toan-luat', description: null, order_index: 1, icon: null },
  { id: 'cat-aud-nd', parent_id: 'cat-audit', name: 'Nghị định kiểm toán', slug: 'kiem-toan-nghi-dinh', description: null, order_index: 2, icon: null },
  { id: 'cat-aud-cm', parent_id: 'cat-audit', name: 'Chuẩn mực kiểm toán (VSA)', slug: 'kiem-toan-chuan-muc', description: null, order_index: 3, icon: null },
  { id: 'cat-aud-hd', parent_id: 'cat-audit', name: 'Hướng dẫn nghiệp vụ', slug: 'kiem-toan-huong-dan', description: null, order_index: 4, icon: null },

  { id: 'cat-tax-gtgt', parent_id: 'cat-tax', name: 'Thuế GTGT', slug: 'thue-gtgt', description: 'Thuế giá trị gia tăng', order_index: 1, icon: null },
  { id: 'cat-tax-tndn', parent_id: 'cat-tax', name: 'Thuế TNDN', slug: 'thue-tndn', description: 'Thuế thu nhập doanh nghiệp', order_index: 2, icon: null },
  { id: 'cat-tax-tncn', parent_id: 'cat-tax', name: 'Thuế TNCN', slug: 'thue-tncn', description: 'Thuế thu nhập cá nhân', order_index: 3, icon: null },
  { id: 'cat-tax-hd', parent_id: 'cat-tax', name: 'Hóa đơn, chứng từ', slug: 'hoa-don-chung-tu', description: null, order_index: 4, icon: null },
  { id: 'cat-tax-qlt', parent_id: 'cat-tax', name: 'Quản lý thuế', slug: 'quan-ly-thue', description: null, order_index: 5, icon: null },
  { id: 'cat-tax-nt', parent_id: 'cat-tax', name: 'Thuế nhà thầu', slug: 'thue-nha-thau', description: null, order_index: 6, icon: null },

  { id: 'cat-gtgt-luat', parent_id: 'cat-tax-gtgt', name: 'Luật thuế GTGT', slug: 'thue-gtgt-luat', description: null, order_index: 1, icon: null },
  { id: 'cat-gtgt-nd', parent_id: 'cat-tax-gtgt', name: 'Nghị định thuế GTGT', slug: 'thue-gtgt-nghi-dinh', description: null, order_index: 2, icon: null },
  { id: 'cat-gtgt-tt', parent_id: 'cat-tax-gtgt', name: 'Thông tư thuế GTGT', slug: 'thue-gtgt-thong-tu', description: null, order_index: 3, icon: null },
  { id: 'cat-gtgt-cv', parent_id: 'cat-tax-gtgt', name: 'Công văn thuế GTGT', slug: 'thue-gtgt-cong-van', description: null, order_index: 4, icon: null },

  { id: 'cat-bhxh-luat', parent_id: 'cat-bhxh', name: 'Luật BHXH', slug: 'bhxh-luat', description: null, order_index: 1, icon: null },
  { id: 'cat-bhxh-nd', parent_id: 'cat-bhxh', name: 'Nghị định BHXH', slug: 'bhxh-nghi-dinh', description: null, order_index: 2, icon: null },
  { id: 'cat-bhxh-tt', parent_id: 'cat-bhxh', name: 'Thông tư BHXH', slug: 'bhxh-thong-tu', description: null, order_index: 3, icon: null },
  { id: 'cat-bhxh-qd', parent_id: 'cat-bhxh', name: 'Quyết định BHXH', slug: 'bhxh-quyet-dinh', description: null, order_index: 4, icon: null },
  { id: 'cat-bhxh-cv', parent_id: 'cat-bhxh', name: 'Công văn BHXH', slug: 'bhxh-cong-van', description: null, order_index: 5, icon: null },

  { id: 'cat-labor-bllao', parent_id: 'cat-labor', name: 'Bộ luật lao động', slug: 'lao-dong-bo-luat', description: null, order_index: 1, icon: null },
  { id: 'cat-labor-nd', parent_id: 'cat-labor', name: 'Nghị định lao động', slug: 'lao-dong-nghi-dinh', description: null, order_index: 2, icon: null },
  { id: 'cat-labor-tt', parent_id: 'cat-labor', name: 'Thông tư lao động', slug: 'lao-dong-thong-tu', description: null, order_index: 3, icon: null }
];

let catSql = `-- 1. THÊM DANH MỤC PHÁP LUẬT (CATEGORIES)\nINSERT INTO public.categories (id, parent_id, name, slug, description, order_index, icon, is_active)\nVALUES\n`;

const catValues = categories.map(c => {
  const uuid = toUUID(c.id);
  const parentUuid = c.parent_id ? `'${toUUID(c.parent_id)}'` : 'NULL';
  const desc = c.description ? `'${c.description.replace(/'/g, "''")}'` : 'NULL';
  const icon = c.icon ? `'${c.icon}'` : 'NULL';
  return `  ('${uuid}', ${parentUuid}, '${c.name.replace(/'/g, "''")}', '${c.slug}', ${desc}, ${c.order_index}, ${icon}, true)`;
});

catSql += catValues.join(',\n') + '\nON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, parent_id = EXCLUDED.parent_id;\n\n';

// Storage setup
const storageSql = `-- 2. TẠO STORAGE BUCKETS (LƯU TỆP TÀI LIỆU)\nINSERT INTO storage.buckets (id, name, public)\nVALUES \n  ('documents', 'documents', true),\n  ('avatars', 'avatars', true)\nON CONFLICT (id) DO NOTHING;\n`;

const fullSeedSql = `-- ============================================================
-- LegalBook - Supabase Seed SQL (Valid RFC-4122 UUID Format)
-- Dữ liệu Danh mục & Cấu hình Storage
-- ============================================================

${catSql}
${storageSql}
`;

fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), fullSeedSql);
console.log('Saved valid UUID seed.sql!');
