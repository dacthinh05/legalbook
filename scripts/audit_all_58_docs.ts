import { DEMO_DOCUMENTS } from '../src/lib/demo-data';
import { ContentQualityValidator } from '../src/lib/quality/content-validator';

console.log('Total DEMO_DOCUMENTS in memory:', DEMO_DOCUMENTS.length);

const problematic = [];
const complete = [];

for (const doc of DEMO_DOCUMENTS) {
  const html = doc.html_content || '';
  const val = ContentQualityValidator.validate({
    htmlContent: html,
    title: doc.title,
    documentNumber: doc.document_number,
    documentType: doc.document_type
  });
  
  const hasDiemNoiBat = html.includes('ĐIỂM NỔI BẬT') || html.includes('legal-box') || html.includes('meta');
  const isShort = html.length < 3000;
  const isScanOrSpecial = doc.content_status === 'needs-ocr';
  
  if ((val.status !== 'complete' || hasDiemNoiBat || isShort || val.isFakeOrPlaceholder) && !isScanOrSpecial) {
    problematic.push({
      id: doc.id,
      docNum: doc.document_number,
      title: (doc.title || '').slice(0, 70),
      htmlLength: html.length,
      status: val.status,
      score: val.score,
      isFake: val.isFakeOrPlaceholder,
      hasDiemNoiBat,
      articleCount: val.metrics.articleCount,
      hasPreamble: val.metrics.hasPreamble,
      hasSignerClosing: val.metrics.hasSignerClosing,
      reason: val.warnings?.[0] || (isShort ? `Short content (${html.length} chars)` : 'Demo box')
    });
  } else {
    complete.push({
      id: doc.id,
      docNum: doc.document_number,
      title: (doc.title || '').slice(0, 50),
      htmlLength: html.length
    });
  }
}

console.log(`\n=== AUDIT SUMMARY ===`);
console.log(`Complete authentic full text documents: ${complete.length}`);
console.log(`Problematic / Stub / Demo box documents: ${problematic.length}\n`);

console.log('Problematic Documents:');
problematic.forEach((p, idx) => {
  console.log(`${idx + 1}. [${p.docNum || 'No Num'}] ${p.title}`);
  console.log(`   Length: ${p.htmlLength} chars | Score: ${p.score} | Articles: ${p.articleCount} | Reason: ${p.reason}`);
});
