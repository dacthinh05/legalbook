/**
 * LegalBook Safe Backfill Pipeline (Strict & Authoritative Match)
 * 
 * Maps public/documents/*.docx files to their exact target documents.
 * Never performs loose substring matching.
 */

const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
const backupPath = path.join(__dirname, '../src/lib/demo-data.backup.ts');
const docsDir = path.join(__dirname, '../public/documents');

// 1. Revert to original backup or read fresh
const originalCode = fs.existsSync(backupPath) ? fs.readFileSync(backupPath, 'utf8') : fs.readFileSync(demoDataPath, 'utf8');

// 2. Parse DEMO_DOCUMENTS block
const startIndex = originalCode.indexOf('export const DEMO_DOCUMENTS');
const endIndex = originalCode.indexOf('export const DEMO_CATEGORY_LINKS');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not locate DEMO_DOCUMENTS block');
  process.exit(1);
}

const docsBlock = originalCode.substring(startIndex, endIndex);
const arrayStart = docsBlock.indexOf('[');
const arrayEnd = docsBlock.lastIndexOf(']');
const jsonString = docsBlock.substring(arrayStart, arrayEnd + 1);

const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext('var docs = ' + jsonString, sandbox);
const docs = sandbox.docs;

console.log(`Loaded ${docs.length} documents for strict backfill processing.`);

// Exact Document Number to File Map
const EXACT_DOC_TO_FILE_MAP = {
  '109/2025/QH15': 'Luật 109.2025.QH15 - Luật thuế TNCN 2025.docx',
  '67/2025/QH15': 'Luật 67.2025.QH15 - Luật Thuế TNDN.docx',
  '253/2026/NĐ-CP': '{2026.06.30} ND 253 thue TNCN.docx',
  '144/2026/NĐ-CP': 'ND 2026 - 144 - sua doi ND 181 luat thue GTGT.docx',
  '181/2025/NĐ-CP': 'NĐ 181.2025.NĐ-CP - Hướng dẫn chi tiết Luật Thuế GTGT.docx',
  '125/2020/NĐ-CP': 'NĐ 125.2020.NĐ-CP - Quy định xử phạt vi phạm hành chính về thuế, hóa đơn.docx',
  '132/2020/NĐ-CP': 'NĐ 132.2020.NĐ-CP - Quản lý thuế đối với doanh nghiệp có giao dịch liên kết.docx',
  '167/2025/NĐ-CP': 'NĐ 167.2025.NĐ-CP - Sửa đổi quy định về thủ tục hải quan.docx',
  '174/2025/NĐ-CP': 'NĐ 174.2025.NĐ-CP - Chính sách giảm thuế GTGT.docx',
  '20/2025/NĐ-CP': 'NĐ 20.2025NĐ-CP - Sửa đổi NĐ 1322020 về giao dịch liên kết.docx',
  '320/2025/NĐ-CP': 'NĐ 320.2025.NĐ-CP - Hướng dẫn chi tiết Luật Thuế TNDN.docx',
  '70/2025/NĐ-CP': 'NĐ 70.2025NĐ-CP - Sửa đổi quy định về hóa đơn, chứng từ.docx',
  '2301/QĐ-UBND': 'QD 2026 - 2301 - HCM - danh muc du an thu hut dau tu 2026 -2030.docx',
  '08/2026/TT-BLĐTBXH': 'TT 2026 - 08 HD thi hanh ND 337 ve hop dong LD dien tu.docx',
  '58/2026/TT-BTC': 'TT 2026 - 58 HD che do ke toan cho DN sieu nho.docx',
  '69/2025/TT-BTC': 'TT 69.2025.TT-BTC - Hướng dẫn chi tiết Luật Thuế GTGT NĐ 181.docx',
  '99/2025/TT-BTC': 'TT 99.2025.TT-BTC - Chế độ kế toán doanh nghiệp (thay thế TT 200).docx',
  '20/2026/TT-BTC': 'Thông-tư-20-2026-TT-BTC - HD Luật thuế TNDN.docx',
  '15/VBHN-BTC': 'ND 2026 - 15 VBHN - quy dinh xu phat vi pham hanh chinh ve thue - hoa don.docx',
  '112/VBHN-VPQH': 'Luat 112 VBHN - luat thue TNCN.docx',
  '3643/TNI-QLDN': 'CV 3643.TNI.QLDN - Xuất hóa đơn chuyển nhượng quyền sử dụng đất.docx',
  'PACO-T05/2026': 'Trang thông tin T05 - 2026.docx',
};

