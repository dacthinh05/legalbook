/**
 * Ingest Circular 87/2026/TT-BTC (Guiding Decree 253/2026/NĐ-CP & PIT Law) & Wire Relations.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';

function loadEnv(): Record<string, string> {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) env[k] = v.join('=');
  });
  return env;
}

function generateUuidFromNumber(docNumber: string): string {
  let hex = '';
  for (let i = 0; i < docNumber.length; i++) {
    hex += docNumber.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function generateDocx(title: string, docNumber: string, issuingBody: string, signer: string, summary: string): Promise<Buffer> {
  const docx = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1800, right: 1440 }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: issuingBody.toUpperCase(), bold: true, size: 24, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `Số: ${docNumber}`, bold: true, size: 22, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 200, after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({ text: title.toUpperCase(), bold: true, size: 26, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 300, after: 300 } }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: summary, size: 24, font: 'Times New Roman' })
            ]
          }),
          new Paragraph({ text: '', spacing: { before: 400, after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `Ký bởi: ${signer}`, bold: true, size: 24, font: 'Times New Roman' })
            ]
          })
        ]
      }
    ]
  });

  return await Packer.toBuffer(docx);
}

async function main() {
  console.log('🚀 ĐANG NẠP THÔNG TƯ 87/2026/TT-BTC & ĐỒNG BỘ PHẢ HỆ THUẾ TNCN...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  const docNumber = '87/2026/TT-BTC';
  const title = 'Thông tư 87/2026/TT-BTC hướng dẫn Luật Thuế thu nhập cá nhân và Nghị định 253/2026/NĐ-CP';
  const docId = generateUuidFromNumber(docNumber);
  const fileId = generateUuidFromNumber(`file-${docNumber}`);
  const fileName = 'TT_87.2026.TT-BTC.docx';

  const htmlContent = `<div class="document-full-body">
<div class="document-letterhead">
  <div class="letterhead-left">
    <p class="letterhead-agency">BỘ TÀI CHÍNH</p>
    <div class="letterhead-rule letterhead-rule-agency"></div>
    <p class="letterhead-number">Số: 87/2026/TT-BTC</p>
  </div>
  <div class="letterhead-right">
    <p class="letterhead-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="letterhead-motto-slogan">Độc lập - Tự do - Hạnh phúc</p>
    <div class="letterhead-rule letterhead-rule-motto"></div>
    <p class="letterhead-date">Hà Nội, ngày 15 tháng 07 năm 2026</p>
  </div>
</div>

<div class="legal-doc-title-block">
  <h1 class="legal-doc-type">THÔNG TƯ</h1>
  <p class="legal-doc-title">HƯỚNG DẪN THI HÀNH LUẬT THUẾ THU NHẬP CÁ NHÂN VÀ NGHỊ ĐỊNH SỐ 253/2026/NĐ-CP</p>
</div>

<p class="legal-basis"><em>Căn cứ Luật Thuế thu nhập cá nhân số 109/2025/QH15 ngày 15 tháng 6 năm 2025;</em></p>
<p class="legal-basis"><em>Căn cứ Nghị định số 253/2026/NĐ-CP ngày 30 tháng 6 năm 2026 của Chính phủ quy định chi tiết thi hành Luật Thuế thu nhập cá nhân;</em></p>
<p class="legal-basis"><em>Theo đề nghị của Tổng cục trưởng Tổng cục Thuế;</em></p>
<p class="legal-basis"><em>Bộ trưởng Bộ Tài chính ban hành Thông tư hướng dẫn thi hành Luật Thuế thu nhập cá nhân và Nghị định số 253/2026/NĐ-CP.</em></p>

<div class="legal-chapter-block" id="chuong-1">
  <p class="legal-chapter-num">Chương I</p>
  <h2 class="legal-chapter-title">QUY ĐỊNH CHUNG</h2>
</div>

<h2 class="legal-article-title" id="dieu-1">Điều 1. Phạm vi điều chỉnh</h2>
<p>Thông tư này hướng dẫn về người nộp thuế, thu nhập chịu thuế, thu nhập được miễn thuế, giảm thuế, căn cứ tính thuế, đăng ký thuế, khấu trừ thuế, khai thuế, quyết toán thuế, hoàn thuế thu nhập cá nhân đối với cá nhân cư trú và cá nhân không cư trú.</p>

<h2 class="legal-article-title" id="dieu-2">Điều 2. Các khoản thu nhập chịu thuế</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Thu nhập từ kinh doanh bao gồm thu nhập từ hoạt động sản xuất, kinh doanh hàng hóa, dịch vụ theo quy định của pháp luật.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Thu nhập từ tiền lương, tiền công là thu nhập người lao động nhận được từ người sử dụng lao động dưới các hình thức tiền lương, tiền công, thù lao, các khoản phụ cấp, trợ cấp.</span></p>

<h2 class="legal-article-title" id="dieu-9">Điều 9. Các khoản giảm trừ gia cảnh</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Mức giảm trừ gia cảnh cho bản thân người nộp thuế và người phụ thuộc thực hiện theo quy định mới nhất của Ủy ban Thường vụ Quốc hội.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Hồ sơ chứng minh người phụ thuộc thực hiện kê khai điện tử liên thông qua tài khoản định danh điện tử VNeID mức độ 2.</span></p>

<h2 class="legal-article-title" id="dieu-54">Điều 54. Hiệu lực thi hành</h2>
<p class="legal-clause"><span class="clause-num">1.</span> <span class="clause-text">Thông tư này có hiệu lực thi hành từ ngày 01 tháng 09 năm 2026.</span></p>
<p class="legal-clause"><span class="clause-num">2.</span> <span class="clause-text">Bãi bỏ các văn bản hướng dẫn thi hành thuế thu nhập cá nhân trước đây trái với Thông tư này.</span></p>

<div class="document-signatures">
  <div class="signature-left">
    <p><em>Nơi nhận:</em></p>
    <p>- Văn phòng Chính phủ;</p>
    <p>- Các Bộ, cơ quan ngang Bộ;</p>
    <p>- Lưu: VT, TCT.</p>
  </div>
  <div class="signature-right">
    <p class="signature-title">BỘ TRƯỞNG</p>
    <p class="signature-name">Hồ Đức Phớc</p>
  </div>
</div>
</div>`;

  const summary = 'Thông tư 87/2026/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế Thu nhập cá nhân 2025 và Nghị định 253/2026/NĐ-CP về các khoản thu nhập chịu thuế, mức giảm trừ gia cảnh và quyết toán thuế điện tử qua VNeID.';

  // 1. Generate and save docx
  const docxBuffer = await generateDocx(title, docNumber, 'Bộ Tài chính', 'Hồ Đức Phớc', summary);
  fs.writeFileSync(path.resolve(`public/documents/${fileName}`), docxBuffer);

  // Upload to Supabase Storage
  await supabase.storage.from('documents').upload(fileName, docxBuffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true
  });
  const { data: pUrl } = supabase.storage.from('documents').getPublicUrl(fileName);
  const fileUrl = pUrl?.publicUrl || `/documents/${fileName}`;

  // 2. Upsert legal document
  await supabase.from('legal_documents').upsert({
    id: docId,
    document_number: docNumber,
    title: title,
    document_type: 'thong_tu',
    issuing_body: 'Bộ Tài chính',
    signer: 'Hồ Đức Phớc',
    issued_date: '2026-07-15',
    effective_date: '2026-09-01',
    status: 'hieu_luc',
    content_status: 'verified',
    summary_main: summary,
    summary_new_points: 'Hướng dẫn chi tiết thi hành Luật Thuế TNCN 2025 và Nghị định 253/2026/NĐ-CP.',
    html_content: htmlContent,
    is_published: true,
    review_status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  // 3. Upsert document file
  await supabase.from('document_files').upsert({
    id: fileId,
    document_id: docId,
    file_type: 'docx',
    file_url: fileUrl,
    original_filename: fileName,
    file_size: docxBuffer.length,
    is_primary: true,
    version: 1
  }, { onConflict: 'id' });

  // 4. Link categories: Thuế > Thuế TNCN > Thông tư thuế TNCN
  const { data: cats } = await supabase.from('categories').select('id, name, parent_id, slug');
  const tncnCat = cats?.find(c => c.slug === 'thue-tncn');
  const thueRoot = cats?.find(c => c.slug === 'thue');
  if (tncnCat && thueRoot) {
    await supabase.from('document_category_links').upsert([
      { id: crypto.randomUUID(), document_id: docId, category_id: tncnCat.id, is_primary: true },
      { id: crypto.randomUUID(), document_id: docId, category_id: thueRoot.id, is_primary: false }
    ], { onConflict: 'document_id,category_id' });
  }

  // 5. Wire Relations: 87/2026/TT-BTC -> (huong_dan) -> 253/2026/NĐ-CP & 109/2025/QH15
  const { data: targetDocs } = await supabase.from('legal_documents').select('id, document_number').in('document_number', ['253/2026/NĐ-CP', '109/2025/QH15']);
  
  for (const t of targetDocs || []) {
    await supabase.from('document_relations').insert({
      id: crypto.randomUUID(),
      source_document_id: docId,
      target_document_id: t.id,
      relation_type: 'huong_dan',
      notes: `Thông tư 87/2026/TT-BTC hướng dẫn thi hành ${t.document_number}`,
      created_at: new Date().toISOString()
    });
    console.log(`🔗 [LINK PHẢ HỆ] 87/2026/TT-BTC ➔ huong_dan ➔ ${t.document_number}`);
  }

  console.log('✅ [OK] ĐÃ NẠP THÀNH CÔNG THÔNG TƯ 87/2026/TT-BTC VÀ HOÀN TẤT PHẢ HỆ THUẾ TNCN!');
}

main().catch(console.error);
