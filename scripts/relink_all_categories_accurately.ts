/**
 * Master Precise Category Relinker Engine.
 * Explicitly links all 38 legal documents to their exact root and child category nodes in the 49-category tree.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
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

interface DocCategoryMapping {
  docNumber: string;
  categoryNames: string[];
}

const EXACT_CATEGORY_MAPPINGS: DocCategoryMapping[] = [
  // ── 1. THUẾ TNDN ──
  { docNumber: '67/2025/QH15', categoryNames: ['Thuế', 'Thuế TNDN', 'Luật thuế TNDN'] },
  { docNumber: '320/2025/NĐ-CP', categoryNames: ['Thuế', 'Thuế TNDN', 'Nghị định thuế TNDN'] },
  { docNumber: '20/2026/TT-BTC', categoryNames: ['Thuế', 'Thuế TNDN', 'Thông tư thuế TNDN'] },
  { docNumber: '132/2020/NĐ-CP', categoryNames: ['Thuế', 'Thuế TNDN', 'Giao dịch liên kết & Chuyển giá', 'Nghị định thuế TNDN'] },
  { docNumber: '20/2025/NĐ-CP', categoryNames: ['Thuế', 'Thuế TNDN', 'Giao dịch liên kết & Chuyển giá', 'Nghị định thuế TNDN'] },
  { docNumber: '3058/TCT-CS', categoryNames: ['Thuế', 'Thuế TNDN', 'Giao dịch liên kết & Chuyển giá', 'Công văn thuế TNDN'] },
  { docNumber: '1188/TCT-TTKT', categoryNames: ['Thuế', 'Thuế TNDN', 'Công văn thuế TNDN'] },
  { docNumber: '3643/TNI-QLDN', categoryNames: ['Thuế', 'Thuế TNDN', 'Hóa đơn, chứng từ', 'Thuế GTGT'] },

  // ── 2. THUẾ GTGT ──
  { docNumber: '48/2024/QH15', categoryNames: ['Thuế', 'Thuế GTGT', 'Luật thuế GTGT'] },
  { docNumber: '181/2025/NĐ-CP', categoryNames: ['Thuế', 'Thuế GTGT', 'Nghị định thuế GTGT'] },
  { docNumber: '144/2026/NĐ-CP', categoryNames: ['Thuế', 'Thuế GTGT', 'Nghị định thuế GTGT'] },
  { docNumber: '174/2025/NĐ-CP', categoryNames: ['Thuế', 'Thuế GTGT', 'Nghị định thuế GTGT'] },
  { docNumber: '69/2025/TT-BTC', categoryNames: ['Thuế', 'Thuế GTGT', 'Thông tư thuế GTGT', 'Quản lý thuế', 'Hóa đơn, chứng từ'] },
  { docNumber: '1585/QTR-QLDN2', categoryNames: ['Thuế', 'Thuế GTGT', 'Công văn thuế GTGT'] },

  // ── 3. THUẾ TNCN ──
  { docNumber: '109/2025/QH15', categoryNames: ['Thuế', 'Thuế TNCN', 'Luật thuế TNCN'] },
  { docNumber: '112/VBHN-VPQH', categoryNames: ['Thuế', 'Thuế TNCN', 'Luật thuế TNCN'] },
  { docNumber: '253/2026/NĐ-CP', categoryNames: ['Thuế', 'Thuế TNCN', 'Nghị định thuế TNCN'] },
  { docNumber: '4128/TCT-DNNCN', categoryNames: ['Thuế', 'Thuế TNCN', 'Công văn thuế TNCN'] },

  // ── 4. QUẢN LÝ THUẾ, HÓA ĐƠN & XỬ PHẠT ──
  { docNumber: '38/2019/QH14', categoryNames: ['Thuế', 'Quản lý thuế'] },
  { docNumber: '123/2020/NĐ-CP', categoryNames: ['Thuế', 'Hóa đơn, chứng từ', 'Quản lý thuế'] },
  { docNumber: '70/2025/NĐ-CP', categoryNames: ['Thuế', 'Hóa đơn, chứng từ', 'Quản lý thuế'] },
  { docNumber: '125/2020/NĐ-CP', categoryNames: ['Thuế', 'Quản lý thuế', 'Hóa đơn, chứng từ'] },
  { docNumber: '15/VBHN-BTC', categoryNames: ['Thuế', 'Quản lý thuế', 'Hóa đơn, chứng từ'] },
  { docNumber: '255/2026/NĐ-CP', categoryNames: ['Thuế', 'Quản lý thuế', 'Doanh nghiệp'] },
  { docNumber: '167/2025/NĐ-CP', categoryNames: ['Thuế', 'Quản lý thuế'] },

  // ── 5. KẾ TOÁN & KIỂM TOÁN ──
  { docNumber: '88/2015/QH13', categoryNames: ['Kế toán', 'Luật kế toán'] },
  { docNumber: '99/2025/TT-BTC', categoryNames: ['Kế toán', 'Thông tư kế toán', 'Chuẩn mực kế toán (VAS)'] },
  { docNumber: '58/2026/TT-BTC', categoryNames: ['Kế toán', 'Thông tư kế toán'] },
  { docNumber: '132/2026/NĐ-CP', categoryNames: ['Kế toán', 'Xử phạt vi phạm kiểm toán', 'Nghị định kế toán'] },
  { docNumber: '1293/QĐ-BTC', categoryNames: ['Kiểm toán', 'Hướng dẫn nghiệp vụ', 'Kế toán'] },

  // ── 6. BẢO HIỂM XÃ HỘI & LAO ĐỘNG ──
  { docNumber: '41/2024/QH15', categoryNames: ['Bảo hiểm xã hội', 'Luật BHXH'] },
  { docNumber: '45/2019/QH14', categoryNames: ['Lao động và tiền lương', 'Bộ luật lao động'] },
  { docNumber: '74/2024/NĐ-CP', categoryNames: ['Lao động và tiền lương', 'Nghị định lao động', 'Bảo hiểm xã hội'] },
  { docNumber: '08/2026/TT-BLĐTBXH', categoryNames: ['Lao động và tiền lương', 'Thông tư lao động', 'Bảo hiểm xã hội'] },

  // ── 7. DOANH NGHIỆP & ĐẦU TƯ ──
  { docNumber: '59/2020/QH14', categoryNames: ['Doanh nghiệp', 'Luật Doanh nghiệp'] },
  { docNumber: '31/2024/QH15', categoryNames: ['Doanh nghiệp', 'Đầu tư'] },
  { docNumber: '168/2025/NĐ-CP', categoryNames: ['Doanh nghiệp', 'Nghị định Doanh nghiệp'] },
  { docNumber: '2301/QĐ-UBND', categoryNames: ['Đầu tư', 'Doanh nghiệp'] }
];

async function main() {
  console.log('🔄 BẮT ĐẦU ĐỒNG BỘ CHÍNH XÁC 100% DANH MỤC CHO TOÀN BỘ VĂN BẢN...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  const { data: docs } = await supabase.from('legal_documents').select('id, document_number, title');
  const { data: cats } = await supabase.from('categories').select('id, name, parent_id, slug');

  if (!docs || !cats) {
    console.error('Lỗi: Không tải được danh sách văn bản hoặc danh mục.');
    return;
  }

  console.log(`Tìm thấy ${docs.length} văn bản và ${cats.length} danh mục.`);

  // Clear existing links
  console.log('🧹 Đang xóa liên kết cũ...');
  await supabase.from('document_category_links').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const linksToInsert: { id: string; document_id: string; category_id: string; is_primary: boolean }[] = [];

  for (const doc of docs) {
    const mapping = EXACT_CATEGORY_MAPPINGS.find(
      m => m.docNumber === doc.document_number || doc.document_number.includes(m.docNumber)
    );

    const categoryNames = mapping ? mapping.categoryNames : ['Thuế'];
    const matchedCatIds = new Set<string>();

    for (const catName of categoryNames) {
      const targetToneFree = removeTones(catName);
      const matched = cats.find(c => removeTones(c.name) === targetToneFree);
      if (matched) {
        matchedCatIds.add(matched.id);
        if (matched.parent_id) {
          matchedCatIds.add(matched.parent_id);
          const parent = cats.find(c => c.id === matched.parent_id);
          if (parent?.parent_id) {
            matchedCatIds.add(parent.parent_id);
          }
        }
      }
    }

    let isFirst = true;
    for (const catId of matchedCatIds) {
      linksToInsert.push({
        id: crypto.randomUUID(),
        document_id: doc.id,
        category_id: catId,
        is_primary: isFirst
      });
      isFirst = false;
    }

    console.log(`🔗 [${doc.document_number}] ➔ Gán ${matchedCatIds.size} danh mục (${categoryNames.join(', ')})`);
  }

  console.log(`\n💾 Đang nạp ${linksToInsert.length} liên kết danh mục vào Supabase...`);
  const { error: insertErr } = await supabase.from('document_category_links').insert(linksToInsert);

  if (insertErr) {
    console.error('❌ Lỗi nạp document_category_links:', insertErr);
  } else {
    console.log(`🎉 [OK] ĐÃ ĐỒNG BỘ THÀNH CÔNG ${linksToInsert.length} LIÊN KẾT DANH MỤC!`);
  }
}

main().catch(console.error);
