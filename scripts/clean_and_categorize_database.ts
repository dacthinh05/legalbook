/**
 * Dedicated Category Synchronizer: Links all 25+ real documents to root and child categories.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(): Record<string, string> {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) env[k] = v.join('=');
  });
  return env;
}

function removeTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

async function main() {
  console.log('🔄 ĐỒNG BỘ DANH MỤC PHÁP LUẬT CHO TOÀN BỘ VĂN BẢN...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  const { data: docs } = await supabase.from('legal_documents').select('id, document_number, title, document_type');
  const { data: cats } = await supabase.from('categories').select('id, name, parent_id, slug');

  if (!docs || !cats) {
    console.error('Không tải được documents hoặc categories');
    return;
  }

  // Clear existing links
  await supabase.from('document_category_links').delete().neq('document_id', '00000000-0000-0000-0000-000000000000');

  const linksToInsert: { document_id: string; category_id: string }[] = [];

  for (const doc of docs) {
    const num = doc.document_number;
    const title = doc.title;
    const type = doc.document_type;
    const matchedCategoryIds = new Set<string>();

    const linkCategoryByName = (catName: string) => {
      const targetToneFree = removeTones(catName);
      const cat = cats.find(c => removeTones(c.name) === targetToneFree);
      if (cat) {
        matchedCategoryIds.add(cat.id);
        // Also add parent category
        if (cat.parent_id) {
          matchedCategoryIds.add(cat.parent_id);
          const parentCat = cats.find(c => c.id === cat.parent_id);
          if (parentCat && parentCat.parent_id) {
            matchedCategoryIds.add(parentCat.parent_id);
          }
        }
      }
    };

    // Rule-based classification
    if (num.includes('48/2024') || num.includes('181/2025') || num.includes('174/2025') || num.includes('1585/QTR') || title.includes('Giá trị gia tăng') || title.includes('GTGT')) {
      linkCategoryByName('Thuế');
      linkCategoryByName('Thuế GTGT');
      if (type === 'luat') linkCategoryByName('Luật thuế GTGT');
      if (type === 'nghi_dinh') linkCategoryByName('Nghị định thuế GTGT');
      if (type === 'thong_tu') linkCategoryByName('Thông tư thuế GTGT');
      if (type === 'cong_van') linkCategoryByName('Công văn thuế GTGT');
    }

    if (num.includes('67/2025') || num.includes('320/2025') || num.includes('42/2026') || num.includes('1188/TCT') || title.includes('Thu nhập doanh nghiệp') || title.includes('TNDN')) {
      linkCategoryByName('Thuế');
      linkCategoryByName('Thuế TNDN');
      if (type === 'luat') linkCategoryByName('Luật thuế TNDN');
      if (type === 'nghi_dinh') linkCategoryByName('Nghị định thuế TNDN');
      if (type === 'thong_tu') linkCategoryByName('Thông tư thuế TNDN');
      if (type === 'cong_van') linkCategoryByName('Công văn thuế TNDN');
    }

    if (num.includes('4128/TCT') || num.includes('112/VBHN') || title.includes('Thu nhập cá nhân') || title.includes('TNCN')) {
      linkCategoryByName('Thuế');
      linkCategoryByName('Thuế TNCN');
      if (type === 'luat') linkCategoryByName('Luật thuế TNCN');
      if (type === 'cong_van') linkCategoryByName('Công văn thuế TNCN');
    }

    if (num.includes('70/2025') || num.includes('123/2020') || num.includes('125/2020') || title.includes('hóa đơn') || title.includes('xử phạt')) {
      linkCategoryByName('Thuế');
      linkCategoryByName('Hóa đơn, chứng từ');
      linkCategoryByName('Quản lý thuế');
    }

    if (num.includes('132/2020') || num.includes('20/2025') || num.includes('3058/TCT') || title.includes('liên kết') || title.includes('chuyển giá')) {
      linkCategoryByName('Thuế');
      linkCategoryByName('Giao dịch liên kết & Chuyển giá');
      linkCategoryByName('Thuế TNDN');
    }

    if (num.includes('38/2019') || num.includes('69/2025') || title.includes('Quản lý thuế')) {
      linkCategoryByName('Thuế');
      linkCategoryByName('Quản lý thuế');
    }

    if (num.includes('88/2015') || num.includes('99/2025') || title.includes('Kế toán')) {
      linkCategoryByName('Kế toán');
      if (type === 'luat') linkCategoryByName('Luật kế toán');
      if (type === 'thong_tu') linkCategoryByName('Thông tư kế toán');
      if (type === 'thong_tu') linkCategoryByName('Chuẩn mực kế toán (VAS)');
    }

    if (num.includes('1293/QĐ') || title.includes('kiểm toán')) {
      linkCategoryByName('Kiểm toán');
      linkCategoryByName('Hướng dẫn nghiệp vụ');
      linkCategoryByName('Kế toán');
    }

    if (num.includes('41/2024') || title.includes('Bảo hiểm xã hội') || title.includes('BHXH')) {
      linkCategoryByName('Bảo hiểm xã hội');
      linkCategoryByName('Luật BHXH');
    }

    if (num.includes('45/2019') || num.includes('74/2024') || title.includes('Lao động') || title.includes('lương')) {
      linkCategoryByName('Lao động và tiền lương');
      if (type === 'luat') linkCategoryByName('Bộ luật lao động');
      if (type === 'nghi_dinh') linkCategoryByName('Nghị định lao động');
    }

    if (num.includes('59/2020') || num.includes('31/2024') || title.includes('Doanh nghiệp') || title.includes('Đất đai')) {
      linkCategoryByName('Doanh nghiệp');
      if (type === 'luat') linkCategoryByName('Luật Doanh nghiệp');
      if (num.includes('31/2024')) linkCategoryByName('Đầu tư');
    }

    for (const catId of matchedCategoryIds) {
      linksToInsert.push({ document_id: doc.id, category_id: catId });
    }
  }

  console.log(`Đang lưu ${linksToInsert.length} liên kết danh mục...`);
  const { error } = await supabase.from('document_category_links').insert(linksToInsert);

  if (error) {
    console.error('Lỗi lưu liên kết:', error);
  } else {
    console.log('✅ [OK] Đồng bộ thành công toàn bộ liên kết danh mục!');
  }
}

main().catch(console.error);
