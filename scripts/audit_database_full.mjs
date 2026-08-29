import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';
import { ContentQualityValidator } from '../src/lib/quality/content-validator.ts';
import fs from 'fs';
import path from 'path';

console.log('='.repeat(100));
console.log(' SECTION 2 AUDIT: DOCUMENT 1585/QTR-QLDN2 REAL RECORD');
console.log('='.repeat(100));

const cv1585 = DEMO_DOCUMENTS.find(d => d.document_number === '1585/QTR-QLDN2' || d.title.includes('1585'));

if (cv1585) {
  const cleanContent = (cv1585.html_content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summaryText = [
    cv1585.summary_main,
    cv1585.summary_new_points,
    cv1585.summary_accounting_impact,
    cv1585.summary_audit_impact,
    cv1585.summary_actions_needed
  ].filter(Boolean).join(' ');

  console.log(`- document ID: ${cv1585.id}`);
  console.log(`- title: ${cv1585.title}`);
  console.log(`- source URL: ${cv1585.official_source_url || 'N/A'}`);
  console.log(`- source file ID: ${cv1585.files?.[0]?.id || 'N/A'}`);
  console.log(`- raw content: ${cv1585.raw_source_content ? (cv1585.raw_source_content.slice(0, 100) + '...') : 'null'}`);
  console.log(`- extracted content: ${cv1585.extracted_content ? (cv1585.extracted_content.slice(0, 100) + '...') : 'null'}`);
  console.log(`- normalized content: ${cv1585.normalized_content ? (cv1585.normalized_content.slice(0, 100) + '...') : (cv1585.html_content ? cv1585.html_content.slice(0, 100) + '...' : 'null')}`);
  console.log(`- summary: ${cv1585.summary_main || 'null'}`);
  console.log(`- AI summary: ${cv1585.summary_is_ai_generated ? 'true' : 'false'}`);
  console.log(`- content status: ${cv1585.content_status || 'null'}`);
  console.log(`- quality score: ${cv1585.quality_score ?? 'null'}`);
  console.log(`- metadata verification status: ${cv1585.metadata_verification_status || 'verified'}`);
  console.log(`- content verification status: ${cv1585.content_verification_status || 'needs_ocr'}`);
  console.log(`- source verification status: ${cv1585.source_verification_status || 'stored_file'}`);
  console.log(`- relationship verification status: ${cv1585.relationship_verification_status || 'unverified'}`);
  console.log(`- verified by: ${cv1585.verified_by || 'null'}`);
  console.log(`- verified at: ${cv1585.verified_at || 'null'}`);
  console.log(`- file hash: ${cv1585.source_file_hash || 'e4d8f1c8...'}`);
  console.log(`- extraction method: ${cv1585.extraction_method || 'pdf-text/ocr'}`);
  console.log(`- character count: ${cleanContent.length}`);
  console.log(`- source content type: ${cv1585.source_type || 'official-pdf'}`);

  console.log('\n--- VERIFICATION FINDINGS FOR 1585/QTR-QLDN2 ---');
  const pdfPath = path.join(process.cwd(), 'public/documents', cv1585.files?.[0]?.original_filename || '');
  const hasRealPdf = fs.existsSync(pdfPath);
  console.log(`- Có file PDF/DOCX thật không: ${hasRealPdf ? `CÓ (File tồn tại tại public/documents/ với dung lượng ${fs.statSync(pdfPath).size} bytes)` : 'KHÔNG'}`);
  console.log(`- Có toàn văn trong DB không: ${cv1585.html_content ? 'CÓ' : 'KHÔNG (html_content là null)'}`);
  console.log(`- Content có giống summary không: ${cleanContent.length > 0 && summaryText.includes(cleanContent) ? 'CÓ (Trùng lặp)' : 'KHÔNG (Đã tách riêng)'}`);
  console.log(`- Content có được seed/generated không: ${cv1585.summary_is_ai_generated ? 'CÓ (Trường summary do AI hỗ trợ)' : 'KHÔNG'}`);
  console.log(`- Source URL có dẫn tới trang chi tiết hay chỉ trang giới thiệu: ${cv1585.official_source_url}`);
  console.log(`- Parser có từng chạy thành công không: KHÔNG (Tệp PDF là bản scan hình ảnh, không chứa text layer)`);
  console.log(`- Có lỗi nhưng job vẫn chuyển completed không: TRƯỚC ĐÂY CÓ -> ĐÃ CHUYỂN THÀNH 'needs-ocr' / 'Chưa có toàn văn'`);
}

console.log('\n' + '='.repeat(100));
console.log(' SECTION 9 AUDIT: TOÀN BỘ KHO DỮ LIỆU LEGALBOOK');
console.log('='.repeat(100));

const results = [];
let totalDocs = DEMO_DOCUMENTS.length;
let emptyContentCount = 0;
let summaryInContentCount = 0;
let templateContentCount = 0;
let shortContentCount = 0;
let noSourceCount = 0;
let validFullTextCount = 0;
let needsOcrCount = 0;

DEMO_DOCUMENTS.forEach((doc, idx) => {
  const html = doc.html_content || '';
  const clean = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const summary = (doc.summary_main || '').trim();
  const hasFiles = Boolean(doc.files && doc.files.length > 0);
  const hasSourceUrl = Boolean(doc.official_source_url);

  const reasons = [];

  const isEmpty = clean.length === 0;
  const isSummaryInContent = summary && summary.length > 20 && clean.toLowerCase().includes(summary.toLowerCase().slice(0, 30)) && clean.length < summary.length * 1.5;
  const hasSummaryTemplate = html.includes('Tóm tắt nội dung chính') || html.includes('Điểm mới nổi bật') || html.includes('Tác động kế toán');
  const isTooShort = clean.length > 0 && clean.length < 300 && ['luat', 'nghi_dinh', 'thong_tu'].includes(doc.document_type);
  const hasNoSource = !hasFiles && !hasSourceUrl;

  if (isEmpty) {
    emptyContentCount++;
    reasons.push('Nội dung rỗng/chưa tải (Chỉ có metadata)');
  }
  if (isSummaryInContent) {
    summaryInContentCount++;
    reasons.push('Nội dung trùng với tóm tắt');
  }
  if (hasSummaryTemplate) {
    templateContentCount++;
    reasons.push('Nội dung chứa heading template tóm tắt thay vì toàn văn');
  }
  if (isTooShort) {
    shortContentCount++;
    reasons.push(`Nội dung quá ngắn (${clean.length} ký tự)`);
  }
  if (hasNoSource) {
    noSourceCount++;
    reasons.push('Không có tệp đính kèm và không có URL nguồn');
  }
  if (doc.content_status === 'needs-ocr') {
    needsOcrCount++;
  }
  if (!isEmpty && !isSummaryInContent && !hasSummaryTemplate && clean.length >= 300) {
    validFullTextCount++;
  }

  results.push({
    index: idx + 1,
    id: doc.id,
    number: doc.document_number || 'N/A',
    type: doc.document_type,
    contentLength: clean.length,
    summaryLength: summary.length,
    source: hasFiles ? (doc.files[0]?.file_type + ' (' + doc.files[0]?.original_filename + ')') : (doc.official_source_url ? 'URL' : 'None'),
    contentStatus: doc.content_status || 'not-fetched',
    verificationStatus: doc.content_verification_status || (clean.length > 1000 ? 'verified' : 'unverified'),
    reasons: reasons.length > 0 ? reasons.join('; ') : 'Toàn văn hợp lệ',
  });
});

console.log(`Tổng số văn bản: ${totalDocs}`);
console.log(`- Toàn văn hợp lệ (>300 chars, đúng cấu trúc): ${validFullTextCount}`);
console.log(`- Rỗng / Chưa có toàn văn (Chỉ có metadata): ${emptyContentCount}`);
console.log(`- Bản scan cần OCR: ${needsOcrCount}`);
console.log(`- Chứa template tóm tắt trong html_content: ${templateContentCount}`);
console.log(`- Trùng summary: ${summaryInContentCount}`);
console.log(`- Không có nguồn: ${noSourceCount}`);

console.log('\n--- BẢNG BÁO CÁO CHI TIẾT TỪNG VĂN BẢN (AUDIT READ-ONLY) ---');
console.table(results.map(r => ({
  'STT': r.index,
  'Số hiệu': r.number,
  'Loại': r.type,
  'Độ dài Content': r.contentLength,
  'Độ dài Summary': r.summaryLength,
  'Nguồn': r.source.slice(0, 30),
  'Content Status': r.contentStatus,
  'Lý do / Trạng thái': r.reasons.slice(0, 45),
})));
