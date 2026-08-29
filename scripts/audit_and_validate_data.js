/**
 * LegalBook Data Quality Audit Script (Read-Only)
 * 
 * Audits all documents in the database / demo data repository.
 * Detects missing content, fake placeholders, summary repetition, and quality metrics.
 */

const fs = require('fs');
const path = require('path');

const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
const demoContent = fs.readFileSync(demoDataPath, 'utf8');

// Find the DEMO_DOCUMENTS export block
const startIndex = demoContent.indexOf('export const DEMO_DOCUMENTS');
const endIndex = demoContent.indexOf('export const DEMO_CATEGORY_LINKS');

if (startIndex === -1 || endIndex === -1) {
  console.error('ERROR: Could not locate DEMO_DOCUMENTS block in demo-data.ts');
  process.exit(1);
}

const docsBlock = demoContent.substring(startIndex, endIndex);
const arrayStart = docsBlock.indexOf('[');
const arrayEnd = docsBlock.lastIndexOf(']');
const jsonString = docsBlock.substring(arrayStart, arrayEnd + 1);

const vm = require('vm');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext('var docs = ' + jsonString, sandbox);
const docs = sandbox.docs;

console.log('='.repeat(80));
console.log(' LEGALBOOK DATA QUALITY AUDIT REPORT (READ-ONLY)');
console.log('='.repeat(80));
console.log(`Total documents found in repository: ${docs.length}\n`);

let totalChars = 0;
let completeCount = 0;
let partialCount = 0;
let invalidPlaceholderCount = 0;
let emptyCount = 0;
let scanNeedsOcrCount = 0;
let noSourceCount = 0;

const issues = [];

docs.forEach((doc, idx) => {
  const html = doc.html_content || '';
  const clean = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const charCount = clean.length;
  totalChars += charCount;

  const articles = (clean.match(/Điều\s+\d+/gi) || []).length;
  const chapters = (clean.match(/Chương\s+[IVXLCDM\d]+/gi) || []).length;
  const paragraphs = (html.match(/<p\b/gi) || []).length;
  const hasFiles = Boolean(doc.files && doc.files.length > 0);
  const summary = (doc.summary_main || '').trim();

  // Detection rules
  const isEmpty = charCount === 0;
  const isSummaryRepetition = summary && summary.length > 20 && clean.toLowerCase().includes(summary.toLowerCase().slice(0, 30)) && charCount < summary.length * 1.5;
  const isShortPlaceholder = (charCount < 350 && articles === 0) || (html.includes('<h2>') && paragraphs <= 3 && articles === 0 && charCount < 500);
  const isScanNeedingOcr = charCount < 120 && hasFiles && articles === 0;
  const isNoSource = !doc.official_source_url && !hasFiles;

  let qualityStatus = 'complete';
  const warnings = [];

  if (isEmpty) {
    qualityStatus = 'empty';
    emptyCount++;
    warnings.push('Nội dung rỗng hoàn toàn (0 ký tự)');
  } else if (isScanNeedingOcr) {
    qualityStatus = 'needs-ocr';
    scanNeedsOcrCount++;
    warnings.push('Có file đính kèm nhưng không có text (Cần OCR scan)');
  } else if (isSummaryRepetition || isShortPlaceholder) {
    qualityStatus = 'invalid_placeholder';
    invalidPlaceholderCount++;
    warnings.push(isSummaryRepetition ? 'Nội dung trùng với tóm tắt' : 'Nội dung chỉ là vài dòng placeholder/mẫu');
  } else if (articles === 0 && ['luat', 'nghi_dinh', 'thong_tu'].includes(doc.document_type) && charCount < 1000) {
    qualityStatus = 'partial';
    partialCount++;
    warnings.push('Thiếu cấu trúc Điều/Khoản quy chuẩn');
  } else {
    completeCount++;
  }

  if (isNoSource) {
    noSourceCount++;
    warnings.push('Không có URL nguồn hoặc tệp lưu trữ');
  }

  if (warnings.length > 0) {
    issues.push({
      id: doc.id,
      number: doc.document_number || 'NO_NUM',
      title: doc.title,
      type: doc.document_type,
      charCount,
      articles,
      status: qualityStatus,
      warnings,
      url: doc.official_source_url,
    });
  }
});

console.log('--- SUMMARY METRICS ---');
console.log(`- Tổng số văn bản: ${docs.length}`);
console.log(`- Toàn văn hợp lệ: ${completeCount}`);
console.log(`- Thiếu nội dung / Rỗng: ${emptyCount}`);
console.log(`- Nghi ngờ nội dung giả / Placeholder: ${invalidPlaceholderCount}`);
console.log(`- Trích xuất 1 phần: ${partialCount}`);
console.log(`- Cần quét OCR: ${scanNeedsOcrCount}`);
console.log(`- Không có nguồn: ${noSourceCount}`);
console.log(`- Tổng dung lượng ký tự: ${totalChars.toLocaleString('vi-VN')} chars`);

console.log('\n--- DETAILED ISSUES & FLAGGED DOCUMENTS (' + issues.length + ' documents) ---');
issues.forEach((iss, i) => {
  console.log(`\n[${i + 1}] ID: ${iss.id}`);
  console.log(`    Số hiệu: ${iss.number} | Loại: ${iss.type}`);
  console.log(`    Tên: ${iss.title}`);
  console.log(`    Ký tự: ${iss.charCount} | Số Điều: ${iss.articles} | Trạng thái: ${iss.status}`);
  console.log(`    Cảnh báo: ${iss.warnings.join(' | ')}`);
  if (iss.url) console.log(`    Nguồn: ${iss.url}`);
});

console.log('\n' + '='.repeat(80));
console.log(' END OF AUDIT REPORT');
console.log('='.repeat(80));
