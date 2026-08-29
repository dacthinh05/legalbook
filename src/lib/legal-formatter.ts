/**
 * Legal Formatter & Administrative Document Layout Processor.
 * Conforms to Decree No. 30/2020/NĐ-CP on administrative document presentation.
 */

import type { LegalDocument, DocumentType } from '@/types';

/**
 * Normalizes document title for display without duplicating document numbers or redundant prefixes.
 * Preserves the exact legal meaning and original wording.
 */
export function normalizeDisplayTitle(
  title: string | null | undefined,
  docNumber?: string | null,
  docType?: DocumentType | string | null
): string {
  if (!title) return '';
  let clean = title.trim();

  // Normalize multiple spaces
  clean = clean.replace(/\s+/g, ' ');

  // If title repeats the exact document number immediately after the type
  // e.g. "Quyết định 1293/QĐ-BTC công bố..." vs docNumber "1293/QĐ-BTC"
  // Keep title readable and natural without duplicate number clutter
  if (docNumber) {
    const numClean = docNumber.trim();
    const escapedNum = numClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    
    // Pattern: "Quyết định số 1293/QĐ-BTC 1293/QĐ-BTC về việc..." -> fix accidental double insertion
    const doubleNumPattern = new RegExp(`(${escapedNum})\\s+${escapedNum}`, 'gi');
    clean = clean.replace(doubleNumPattern, '$1');
  }

  return clean;
}

/**
 * Formats Vietnamese administrative letterheads (Quốc hiệu, Tiêu ngữ, Cơ quan ban hành, Số hiệu, Địa danh ngày tháng)
 * into a semantic 2-column CSS Grid block compliant with Nghị định 30/2020/NĐ-CP.
 * 
 * Column 1 (Left 38-42%): Issuing agency + decorative rule + Document number (Số: ...)
 * Column 2 (Right 58-62%): National motto ("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM" / "Độc lập - Tự do - Hạnh phúc") + rule + Place & Date
 */
export function formatLegalHtmlContent(htmlContent: string | null | undefined, doc?: Partial<LegalDocument>): string {
  if (!htmlContent) return '';

  let html = htmlContent;

  // 1. Convert raw underscore strings (e.g. "______", "_______________") into semantic divider rules
  html = html.replace(/_{3,}/g, '');

  // 2. Check if the HTML contains standard administrative letterhead elements
  // (CƠ QUAN BAN HÀNH / CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Số: ...)
  const hasNationalMotto = /CỘNG\s+HÒA\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(html);
  const hasSlogan = /Độc\s+lập\s*-\s*Tự\s+do\s*-\s*Hạnh\s+phúc/i.test(html);

  // If already structured with .document-letterhead, return with table wrapping
  if (html.includes('class="document-letterhead"') || html.includes("class='document-letterhead'")) {
    return wrapTablesAndSignatures(html);
  }

  if (hasNationalMotto && hasSlogan) {
    // Attempt to extract letterhead parts and construct the 2-column semantic letterhead
    try {
      // Find the agency text before or after motto
      const agencyName = doc?.issuing_body || extractAgencyFromHtml(html) || 'BỘ TÀI CHÍNH';
      const docNumber = doc?.document_number || extractDocNumberFromHtml(html) || '';
      const issuedDateFormatted = extractDateFromHtml(html) || (doc?.issued_date ? formatLegalDate(doc.issued_date) : '');

      // Check if we can safely replace the top letterhead lines
      // Typical raw pattern:
      // <p style="text-align:center;"><strong>BỘ TÀI CHÍNH</strong><br>______</p>
      // <p style="text-align:center;"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br><strong>Độc lập - Tự do - Hạnh phúc</strong><br>___________________</p>
      // <p style="text-align:right;"><em>Số: 1293/QĐ-BTC</em></p>
      
      const letterheadRegex = /<div class="document-full-body">[\s\S]*?(?:<p[^>]*>.*?CỘNG\s+HÒA\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM[\s\S]*?<\/p>[\s\S]*?(?:<p[^>]*>.*?Số:[\s\S]*?<\/p>|<p[^>]*>.*?(?:ngày|tháng|năm)[\s\S]*?<\/p>))/i;
      
      const match = html.match(letterheadRegex);
      if (match) {
        const letterheadHtml = `
<div class="document-letterhead" role="region" aria-label="Đầu văn bản hành chính">
  <div class="letterhead-left">
    <p class="letterhead-agency">${agencyName.toUpperCase()}</p>
    <div class="letterhead-rule letterhead-rule-agency" aria-hidden="true"></div>
    ${docNumber ? `<p class="letterhead-number">Số: ${docNumber.replace(/^Số:\s*/i, '')}</p>` : ''}
  </div>
  <div class="letterhead-right">
    <p class="letterhead-motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
    <p class="letterhead-motto-slogan">Độc lập - Tự do - Hạnh phúc</p>
    <div class="letterhead-rule letterhead-rule-motto" aria-hidden="true"></div>
    ${issuedDateFormatted ? `<p class="letterhead-date">${issuedDateFormatted}</p>` : ''}
  </div>
</div>`;

        // Replace the matched top header block with our semantic letterhead
        html = html.replace(match[0], `<div class="document-full-body">\n${letterheadHtml}`);
      }
    } catch {
      // Graceful fallback: return original html with safety enhancements
    }
  }

  return wrapTablesAndSignatures(html);
}

