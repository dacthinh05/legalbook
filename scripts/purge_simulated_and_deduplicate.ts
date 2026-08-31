/**
 * Purge Stubs & Re-insert Complete Full-Text Documents for 48/2024/QH15, 1585/QTR, 3643/TNI, 74/2024.
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

async function main() {
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  console.log('🧹 XÓA BỎ BẢN TRÙNG VÀ BẢN NGẮN TRÊN SUPABASE...');
  
  // Find all documents
  const { data: docs } = await supabase.from('legal_documents').select('id, document_number, title, html_content');
  
  // Delete docs with html_content < 1000 chars
  for (const doc of docs || []) {
    if (doc.html_content && doc.html_content.length < 1000) {
      console.log(`🗑️ Đang xóa bản ngắn: [${doc.document_number}] ${doc.title} (${doc.html_content.length} chars)`);
      await supabase.from('document_category_links').delete().eq('document_id', doc.id);
      await supabase.from('document_files').delete().eq('document_id', doc.id);
      await supabase.from('legal_documents').delete().eq('id', doc.id);
    }
  }

  // Check full text for 48/2024/QH15
  const vatLawHtml = fs.readFileSync('scripts/crawl_full_vat_and_dispatches.ts', 'utf8');
  const vatMatch = vatLawHtml.match(/htmlContent:\s*`([\s\S]*?)`\s*}/);
  if (vatMatch) {
    const vatContent = vatMatch[1];
    const { data: existingVat } = await supabase.from('legal_documents').select('id').eq('document_number', '48/2024/QH15');
    if (!existingVat || existingVat.length === 0) {
      console.log('📥 Nạp lại toàn văn Luật Thuế GTGT 48/2024/QH15...');
      const vatId = 'e0482024-0000-4000-8000-000000000048';
      await supabase.from('legal_documents').insert({
        id: vatId,
        document_number: '48/2024/QH15',
        title: 'Luật Thuế Giá trị gia tăng số 48/2024/QH15',
        document_type: 'luat',
        issuing_body: 'Quốc hội',
        signer: 'Trần Thanh Mẫn',
        issued_date: '2024-11-29',
        effective_date: '2025-07-01',
        status: 'hieu_luc',
        content_status: 'verified',
        summary_main: 'Toàn văn Luật Thuế Giá trị gia tăng số 48/2024/QH15 gồm 18 Điều và 26 nhóm đối tượng không chịu thuế.',
        summary_new_points: 'Toàn văn Luật Thuế GTGT 2024.',
        html_content: vatContent,
        is_published: true,
        review_status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else {
      await supabase.from('legal_documents').update({ html_content: vatContent }).eq('document_number', '48/2024/QH15');
    }
  }

  // Update 1585/QTR and 3643/TNI to full dispatches
  const dispatchCode = fs.readFileSync('scripts/enrich_authentic_fulltext_dispatches.ts', 'utf8');
  const qtrMatch = dispatchCode.match(/docNumber:\s*'1585\/QTR-QLDN2'[\s\S]*?htmlContent:\s*`([\s\S]*?)`\s*}/);
  if (qtrMatch) {
    console.log('📥 Cập nhật toàn văn CV 1585/QTR-QLDN2...');
    await supabase.from('legal_documents').update({ html_content: qtrMatch[1] }).eq('document_number', '1585/QTR-QLDN2');
  }

  const tniMatch = dispatchCode.match(/docNumber:\s*'3643\/TNI-QLDN'[\s\S]*?htmlContent:\s*`([\s\S]*?)`\s*}/);
  if (tniMatch) {
    console.log('📥 Cập nhật toàn văn CV 3643/TNI-QLDN...');
    await supabase.from('legal_documents').update({ html_content: tniMatch[1] }).eq('document_number', '3643/TNI-QLDN');
  }

  console.log('✅ Hoàn tất dọn dẹp và cập nhật toàn văn!');
}

main().catch(console.error);
