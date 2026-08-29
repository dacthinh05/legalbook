import { DEMO_DOCUMENTS } from '../src/lib/demo-data';

console.log('=== INSPECTING DOCUMENT 132/2026/NĐ-CP AND ALL OTHERS ===\n');

const doc132 = DEMO_DOCUMENTS.find(d => d.document_number === '132/2026/NĐ-CP');
if (doc132) {
  console.log('Document 132/2026/NĐ-CP Title:', doc132.title);
  console.log('HTML Length:', doc132.html_content?.length);
  console.log('HTML Content snippet:\n', doc132.html_content?.slice(0, 1500));
} else {
  console.log('Doc 132 not found!');
}

console.log('\n--- SCANNING ALL 58 DOCS FOR MISSING OPENING ARTICLES (Điều 1) ---');
const missingD1: Array<{ idx: number; num: string | null; title: string; length: number; snippet: string }> = [];
DEMO_DOCUMENTS.forEach((d, i) => {
  const html = d.html_content || '';
  const hasDieu1 = /Điều\s+1[.\s:]/i.test(html) || /Chương\s+I/i.test(html) || d.document_type === 'cong_van';
  if (!hasDieu1) {
    missingD1.push({
      idx: i + 1,
      num: d.document_number,
      title: d.title,
      length: html.length,
      snippet: html.slice(0, 400)
    });
  }
});

console.log(`Missing Điều 1 count: ${missingD1.length}`);
missingD1.forEach(m => {
  console.log(`[${m.idx}] [${m.num}] ${m.title} (${m.length} chars)`);
  console.log(`Snippet: ${m.snippet.replace(/\n/g, ' ')}\n`);
});
