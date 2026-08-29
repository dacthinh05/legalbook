import { DEMO_DOCUMENTS } from '../src/lib/demo-data';
import type { LegalDocument } from '../src/types';

function formatAdministrativeMastheadSafe(html: string, doc?: Partial<LegalDocument>): string {
  if (html.includes('document-letterhead') || html.includes('legal-masthead')) {
    return html;
  }

  // Find boundary where body text / title / preamble starts
  const boundaryRegex = /(<(?:h[1-6]|p)[^>]*>\s*(?:<strong>|<b>|<em>|<i>)?\s*(?:Căn cứ|LUẬT|BỘ LUẬT|NGHỊ ĐỊNH|THÔNG TƯ|QUYẾT ĐỊNH|CÔNG VĂN|NGHỊ QUYẾT|CHỈ THỊ|Chương\s+[IVXLCDM\d]+|Điều\s+\d+|Kính gửi))/i;
  const matchBoundary = html.match(boundaryRegex);

  let bodySection = '';

  if (matchBoundary && matchBoundary.index !== undefined && matchBoundary.index > 0) {
    bodySection = html.slice(matchBoundary.index);
  }

  // Extract from HTML or doc metadata
  const agencyName = (doc?.issuing_body || 'CƠ QUAN BAN HÀNH').trim();
  const docNumber = (doc?.document_number || '').trim();
  const placeAndDate = doc?.issued_date ? `ngày ${doc.issued_date.slice(8, 10)} tháng ${doc.issued_date.slice(5, 7)} năm ${doc.issued_date.slice(0, 4)}` : '';

  const letterheadHtml = `
<div class="document-letterhead" role="region" aria-label="Đầu văn bản hành chính">
  <section class="letterhead-left">
    <p class="letterhead-agency">${agencyName.toUpperCase()}</p>
    <div class="letterhead-rule letterhead-rule-agency" aria-hidden="true"></div>
    ${docNumber ? `<p class="letterhead-number">${docNumber.startsWith('Số:') ? docNumber : 'Số: ' + docNumber}</p>` : ''}
  </section>
  <section class="letterhead-right">
    <p class="letterhead-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="letterhead-motto-slogan">Độc lập - Tự do - Hạnh phúc</p>
    <div class="letterhead-rule letterhead-rule-motto" aria-hidden="true"></div>
    ${placeAndDate ? `<p class="letterhead-date">${placeAndDate}</p>` : ''}
  </section>
</div>`;

  const hasBodyWrapper = html.startsWith('<div class="document-full-body">');
  const cleanBody = bodySection.replace(/<\/div>\s*$/, '');
  
  return hasBodyWrapper 
    ? `<div class="document-full-body">\n${letterheadHtml}\n${cleanBody}\n</div>`
    : `${letterheadHtml}\n${bodySection}`;
}

const doc132 = DEMO_DOCUMENTS.find(d => d.document_number === '132/2026/NĐ-CP');
if (doc132) {
  console.log('Original HTML length:', doc132.html_content?.length);
  const formatted = formatAdministrativeMastheadSafe(doc132.html_content, doc132);
  console.log('Formatted HTML length:', formatted.length);
  console.log('Contains Điều 1?', formatted.includes('Điều 1'));
  console.log('Contains Điều 2?', formatted.includes('Điều 2'));
  console.log('Contains Điều 8?', formatted.includes('Điều 8'));
  console.log('Contains Điều 9?', formatted.includes('Điều 9'));
  console.log('\n--- FORMATTED PREVIEW ---\n', formatted.slice(0, 1500));
}
