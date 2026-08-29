/**
 * audit_official_dispatches.js
 * 
 * Read-only audit script for all Official Dispatches (Công văn) in LegalBook repository.
 * Inspects content status, summary segregation, dates, applicability, and relationships.
 */

const path = require('path');
const { DEMO_DOCUMENTS, DEMO_RELATIONS } = require('../src/lib/demo-data.ts');

console.log('='.repeat(80));
console.log('🔍 AUDIT TOÀN BỘ CÔNG VĂN TRONG LEGALBOOK');
console.log('='.repeat(80));

const dispatches = DEMO_DOCUMENTS.filter(d => d.document_type === 'cong_van');

console.log(`\nTổng số Công văn trong hệ thống: ${dispatches.length}\n`);

const report = [];

dispatches.forEach((doc, idx) => {
  const hasFile = doc.files && doc.files.length > 0;
  const hasHtmlContent = Boolean(doc.html_content && doc.html_content.trim().length > 0);
  const htmlLen = doc.html_content ? doc.html_content.length : 0;
  const summaryLen = (doc.summary_main || '').length + (doc.summary_new_points || '').length;

  // Check if html_content looks like a summary
  const isLikelySummaryInContent = hasHtmlContent && (
    doc.html_content.includes('Tóm tắt') ||
    doc.html_content.includes('Điểm mới') ||
    doc.html_content.includes('Tác động kế toán') ||
    doc.html_content.includes('<h3>1.') ||
    doc.html_content.includes('<h3>2.')
  );

  // Check relations
  const rels = DEMO_RELATIONS.filter(r => r.source_document_id === doc.id || r.target_document_id === doc.id);

  const warnings = [];
  if (isLikelySummaryInContent) warnings.push('⚠️ html_content chứa heading dạng tóm tắt (cần tách bạch)');
  if (!hasHtmlContent && !hasFile) warnings.push('⚠️ Thiếu cả toàn văn lẫn tệp đính kèm');
  if (doc.effective_date && doc.effective_date === doc.issued_date) warnings.push('ℹ️ Ngày hiệu lực đang copy từ ngày ban hành');

  report.push({
    index: idx + 1,
    id: doc.id,
    number: doc.document_number || 'N/A',
    title: (doc.title || '').slice(0, 50) + '...',
    content_status: doc.content_status || 'unspecified',
    quality_status: doc.quality_status || 'unspecified',
    hasFile: hasFile ? `Có (${doc.files.length})` : 'Không',
    hasHtmlContent: hasHtmlContent ? `Có (${htmlLen} chars)` : 'Null / Rỗng',
    summaryLen: `${summaryLen} chars`,
    issued_date: doc.issued_date || '—',
    effective_date: doc.effective_date || '—',
    relations_count: rels.length,
    warnings: warnings.length > 0 ? warnings.join('; ') : '✓ Hợp lệ',
  });
});

console.table(report.map(r => ({
  '#': r.index,
  'Số hiệu': r.number,
  'Toàn văn HTML': r.hasHtmlContent,
  'Tệp đính kèm': r.hasFile,
  'Ban hành': r.issued_date,
  'Hiệu lực': r.effective_date,
  'Quan hệ': r.relations_count,
  'Cảnh báo': r.warnings,
})));

console.log('\nChi tiết từng Công văn:');
report.forEach(r => {
  console.log(`\n[${r.index}] ${r.number} — ID: ${r.id}`);
  console.log(`    Tiêu đề: ${r.title}`);
  console.log(`    Trạng thái: content=${r.content_status}, quality=${r.quality_status}`);
  console.log(`    Cảnh báo: ${r.warnings}`);
});

console.log('\n' + '='.repeat(80));
console.log('HOÀN TẤT AUDIT');
console.log('='.repeat(80));