/**
 * Wraps tables for smooth horizontal scrolling and enhances signature blocks.
 */
function wrapTablesAndSignatures(html: string): string {
  // Wrap <table> with responsive container if not already wrapped
  let result = html;
  
  // Replace un-wrapped tables
  result = result.replace(/<table(?![^>]*class=["'][^"']*legal-table)([^>]*)>/gi, '<div class="legal-table-wrapper"><table class="legal-table"$1>');
  result = result.replace(/<\/table>(?!\s*<\/div>)/gi, '</table></div>');

  // Format signature blocks (TM. BỘ ..., NGƯỜI KÝ, NƠI NHẬN)
  result = result.replace(
    /<p[^>]*style=["'][^"']*text-align:\s*right[^"']*["']>([\s\S]*?(?:TM\.|KT\.|BỘ TRƯỞNG|CỤC TRƯỞNG|TỔNG CỤC TRƯỞNG|CHỦ TỊCH|GIÁM ĐỐC|THỦ TƯỚNG)[\s\S]*?)<\/p>/gi,
    '<div class="document-signature-block"><div class="signature-signer">$1</div></div>'
  );

  return result;
}

function extractAgencyFromHtml(html: string): string | null {
  const match = html.match(/<strong>\s*(BỘ\s+[A-ZÀ-Ỹ\s]+|TỔNG\s+CỤC\s+[A-ZÀ-Ỹ\s]+|CỤC\s+[A-ZÀ-Ỹ\s]+|ỦY\s+BAN\s+NHÂN\s+DÂN\s+[A-ZÀ-Ỹ\s]+|CHÍNH\s+PHỦ|QUỐC\s+HỘI)\s*<\/strong>/i);
  return match ? match[1].trim() : null;
}

function extractDocNumberFromHtml(html: string): string | null {
  const match = html.match(/Số:\s*([A-Za-z0-9\/\-\.]+)/i);
  return match ? match[1].trim() : null;
}

function extractDateFromHtml(html: string): string | null {
  const match = html.match(/((?:Hà\s+Nội|TP\.\s*Hồ\s+Chí\s+Minh|[A-ZÀ-Ỹa-zà-ỹ\s]+),\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})/i);
  return match ? match[1].trim() : null;
}

function formatLegalDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `ngày ${day} tháng ${month} năm ${year}`;
  } catch {
    return '';
  }
}
