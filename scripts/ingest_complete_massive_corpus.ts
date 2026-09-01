/**
 * Master Massive Legal Corpus Ingestion & Synchronization Engine.
 * Ingests ALL 200+ authentic .docx files from public/documents/ into Supabase Cloud & demo-data.ts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import mammoth from 'mammoth';

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

function generateUuidFromNumber(docNumber: string): string {
  let hex = '';
  for (let i = 0; i < docNumber.length; i++) {
    hex += docNumber.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function parseFilenameMetadata(filename: string): {
  docNumber: string;
  docType: 'luat' | 'nghi_dinh' | 'thong_tu' | 'cong_van' | 'quyet_dinh' | 'nghi_quyet' | 'vbhn';
  issuingBody: string;
  title: string;
} {
  const cleanName = filename.replace(/\.docx$/i, '').trim();

  let docType: 'luat' | 'nghi_dinh' | 'thong_tu' | 'cong_van' | 'quyet_dinh' | 'nghi_quyet' | 'vbhn' = 'cong_van';
  let issuingBody = 'Tổng cục Thuế';

  if (/^(Luật|Luat)/i.test(cleanName)) {
    docType = 'luat';
    issuingBody = 'Quốc hội';
  } else if (/^(NĐ|ND|Nghị định|Nghi dinh)/i.test(cleanName)) {
    docType = 'nghi_dinh';
    issuingBody = 'Chính phủ';
  } else if (/^(TT|Thông tư|Thong tu)/i.test(cleanName)) {
    docType = 'thong_tu';
    issuingBody = 'Bộ Tài chính';
    if (cleanName.includes('BKHĐT') || cleanName.includes('BKHDT')) issuingBody = 'Bộ Kế hoạch và Đầu tư';
    if (cleanName.includes('BLĐTBXH') || cleanName.includes('BLDTBXH')) issuingBody = 'Bộ Lao động - Thương binh và Xã hội';
  } else if (/^(QĐ|QD|Quyết định|Quyet dinh)/i.test(cleanName)) {
    docType = 'quyet_dinh';
    issuingBody = cleanName.includes('UBND') ? 'Ủy ban nhân dân TP. Hồ Chí Minh' : 'Bộ Tài chính';
  } else if (/^(VBHN)/i.test(cleanName)) {
    docType = 'vbhn';
    issuingBody = 'Bộ Tài chính';
  } else {
    docType = 'cong_van';
    if (cleanName.includes('CTTPHCM') || cleanName.includes('CTHCM')) issuingBody = 'Cục Thuế TP. Hồ Chí Minh';
    else if (cleanName.includes('CTHN')) issuingBody = 'Cục Thuế TP. Hà Nội';
    else if (cleanName.includes('CTBDU')) issuingBody = 'Cục Thuế tỉnh Bình Dương';
    else if (cleanName.includes('CTDNA')) issuingBody = 'Cục Thuế tỉnh Đồng Nai';
    else if (cleanName.includes('CTHPG')) issuingBody = 'Cục Thuế TP. Hải Phòng';
    else if (cleanName.includes('CTQNI')) issuingBody = 'Cục Thuế tỉnh Quảng Ninh';
    else if (cleanName.includes('CTBNI')) issuingBody = 'Cục Thuế tỉnh Bắc Ninh';
    else if (cleanName.includes('CTNAN')) issuingBody = 'Cục Thuế tỉnh Nghệ An';
    else if (cleanName.includes('CTTHA')) issuingBody = 'Cục Thuế tỉnh Thanh Hóa';
    else if (cleanName.includes('QTR')) issuingBody = 'Cục Thuế tỉnh Quảng Trị';
    else if (cleanName.includes('TNI')) issuingBody = 'Cục Thuế tỉnh Tây Ninh';
    else issuingBody = 'Tổng cục Thuế';
  }

  // Extract Doc Number
  const numMatch = cleanName.match(/([0-9]+(?:\.[0-9]+)?(?:\/[0-9]+)?(?:[\.\/-][A-Z0-9Đa-z\-]+)+)/);
  let docNumber = numMatch ? numMatch[1].replace(/\./g, '/') : cleanName.split('-')[0].trim();
  docNumber = docNumber
    .replace(/^CV\s*/i, '')
    .replace(/^ND\s*/i, '')
    .replace(/^NĐ\s*/i, '')
    .replace(/^TT\s*/i, '')
    .replace(/^Luat\s*/i, '')
    .replace(/^Luật\s*/i, '')
    .replace(/^QD\s*/i, '')
    .replace(/^QĐ\s*/i, '')
    .trim();

  // Create Title
  let title = cleanName;
  if (cleanName.includes(' - ')) {
    title = cleanName.split(' - ').slice(1).join(' - ').trim();
  }
  if (!title || title.length < 5) title = cleanName;

  return { docNumber, docType, issuingBody, title };
}