async function extractDocx(filePath) {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.convertToHtml({ buffer });
  const rawHtml = result.value || '';
  const textResult = await mammoth.extractRawText({ buffer });
  const rawText = textResult.value || '';
  return {
    html: `<div class="document-full-body">\n${rawHtml}\n</div>`,
    text: rawText,
  };
}

async function runPipeline() {
  const docxCache = new Map();

  for (const [docNum, filename] of Object.entries(EXACT_DOC_TO_FILE_MAP)) {
    const fullPath = path.join(docsDir, filename);
    if (fs.existsSync(fullPath)) {
      try {
        const extracted = await extractDocx(fullPath);
        docxCache.set(filename, extracted);
        console.log(`  ✓ Loaded authoritative file: ${filename} for [${docNum}] (${extracted.text.length} chars)`);
      } catch (err) {
        console.warn(`  ✕ Error extracting ${filename}:`, err.message);
      }
    } else {
      console.warn(`  ✕ File not found: ${filename}`);
    }
  }

  let updatedCount = 0;
  let clearedPlaceholderCount = 0;
  let preservedAuthenticCount = 0;

  for (const doc of docs) {
    const num = (doc.document_number || '').trim();
    const title = (doc.title || '').trim();

    const matchedFilename = EXACT_DOC_TO_FILE_MAP[num] || (doc.id === 'doc-paco-tt-05-2026' ? 'Trang thông tin T05 - 2026.docx' : null);

    if (matchedFilename && docxCache.has(matchedFilename)) {
      const extracted = docxCache.get(matchedFilename);
      doc.html_content = extracted.html;
      doc.content_status = 'verified';
      doc.quality_status = 'complete';
      doc.source_type = 'official-docx';
      doc.review_status = 'published';
      doc.extraction_method = 'docx';
      doc.extraction_confidence = 0.98;
      updatedCount++;
      console.log(`[VERIFIED & UPDATED] [${num}] from ${matchedFilename}`);
    } else if (doc.id === 'doc-nd-255-gdlk-2026') {
      // Authentic decree content embedded from real source
      doc.content_status = 'verified';
      doc.quality_status = 'complete';
      doc.source_type = 'official-html';
      doc.review_status = 'published';
      preservedAuthenticCount++;
      console.log(`[PRESERVED REAL CONTENT] [${num}] 255/2026/NĐ-CP`);
    } else {
      // Documents with no full text file: STRICTLY mark as NOT FETCHED
      doc.html_content = null;
      doc.content_status = 'not-fetched';
      doc.quality_status = 'invalid';
      doc.source_type = doc.official_source_url ? 'secondary-source' : 'unknown';
      clearedPlaceholderCount++;
      console.log(`[MARKED NO FULL TEXT] [${num || 'NO_NUM'}] ${title.slice(0, 45)}...`);
    }
  }

  console.log('\n--- STRICT BACKFILL RESULTS ---');
  console.log(`- Total repository documents: ${docs.length}`);
  console.log(`- Authoritatively backfilled with full-text DOCX: ${updatedCount}`);
  console.log(`- Preserved authentic content: ${preservedAuthenticCount}`);
  console.log(`- Marked as "Chưa có toàn văn" (no full text): ${clearedPlaceholderCount}`);

  // Re-serialize DEMO_DOCUMENTS cleanly into demo-data.ts
  const newDocsBlock = 'export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ' + JSON.stringify(docs, null, 2) + ';\n\n';
  const newFullCode = originalCode.substring(0, startIndex) + newDocsBlock + originalCode.substring(endIndex);

  fs.writeFileSync(demoDataPath, newFullCode, 'utf8');
  console.log('\nSuccessfully wrote authoritative DEMO_DOCUMENTS to src/lib/demo-data.ts');
}

runPipeline().catch(console.error);
