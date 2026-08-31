/**
 * Fix & Ensure Complete Categorization for Giao Dịch Liên Kết (Transfer Pricing) Categories.
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

async function main() {
  console.log('🔗 ĐANG ĐỒNG BỘ CÁC VĂN BẢN VÀO DANH MỤC GIAO DỊCH LIÊN KẾT...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  const { data: docs } = await supabase.from('legal_documents').select('id, document_number, title');
  const { data: cats } = await supabase.from('categories').select('id, name, parent_id, slug');

  const gdlkThue = cats?.find(c => c.slug === 'thue-giao-dich-lien-ket');
  const gdlkDn = cats?.find(c => c.slug === 'giao-dich-lien-ket-dn');
  const thueRoot = cats?.find(c => c.slug === 'thue' || c.name === 'Thuế');
  const dnRoot = cats?.find(c => c.slug === 'doanh-nghiep' || c.name === 'Doanh nghiệp');

  if (!docs || !gdlkThue || !gdlkDn) {
    console.error('Không tìm thấy categories GDLK');
    return;
  }

  const gdlkDocNumbers = [
    '132/2020/NĐ-CP',
    '20/2025/NĐ-CP',
    '3058/TCT-CS',
    '1188/TCT-TTKT',
    '320/2025/NĐ-CP',
    '67/2025/QH15'
  ];

  const linksToInsert: any[] = [];

  for (const docNum of gdlkDocNumbers) {
    const doc = docs.find(d => d.document_number === docNum || d.document_number.includes(docNum));
    if (!doc) {
      console.warn(`⚠️ Không tìm thấy doc: ${docNum}`);
      continue;
    }

    // Link to GDLK & Chuyển giá (under Thuế) + Thuế root
    linksToInsert.push({
      id: crypto.randomUUID(),
      document_id: doc.id,
      category_id: gdlkThue.id,
      is_primary: false
    });
    if (thueRoot) {
      linksToInsert.push({
        id: crypto.randomUUID(),
        document_id: doc.id,
        category_id: thueRoot.id,
        is_primary: false
      });
    }

    // Link to GDLK (under Doanh nghiệp) + Doanh nghiệp root
    linksToInsert.push({
      id: crypto.randomUUID(),
      document_id: doc.id,
  console.log(`\n💾 Đang nạp ${linksToInsert.length} liên kết GDLK vào Supabase...`);
  const { error } = await supabase.from('document_category_links').upsert(linksToInsert, { onConflict: 'document_id,category_id' });

  if (error) {
    console.error('Lỗi nạp liên kết GDLK:', error);
  } else {
    console.log('🎉 [OK] ĐÃ NẠP THÀNH CÔNG TẤT CẢ LIÊN KẾT GIAO DỊCH LIÊN KẾT!');
  }
        category_id: dnRoot.id,
        is_primary: false
      });
    }

    console.log(`✅ [OK] Đã liên kết [${doc.document_number}] vào 2 danh mục Giao dịch liên kết`);
  }

  console.log(`\n💾 Đang nạp ${linksToInsert.length} liên kết GDLK vào Supabase...`);
  const { error } = await supabase.from('document_category_links').upsert(linksToInsert, { onConflict: 'id' });

  if (error) {
    console.error('Lỗi nạp liên kết GDLK:', error);
  } else {
    console.log('🎉 [OK] ĐÃ NẠP THÀNH CÔNG TẤT CẢ LIÊN KẾT GIAO DỊCH LIÊN KẾT!');
  }
}

main().catch(console.error);