const HIERARCHY_TREE_RELATIONS = [
  // ── CIT Tree (Luật 67/2025/QH15) ──
  { source: '320/2025/NĐ-CP', target: '67/2025/QH15', type: 'huong_dan', notes: 'Quy định chi tiết thi hành Luật Thuế TNDN 2025' },
  { source: '132/2020/NĐ-CP', target: '67/2025/QH15', type: 'huong_dan', notes: 'Quản lý thuế đối với doanh nghiệp có giao dịch liên kết' },
  { source: '20/2025/NĐ-CP', target: '67/2025/QH15', type: 'huong_dan', notes: 'Sửa đổi NĐ 132/2020 về giao dịch liên kết khi vay vốn' },
  { source: '20/2025/NĐ-CP', target: '132/2020/NĐ-CP', type: 'sua_doi', notes: 'Sửa đổi điểm d khoản 2 Điều 5 Nghị định 132/2020' },
  { source: '20/2026/TT-BTC', target: '67/2025/QH15', type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Luật Thuế TNDN 2025' },
  { source: '20/2026/TT-BTC', target: '320/2025/NĐ-CP', type: 'huong_dan', notes: 'Hướng dẫn thực hiện Nghị định 320/2025/NĐ-CP' },
  { source: '3058/TCT-CS', target: '67/2025/QH15', type: 'huong_dan', notes: 'Xác định quan hệ liên kết qua vay vốn và khống chế 30% EBITDA' },
  { source: '3058/TCT-CS', target: '132/2020/NĐ-CP', type: 'huong_dan', notes: 'Hướng dẫn áp dụng Điều 16 Nghị định 132/2020' },
  { source: '1188/TCT-TTKT', target: '67/2025/QH15', type: 'huong_dan', notes: 'Chi phí được trừ đối với khoản tài trợ giáo dục, y tế' },

  // ── VAT Tree (Luật 48/2024/QH15) ──
  { source: '181/2025/NĐ-CP', target: '48/2024/QH15', type: 'huong_dan', notes: 'Quy định chi tiết thi hành Luật Thuế GTGT 2024' },
  { source: '144/2026/NĐ-CP', target: '48/2024/QH15', type: 'huong_dan', notes: 'Sửa đổi, bổ sung quy định hoàn thuế và khấu trừ GTGT' },
  { source: '144/2026/NĐ-CP', target: '181/2025/NĐ-CP', type: 'sua_doi', notes: 'Sửa đổi, bổ sung Nghị định 181/2025/NĐ-CP' },
  { source: '174/2025/NĐ-CP', target: '48/2024/QH15', type: 'huong_dan', notes: 'Chính sách giảm 2% thuế suất thuế GTGT năm 2025' },
  { source: '69/2025/TT-BTC', target: '48/2024/QH15', type: 'huong_dan', notes: 'Hướng dẫn chi tiết quản lý thuế và hoàn thuế GTGT điện tử' },
  { source: '69/2025/TT-BTC', target: '181/2025/NĐ-CP', type: 'huong_dan', notes: 'Hướng dẫn hồ sơ hoàn thuế GTGT theo Nghị định 181/2025' },

  // ── PIT Tree (Luật 109/2025 & 112/VBHN) ──
  { source: '87/2026/TT-BTC', target: '109/2025/QH15', type: 'huong_dan', notes: 'Hướng dẫn thi hành Luật Thuế TNCN 2025' },
  { source: '87/2026/TT-BTC', target: '112/VBHN-VPQH', type: 'huong_dan', notes: 'Hướng dẫn chi tiết thi hành Luật Thuế TNCN' },
  { source: '4128/TCT-DNNCN', target: '112/VBHN-VPQH', type: 'huong_dan', notes: 'Miễn thuế TNCN làm thêm giờ, tiền ăn ca và quyết toán qua VNeID' },

  // ── Accounting Tree (Luật 88/2015) ──
  { source: '99/2025/TT-BTC', target: '88/2015/QH13', type: 'huong_dan', notes: 'Chế độ kế toán doanh nghiệp mới (Thay thế TT 200/2014)' },
  { source: '58/2026/TT-BTC', target: '88/2015/QH13', type: 'huong_dan', notes: 'Chế độ kế toán đối với doanh nghiệp siêu nhỏ' },
  { source: '132/2026/NĐ-CP', target: '88/2015/QH13', type: 'huong_dan', notes: 'Xử phạt vi phạm hành chính trong lĩnh vực kế toán' },
  { source: '1293/QĐ-BTC', target: '88/2015/QH13', type: 'huong_dan', notes: 'Đơn giản hóa thủ tục hành chính kế toán, kiểm toán' },

  // ── Tax Admin & Invoice Tree (Luật 38/2019) ──
  { source: '123/2020/NĐ-CP', target: '38/2019/QH14', type: 'huong_dan', notes: 'Quy định về hóa đơn, chứng từ điện tử' },
  { source: '70/2025/NĐ-CP', target: '38/2019/QH14', type: 'huong_dan', notes: 'Sửa đổi, bổ sung Nghị định 123/2020/NĐ-CP' },
  { source: '70/2025/NĐ-CP', target: '123/2020/NĐ-CP', type: 'sua_doi', notes: 'Sửa đổi thời điểm xuất hóa đơn xăng dầu, máy tính tiền' },
  { source: '125/2020/NĐ-CP', target: '38/2019/QH14', type: 'huong_dan', notes: 'Xử phạt vi phạm hành chính về thuế, hóa đơn' },
  { source: '15/VBHN-BTC', target: '38/2019/QH14', type: 'huong_dan', notes: 'Hợp nhất quy định xử phạt vi phạm hành chính thuế' },
  { source: '167/2025/NĐ-CP', target: '38/2019/QH14', type: 'huong_dan', notes: 'Thủ tục hải quan và kiểm tra sau thông quan' },
  { source: '69/2025/TT-BTC', target: '38/2019/QH14', type: 'huong_dan', notes: 'Hướng dẫn Luật Quản lý thuế và Nghị định 70/2025' },

  // ── Labor & Social Insurance Tree ──
  { source: '74/2024/NĐ-CP', target: '45/2019/QH14', type: 'huong_dan', notes: 'Quy định mức lương tối thiểu vùng theo Bộ luật Lao động' },
  { source: '74/2024/NĐ-CP', target: '41/2024/QH15', type: 'lien_quan', notes: 'Căn cứ đóng bảo hiểm xã hội bắt buộc theo lương tối thiểu' },
  { source: '08/2026/TT-BLĐTBXH', target: '45/2019/QH14', type: 'huong_dan', notes: 'Hướng dẫn hợp đồng lao động điện tử theo Bộ luật Lao động' },
  { source: '08/2026/TT-BLĐTBXH', target: '41/2024/QH15', type: 'lien_quan', notes: 'Liên thông dữ liệu hợp đồng điện tử với CSDL Bảo hiểm xã hội' },

  // ── Enterprise & Investment Tree ──
  { source: '01/2021/NĐ-CP', target: '59/2020/QH14', type: 'huong_dan', notes: 'Quy định về đăng ký doanh nghiệp' },
  { source: '2301/QĐ-UBND', target: '31/2024/QH15', type: 'lien_quan', notes: 'Danh mục dự án thu hút đầu tư sử dụng đất TP.HCM 2026 - 2030' },
  { source: '2301/QĐ-UBND', target: '59/2020/QH14', type: 'lien_quan', notes: 'Ưu đãi đầu tư đối với doanh nghiệp thành lập mới tại TP.HCM' }
];

async function main() {
  console.log('🚀 BẮT ĐẦU QUÉT & NẠP TOÀN BỘ 200+ VĂN BẢN VÀO CSDL SUPABASE...');
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  const { data: categories } = await supabase.from('categories').select('*');
  console.log(`Tìm thấy ${categories?.length || 0} danh mục.`);

  const docxFiles = fs.readdirSync('public/documents').filter(f => f.endsWith('.docx'));
  console.log(`Tìm thấy ${docxFiles.length} tệp docx trong public/documents/`);

  // Read full VAT law HTML from crawl script
  const vatCode = fs.readFileSync('scripts/crawl_full_vat_and_dispatches.ts', 'utf8');
  const vatMatch = vatCode.match(/docNumber:\s*'48\/2024\/QH15'[\s\S]*?htmlContent:\s*\`([\s\S]*?)\`\s*}/);
  const vatFullHtml = vatMatch ? vatMatch[1] : '';

  // Read full TT 87 HTML
  const tt87Code = fs.readFileSync('scripts/ingest_tt87_and_wire_relations.ts', 'utf8');
  const tt87Match = tt87Code.match(/const htmlContent =\s*\`([\s\S]*?)\`;/);
  const tt87FullHtml = tt87Match ? tt87Match[1] : '';

  const insertedDocsMap = new Map<string, any>();
  const linksToInsertMap = new Map<string, any>();

  for (let i = 0; i < docxFiles.length; i++) {
    const filename = docxFiles[i];
    const filePath = path.join('public/documents', filename);
    const meta = parseFilenameMetadata(filename);

    try {
      let html = '';
      const buffer = fs.readFileSync(filePath);

      if (meta.docNumber === '48/2024/QH15' && vatFullHtml) {
        html = vatFullHtml;
      } else if (meta.docNumber === '87/2026/TT-BTC' && tt87FullHtml) {
        html = tt87FullHtml;
      } else {
        const extRes = await mammoth.convertToHtml({ buffer });
        html = extRes.value.trim();
      }

      if (!html || html.length < 50) {
        html = `<p><strong>${meta.title}</strong></p><p>Số hiệu: ${meta.docNumber} | Cơ quan ban hành: ${meta.issuingBody}</p>`;
      }

      if (!html.startsWith('<div class="document-full-body">')) {
        html = `<div class="document-full-body">\n${html}\n</div>`;
      }

      const docId = generateUuidFromNumber(meta.docNumber || filename);
      const fileId = generateUuidFromNumber(`file-${meta.docNumber || filename}`);
      const fileUrl = `/documents/${filename}`;

      // Upload file to Supabase Storage
      await supabase.storage.from('documents').upload(filename, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });

      const plainText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const summaryMain = plainText.slice(0, 320) + '...';

      // Year extraction
      const yearMatch = filename.match(/20(1[0-9]|2[0-9])/);
      const year = yearMatch ? yearMatch[0] : '2025';
      const issuedDate = `${year}-01-01`;

      const docPayload = {
        id: docId,
        document_number: meta.docNumber,
        title: meta.title,
        document_type: meta.docType === 'vbhn' ? (meta.title.includes('Luật') ? 'luat' : 'nghi_dinh') : meta.docType,
        issuing_body: meta.issuingBody,
        signer: 'Lãnh đạo cơ quan ban hành',
        issued_date: issuedDate,
        effective_date: issuedDate,
        status: 'hieu_luc',
        content_status: 'verified',
        summary_main: summaryMain,
        summary_new_points: `Toàn văn văn bản chính thức ${meta.docNumber}.`,
        html_content: html,
        is_published: true,
        review_status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await supabase.from('legal_documents').upsert(docPayload, { onConflict: 'id' });

      // Upsert file
      await supabase.from('document_files').upsert({
        id: fileId,
        document_id: docId,
        file_type: 'docx',
        file_url: fileUrl,
        original_filename: filename,
        file_size: buffer.length,
        is_primary: true,
        version: 1
      }, { onConflict: 'id' });

      insertedDocsMap.set(meta.docNumber, { ...docPayload, files: [{ id: fileId, file_url: fileUrl, original_filename: filename, file_type: 'docx' }] });

      // Match categories
      const targetCatNames = new Set<string>();
      const lower = (meta.title + ' ' + meta.docNumber + ' ' + filename).toLowerCase();

      if (lower.includes('gtgt') || lower.includes('giá trị gia tăng')) {
        targetCatNames.add('Thuế');
        targetCatNames.add('Thuế GTGT');
        if (meta.docType === 'luat') targetCatNames.add('Luật thuế GTGT');
        if (meta.docType === 'nghi_dinh') targetCatNames.add('Nghị định thuế GTGT');
        if (meta.docType === 'thong_tu') targetCatNames.add('Thông tư thuế GTGT');
        if (meta.docType === 'cong_van') targetCatNames.add('Công văn thuế GTGT');
      }

      if (lower.includes('tndn') || lower.includes('thu nhập doanh nghiệp') || lower.includes('chi phí') || lower.includes('lãi vay') || lower.includes('khấu hao')) {
        targetCatNames.add('Thuế');
        targetCatNames.add('Thuế TNDN');
        if (meta.docType === 'luat') targetCatNames.add('Luật thuế TNDN');
        if (meta.docType === 'nghi_dinh') targetCatNames.add('Nghị định thuế TNDN');
        if (meta.docType === 'thong_tu') targetCatNames.add('Thông tư thuế TNDN');
        if (meta.docType === 'cong_van') targetCatNames.add('Công văn thuế TNDN');
      }

      if (lower.includes('tncn') || lower.includes('thu nhập cá nhân') || lower.includes('tiền lương') || lower.includes('thù lao')) {
        targetCatNames.add('Thuế');
        targetCatNames.add('Thuế TNCN');
        if (meta.docType === 'luat') targetCatNames.add('Luật thuế TNCN');
        if (meta.docType === 'cong_van') targetCatNames.add('Công văn thuế TNCN');
      }

      if (lower.includes('hóa đơn') || lower.includes('hoa don') || lower.includes('chứng từ') || lower.includes('xử phạt')) {
        targetCatNames.add('Thuế');
        targetCatNames.add('Hóa đơn, chứng từ');
        targetCatNames.add('Quản lý thuế');
      }

      if (lower.includes('liên kết') || lower.includes('lien ket') || lower.includes('chuyển giá')) {
        targetCatNames.add('Thuế');
        targetCatNames.add('Giao dịch liên kết & Chuyển giá');
        targetCatNames.add('Giao dịch liên kết');
      }

      if (lower.includes('kế toán') || lower.includes('ke toan') || lower.includes('báo cáo tài chính') || lower.includes('vas') || lower.includes('ifrs')) {
        targetCatNames.add('Kế toán');
        if (meta.docType === 'luat') targetCatNames.add('Luật kế toán');
        if (meta.docType === 'thong_tu') targetCatNames.add('Thông tư kế toán');
      }

      if (lower.includes('kiểm toán') || lower.includes('kiem toan') || lower.includes('vsa')) {
        targetCatNames.add('Kiểm toán');
        targetCatNames.add('Hướng dẫn nghiệp vụ');
      }

      if (lower.includes('bảo hiểm') || lower.includes('bhxh') || lower.includes('thai sản')) {
        targetCatNames.add('Bảo hiểm xã hội');
        if (meta.docType === 'luat') targetCatNames.add('Luật BHXH');
      }

      if (lower.includes('lao động') || lower.includes('lao dong') || lower.includes('lương tối thiểu')) {
        targetCatNames.add('Lao động và tiền lương');
        if (meta.docType === 'luat') targetCatNames.add('Bộ luật lao động');
      }

      if (lower.includes('doanh nghiệp') || lower.includes('đăng ký kinh doanh') || lower.includes('đất đai') || lower.includes('đầu tư')) {
        targetCatNames.add('Doanh nghiệp');
        if (meta.docType === 'luat') targetCatNames.add('Luật Doanh nghiệp');
        if (lower.includes('đầu tư')) targetCatNames.add('Đầu tư');
      }

      if (targetCatNames.size === 0) {
        targetCatNames.add('Thuế');
      }

      for (const catName of targetCatNames) {
        const targetTone = removeTones(catName);
        const matchedCat = categories?.find(c => removeTones(c.name) === targetTone);
        if (matchedCat) {
          const key = `${docId}_${matchedCat.id}`;
          if (!linksToInsertMap.has(key)) {
            linksToInsertMap.set(key, {
              id: crypto.randomUUID(),
              document_id: docId,
              category_id: matchedCat.id,
              is_primary: false
            });
          }
          if (matchedCat.parent_id) {
            const parentKey = `${docId}_${matchedCat.parent_id}`;
            if (!linksToInsertMap.has(parentKey)) {
              linksToInsertMap.set(parentKey, {
                id: crypto.randomUUID(),
                document_id: docId,
                category_id: matchedCat.parent_id,
                is_primary: false
              });
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ Lỗi xử lý ${filename}:`, err.message);
    }
  }

  // Insert links
  const linksArray = Array.from(linksToInsertMap.values());
  console.log(`\n💾 Đang lưu ${linksArray.length} liên kết danh mục vào Supabase...`);
  for (let i = 0; i < linksArray.length; i += 50) {
    const batch = linksArray.slice(i, i + 50);
    await supabase.from('document_category_links').upsert(batch, { onConflict: 'document_id,category_id' });
  }

  // Insert 4-Tier Relations
  console.log('\n🌿 ĐANG THIẾT LẬP CÂY PHẢ HỆ PHÁP LÝ...');
  const relationsToInsert: any[] = [];
  for (const r of HIERARCHY_TREE_RELATIONS) {
    const source = insertedDocsMap.get(r.source);
    const target = insertedDocsMap.get(r.target);
    if (!source || !target) continue;

    relationsToInsert.push({
      id: crypto.randomUUID(),
      source_document_id: source.id,
      target_document_id: target.id,
      relation_type: r.type,
      notes: r.notes,
      created_at: new Date().toISOString()
    });
  }

  console.log(`💾 Đang nạp ${relationsToInsert.length} quan hệ phả hệ vào Supabase...`);
  await supabase.from('document_relations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('document_relations').insert(relationsToInsert);

  // Sync demo-data.ts
  const { data: freshDocs } = await supabase.from('legal_documents').select('*, files:document_files(*)').order('issued_date', { ascending: false });
  const { data: freshCats } = await supabase.from('categories').select('*').order('order_index');
  const { data: freshLinks } = await supabase.from('document_category_links').select('*');
  const { data: freshRels } = await supabase.from('document_relations').select('*');

  let code = '// PACO LegalBook - Master Authentic Legal Database (Decree 30/2020 Administrative Format)\n';
  code += "import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';\n\n";
  code += 'export const DEMO_CATEGORIES: Category[] = ' + JSON.stringify(freshCats, null, 2) + ';\n\n';
  code += 'export const DEMO_DOCUMENTS: LegalDocument[] = ' + JSON.stringify(freshDocs, null, 2) + ';\n\n';
  code += 'export const DEMO_DOCUMENT_CATEGORY_LINKS: DocumentCategoryLink[] = ' + JSON.stringify(freshLinks, null, 2) + ';\n\n';
  code += 'export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = DEMO_DOCUMENT_CATEGORY_LINKS;\n\n';
  code += 'export const DEMO_DOCUMENT_RELATIONS: DocumentRelation[] = ' + JSON.stringify(freshRels || [], null, 2) + ';\n\n';
  code += 'export const DEMO_RELATIONS: DocumentRelation[] = DEMO_DOCUMENT_RELATIONS;\n\n';
  code += `export function buildCategoryTree(categories: Category[] = DEMO_CATEGORIES) {
  const map = new Map<string, any>();
  const roots: any[] = [];
  categories.forEach(c => map.set(c.id, { ...c, children: [] }));
  categories.forEach(c => {
    const node = map.get(c.id);
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find(d => d.id === id);
}

export function getDocumentRelations(docId: string): { as_source: DocumentRelation[]; as_target: DocumentRelation[] } {
  return {
    as_source: DEMO_DOCUMENT_RELATIONS.filter(r => r.source_document_id === docId),
    as_target: DEMO_DOCUMENT_RELATIONS.filter(r => r.target_document_id === docId),
  };
}

export function getDocumentsForCategoryTree(categoryId: string, categories: Category[] = DEMO_CATEGORIES): LegalDocument[] {
  const targetIds = new Set<string>([categoryId]);
  const findChildren = (pid: string) => {
    categories.filter(c => c.parent_id === pid).forEach(child => {
      targetIds.add(child.id);
      findChildren(child.id);
    });
  };
  findChildren(categoryId);
  const matchingDocIds = new Set(
    DEMO_DOCUMENT_CATEGORY_LINKS.filter(l => targetIds.has(l.category_id)).map(l => l.document_id)
  );
  return DEMO_DOCUMENTS.filter(d => matchingDocIds.has(d.id));
}

export function getCategoryDocumentCount(categoryId: string, categories: Category[] = DEMO_CATEGORIES): number {
  return getDocumentsForCategoryTree(categoryId, categories).length;
}
`;

  fs.writeFileSync('src/lib/demo-data.ts', code, 'utf8');
  console.log(`\n🎉 HOÀN TẤT NẠP ${freshDocs?.length} VĂN BẢN VÀO SUPABASE CLOUD & DEMO_DATA!`);
}

main().catch(console.error);
