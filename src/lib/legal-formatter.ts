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
  docNumber?: string | null
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
 * and document structure (Tiêu đề, Căn cứ, Chương, Điều, Khoản, Điểm, Bảng, Chữ ký)
 * into a semantic, responsive HTML structure conforming to Decree No. 30/2020/NĐ-CP.
 */
export function formatLegalHtmlContent(htmlContent: string | null | undefined, doc?: Partial<LegalDocument>): string {
  if (!htmlContent) return '';

  let html = htmlContent.trim();

  // 1. Remove raw underscore / dash decorative lines that mimic physical underlines
  html = html.replace(/_{3,}/g, '');
  html = html.replace(/(?:^|<p[^>]*>|\s)(?:-{4,}|—{3,})(?:<\/p>|\s|$)/g, '');

  // 2. Format 2-Column Administrative Letterhead (Nghị định 30/2020/NĐ-CP)
  html = formatAdministrativeMasthead(html, doc);
  // 3. Clean up empty paragraphs, repeated <br> tags and merge broken PDF paragraph splits
  html = cleanEmptyParagraphsAndSpacers(html);
  html = mergeBrokenParagraphs(html);

  html = formatDocumentTitleBlock(html, doc);

  // 4.5. Format Official Dispatch Elements (V/v, Kính gửi, Nơi nhận & Chữ ký chuẩn Nghị định 30)
  html = formatOfficialDispatchElements(html);

  // 5. Format Legal Basis Block (Căn cứ pháp lý)
  html = formatLegalBasisBlock(html);

  // 6. Format Chapter Headings (Chương I - QUY ĐỊNH CHUNG)
  html = formatChapterHeadings(html);

  // 7. Format Articles, Clauses, and Points (Điều, Khoản 1., Điểm a))
  // 7. Format Articles, Clauses, and Points (Điều, Khoản 1., Điểm a))
  html = formatArticlesAndClauses(html);

  // 8. Format Appendices & Forms (Phụ lục, Biểu mẫu)
  html = formatAppendixAndForms(html);

  // 9. Wrap tables for smooth horizontal scrolling and enhance signature blocks
  html = wrapTablesAndSignatures(html);

  return html;
}

/**
 * Formats the administrative letterhead into a semantic 2-column grid.
 */
function formatAdministrativeMasthead(html: string, doc?: Partial<LegalDocument>): string {
  // If already structured with .document-letterhead, return as-is
  if (html.includes('document-letterhead') || html.includes('legal-masthead')) {
    return html;
  }

  const hasNationalMotto = /CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM/i.test(html);
  const hasSlogan = /Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc/i.test(html);

  if (!hasNationalMotto && !hasSlogan && !doc?.issuing_body) {
    return html;
  }

  // Extract parts from HTML or doc metadata
  const extractedAgency = extractAgencyFromHtml(html);
  const agencyName = (extractedAgency || doc?.issuing_body || 'CƠ QUAN BAN HÀNH').trim();

  const extractedDocNumber = extractDocNumberFromHtml(html);
  const docNumber = (extractedDocNumber || doc?.document_number || '').trim();

  const extractedDate = extractDateFromHtml(html);
  const placeAndDate = extractedDate || (doc?.issued_date ? formatLegalDate(doc.issued_date) : '');
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

  // Case A: Table-based letterhead (common in Word imports & TVPL tables)
  const tableLetterheadRegex = /<table[^>]*>[\s\S]*?(?:CỘNG\s+H[ÒO]A\s+XÃ\s+HỘI\s+CHỦ\s+NGHĨA\s+VIỆT\s+NAM|Độc\s+lập\s*[-–—]\s*Tự\s+do\s*[-–—]\s*Hạnh\s+phúc)[\s\S]*?<\/table>/i;
  if (tableLetterheadRegex.test(html)) {
    return html.replace(tableLetterheadRegex, letterheadHtml);
  }

  // Case B: Boundary-safe paragraph-based vertical letterhead
  // Find where the document body/title/preamble begins (NEVER search beyond this boundary)
  const boundaryRegex = /(<(?:h[1-6]|p)[^>]*>\s*(?:<strong>|<b>|<em>|<i>)?\s*(?:Căn cứ|LUẬT|BỘ LUẬT|NGHỊ ĐỊNH|THÔNG TƯ|QUYẾT ĐỊNH|CÔNG VĂN|NGHỊ QUYẾT|CHỈ THỊ|Chương\s+[IVXLCDM\d]+|Điều\s+\d+|Kính gửi))/i;
  const matchBoundary = html.match(boundaryRegex);

  let bodySection = '';
  if (matchBoundary && matchBoundary.index !== undefined && matchBoundary.index >= 0) {
    bodySection = html.slice(matchBoundary.index);
  } else {
    bodySection = html;
  }
  const hasBodyWrapper = html.startsWith('<div class="document-full-body">');
  if (bodySection) {
    const cleanBody = bodySection.replace(/<\/div>\s*$/, '');
    return hasBodyWrapper
      ? `<div class="document-full-body">\n${letterheadHtml}\n${cleanBody}\n</div>`
      : `${letterheadHtml}\n${bodySection}`;
  }

  return hasBodyWrapper
    ? `<div class="document-full-body">\n${letterheadHtml}\n</div>`
    : letterheadHtml;
}

/**
 * Cleans empty paragraphs, repeated linebreaks, and placeholder gaps.
 */
function cleanEmptyParagraphsAndSpacers(html: string): string {
  let res = html;
  // Remove paragraphs that contain only whitespace, &nbsp;, <br>
  res = res.replace(/<p[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');
  // Collapse multiple <br> inside paragraphs to at most one <br>
  res = res.replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>');
  // Clean redundant style margins on paragraphs
  res = res.replace(/style=["']margin-(?:top|bottom):\s*\d+px;?["']/gi, '');
  return res;
}

/**
 * Formats the document title into a semantic title block.
 */
function formatDocumentTitleBlock(html: string, _doc?: Partial<LegalDocument>): string {
  // If title block already structured, return
  if (html.includes('legal-doc-title-block')) {
    return html;
  }

  // Pattern for separate Document Type (THÔNG TƯ / NGHỊ ĐỊNH / LUẬT / ...) and Title
  const separateTitleRegex = /<p[^>]*>\s*(?:<strong>|<b>)?\s*(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|LUẬT|BỘ LUẬT|CÔNG VĂN|NGHỊ QUYẾT|CHỈ THỊ)\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*<p[^>]*>\s*(?:<strong>|<b>)?\s*([^<]+?)\s*(?:<\/strong>|<\/b>)?\s*<\/p>/i;

  const separateMatch = html.match(separateTitleRegex);
  if (separateMatch) {
    const docType = separateMatch[1].trim();
    const docTitle = separateMatch[2].trim();
    const formattedTitle = `
<div class="legal-doc-title-block">
  <h1 class="legal-doc-type">${docType}</h1>
  <p class="legal-doc-title">${docTitle}</p>
</div>`;
    return html.replace(separateMatch[0], formattedTitle);
  }

  // Pattern for combined Document Type & Title in one heading/paragraph
  const combinedTitleRegex = /<p[^>]*>\s*(?:<strong>|<b>)?\s*((?:THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|LUẬT|BỘ LUẬT|CÔNG VĂN|NGHỊ QUYẾT|CHỈ THỊ)\s+(?:SỐ\s+)?[\w\d\/\.\-]+\s+[^\n<]+)\s*(?:<\/strong>|<\/b>)?\s*<\/p>/i;
  const combinedMatch = html.match(combinedTitleRegex);
  if (combinedMatch && !combinedMatch[1].includes('Căn cứ')) {
    const fullTitle = combinedMatch[1].trim();
    const formattedTitle = `
<div class="legal-doc-title-block">
  <h1 class="legal-doc-title">${fullTitle}</h1>
</div>`;
    return html.replace(combinedMatch[0], formattedTitle);
  }

  return html;
}

/**
 * Formats legal basis paragraphs (Căn cứ...) with semantic classes.
 */
function formatLegalBasisBlock(html: string): string {
  // Match paragraphs starting with "Căn cứ", "Theo đề nghị", or concluding issuing statements
  return html.replace(
    /<p([^>]*)>\s*(?:<em>|<i>)?\s*(Căn cứ\s+[^\n<]+|Theo đề nghị của\s+[^\n<]+|Bộ trưởng[^\n<]+ban hành[^\n<]+)\s*(?:<\/em>|<\/i>)?\s*<\/p>/gi,
    (_match, _attr, content) => `<p class="legal-basis"><em>${content.trim()}</em></p>`
  );
}

/**
 * Formats Chapter headings (Chương I - QUY ĐỊNH CHUNG) cleanly.
 */
function formatChapterHeadings(html: string): string {
  // Pattern: <p><strong>Chương I<br>QUY ĐỊNH CHUNG</strong></p> or two separate lines
  const chapterPattern = /<(?:p|h[1-4])[^>]*>\s*(?:<strong>|<b>)?\s*(Chương\s+[IVXLCDM\d]+|Phần\s+[IVXLCDM\d]+|Mục\s+\d+|Phụ\s+lục\s*[\dIVX]*)(?:<br\s*\/?>|\s*<\/strong><\/p>\s*<p[^>]*><strong>|\s*[-–—:]\s*|\s*\n\s*)([\s\S]*?)\s*(?:<\/strong>|<\/b>)?\s*<\/(?:p|h[1-4])>/gi;

  return html.replace(chapterPattern, (_match, chapNum, chapTitle) => {
    const cleanNum = chapNum.replace(/<[^>]+>/g, '').trim();
    const cleanTitle = chapTitle.replace(/<[^>]+>/g, '').trim();
    const prefixMatch = cleanNum.match(/^([^\s]+)\s+([IVXLCDM\d]+)/i);
    const id = prefixMatch
      ? `${prefixMatch[1].toLowerCase().replace(/đ/g, 'd')}-${prefixMatch[2].toLowerCase()}`
      : `chuong-${cleanNum.toLowerCase().replace(/\s+/g, '-')}`;
    return `
<div class="legal-chapter-block" id="${id}">
  <p class="legal-chapter-num">${cleanNum}</p>
  <h2 class="legal-chapter-title">${cleanTitle}</h2>
</div>`;
  });
}

/**
 * Formats Articles (Điều X), Clauses (1., 2.), and Points (a), b)) with semantic classes.
 */
function formatArticlesAndClauses(html: string): string {
  let res = html;

  // 1. Articles: <h2/h3/p><strong>Điều X.</strong> ...</h2/h3/p> or <p><strong>Điều X. Tiêu đề</strong></p>
  res = res.replace(
    /<(?:h[2-4]|p)[^>]*>(?:\s*<a[^>]*><\/a>)?\s*(?:<strong>|<b>)?\s*(Điều\s+\d+[a-z]?)[.:\s]\s*(?:<\/strong>|<\/b>)?\s*([\s\S]*?)<\/(?:h[2-4]|p)>/gi,
    (_match, articleNum, restContent) => {
      const cleanNum = articleNum.trim();
      const numMatch = cleanNum.match(/^Điều\s+(\d+[a-z]?)/i);
      const articleId = numMatch ? `dieu-${numMatch[1].toLowerCase()}` : undefined;
      const idAttr = articleId ? ` id="${articleId}"` : '';

      // Strip inner tags for title text
      const cleanRest = restContent.replace(/<\/?(?:strong|b|a|span)[^>]*>/gi, '').trim();
      const fullTitle = cleanRest ? `${cleanNum}. ${cleanRest}` : cleanNum;

      return `<h2 class="legal-article-title"${idAttr}>${fullTitle}</h2>`;
    }
  );

  // 2. Clauses: <p>1. Nội dung khoản...</p> or <p><strong>1.</strong> Nội dung...</p>
  res = res.replace(
    /<p([^>]*)>\s*(?:<strong>|<b>)?\s*(\d+)\.\s*(?:<\/strong>|<\/b>)?\s+([^<]+(?:<(?!\/p>)[^>]+>[^<]*)*)<\/p>/gi,
    (_match, attr, num, content) => {
      return `<p${attr} class="legal-clause"><span class="clause-num">${num}.</span> <span class="clause-text">${content.trim()}</span></p>`;
    }
  );

  // 3. Points: <p>a) Nội dung điểm...</p> or <p><strong>a)</strong> Nội dung...</p>
  res = res.replace(
    /<p([^>]*)>\s*(?:<strong>|<b>)?\s*([a-zđ])\)\s*(?:<\/strong>|<\/b>)?\s+([^<]+(?:<(?!\/p>)[^>]+>[^<]*)*)<\/p>/gi,
    (_match, attr, letter, content) => {
      return `<p${attr} class="legal-point"><span class="point-num">${letter})</span> <span class="point-text">${content.trim()}</span></p>`;
    }
  );

  return res;
}

/**
 * Merges isolated numbers, article labels, and chapter titles that were broken into separate paragraphs by raw PDF parsing.
 */
function mergeBrokenParagraphs(html: string): string {
  let res = html;

  // 1. Merge isolated Chapter titles: <p>Chương I</p><p>QUY ĐỊNH CHUNG</p>
  res = res.replace(
    /<p[^>]*>\s*(?:<strong>|<b>)?\s*(Chương\s+[IVXLCDM\d]+)\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*<p([^>]*)>/gi,
    (_m, ch, pAttr) => `<p${pAttr}><strong>${ch} - </strong> `
  );

  // 2. Merge isolated Article titles: <p>Điều 1.</p><p>Phạm vi điều chỉnh</p>
  res = res.replace(
    /<p[^>]*>\s*(?:<strong>|<b>)?\s*(Điều\s+\d+[a-z]?\.?)\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*<p([^>]*)>/gi,
    (_m, d, pAttr) => {
      const cleanD = d.endsWith('.') ? d : `${d}.`;
      return `<p${pAttr}><strong>${cleanD}</strong> `;
    }
  );

  // 3. Merge isolated Clause numbers: <p>2.</p><p>“Thỏa thuận của Nhà chức trách...”</p>
  res = res.replace(
    /<p[^>]*>\s*(?:<strong>|<b>)?\s*(\d+\.?)\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*<p([^>]*)>/gi,
    (_m, num, pAttr) => {
      const cleanNum = num.endsWith('.') ? num : `${num}.`;
      return `<p${pAttr}><strong>${cleanNum}</strong> `;
    }
  );

  // 4. Merge isolated Point letters: <p>a)</p><p>Nội dung điểm a...</p>
  res = res.replace(
    /<p[^>]*>\s*(?:<strong>|<b>)?\s*([a-zđ]\)|[a-zđ]\.)\s*(?:<\/strong>|<\/b>)?\s*<\/p>\s*<p([^>]*)>/gi,
    (_m, pt, pAttr) => `<p${pAttr}><strong>${pt}</strong> `
  );

  return res;
}

/**
 * Formats Appendices and Forms (Phụ lục I, Biểu mẫu số...) with semantic classes.
 */
function formatAppendixAndForms(html: string): string {
  const appendixPattern = /<p[^>]*>\s*(?:<strong>|<b>)?\s*(Phụ\s+lục\s*[\dIVX\-a-zA-Z\/]*|Biểu\s+mẫu\s*(?:số)?\s*[\dIVX\-a-zA-Z\/]*|Mẫu\s+số\s*[\dIVX\-a-zA-Z\/]*)(?:<br\s*\/?>|\s*<\/strong><\/p>\s*<p[^>]*><strong>|\s*[-–—:]\s*|\s*\n\s*)([\s\S]*?)\s*(?:<\/strong>|<\/b>)?\s*<\/p>/gi;

  return html.replace(appendixPattern, (_match, appNum, appTitle) => {
    const cleanNum = appNum.replace(/<[^>]+>/g, '').trim();
    const cleanTitle = appTitle.replace(/<[^>]+>/g, '').trim();
    const numPart = cleanNum.match(/[\dIVX]+/i)?.[0]?.toLowerCase() || '1';
    const id = `phu-luc-${numPart}`;
    return `
<div class="legal-appendix-block" id="${id}">
  <p class="legal-appendix-num">${cleanNum}</p>
  <h3 class="legal-appendix-title">${cleanTitle}</h3>
</div>`;
  });
}
/**
 * Wraps tables for smooth horizontal scrolling and enhances signature blocks.
 */
function wrapTablesAndSignatures(html: string): string {
  let result = html;
  
  // Replace un-wrapped tables (exclude already wrapped or letterhead tables)
  result = result.replace(/<table(?![^>]*class=["'][^"']*(?:legal-table|document-letterhead))([^>]*)>/gi, '<div class="legal-table-wrapper"><table class="legal-table"$1>');
  result = result.replace(/<\/table>(?!\s*<\/div>)/gi, '</table></div>');

  // Format signature blocks (TM. BỘ ..., KT. ..., NGƯỜI KÝ, NƠI NHẬN)
  result = result.replace(
    /<p[^>]*style=["'][^"']*text-align:\s*right[^"']*["']>([\s\S]*?(?:TM\.|KT\.|BỘ TRƯỞNG|CỤC TRƯỞNG|TỔNG CỤC TRƯỞNG|CHỦ TỊCH|GIÁM ĐỐC|THỦ TƯỚNG)[\s\S]*?)<\/p>/gi,
    '<div class="document-signature-block legal-signature-block"><div class="signature-signer">$1</div></div>'
  );

  return result;
}
/**
 * Formats specific elements of official dispatches (Công văn):
 * - "V/v:" subject line
 * - "Kính gửi:" recipient salutation
 * - "Nơi nhận:" and 2-column signature block (Decree 30/2020/NĐ-CP)
 */
function formatOfficialDispatchElements(html: string): string {
  let res = html;

  // 1. Format Official Dispatch Heading: <p><strong>CÔNG VĂN</strong><br/><strong>Về việc...</strong></p>
  const dispatchTitleRegex = /<p[^>]*>\s*(?:<strong>|<b>)?\s*CÔNG\s+VĂN\s*(?:<\/strong>|<\/b>)?\s*<br\s*\/?>\s*(?:<strong>|<b>)?\s*([\s\S]*?)\s*(?:<\/strong>|<\/b>)?\s*<\/p>/i;
  res = res.replace(dispatchTitleRegex, (_m, subjectText) => {
    const cleanSubject = subjectText
      .replace(/<\/?(?:strong|b|em|i)[^>]*>/gi, '')
      .replace(/^(?:Về\s+việc|V\/v:?|Về\s+)\s*:?\s*/i, '')
      .trim();
    return `
<div class="legal-doc-title-block dispatch-title-block">
  <p class="dispatch-label font-bold text-slate-700 text-xs tracking-wider uppercase mb-1">CÔNG VĂN</p>
  <h1 class="legal-doc-title text-base sm:text-lg font-bold text-slate-900 leading-snug">V/v: ${cleanSubject}</h1>
</div>`;
  });

  // 1.1 Format standalone "V/v:" or "Về việc:" subject line
  res = res.replace(
    /<p([^>]*)>\s*(?:<strong>|<b>)?\s*(V\/v:|Về việc:)\s*([\s\S]*?)(?:<\/strong>|<\/b>)?\s*<\/p>/gi,
    (_m, _attr, prefix, content) => {
      const cleanContent = content.replace(/<\/?(?:strong|b|em|i)[^>]*>/gi, '').trim();
      return `<p class="dispatch-subject"><strong>${prefix}</strong> ${cleanContent}</p>`;
    }
  );

  // 2. Format "Kính gửi:" recipient block
  res = res.replace(
    /<p([^>]*)>\s*(?:<strong>|<b>)?\s*(Kính\s+gửi:?)\s*(?:<\/strong>|<\/b>)?\s*([\s\S]*?)<\/p>/gi,
    (_m, _attr, prefix, content) => {
      const cleanContent = content.trim();
      return `<p class="dispatch-recipient"><strong>${prefix.endsWith(':') ? prefix : prefix + ':'}</strong> ${cleanContent}</p>`;
    }
  );
  // 3. Format 2-Column Administrative Footer (Nơi nhận & Chữ ký)
  const footerTableRegex = /<table[^>]*>[\s\S]*?Nơi\s+nhận[\s\S]*?(?:KT\.|TL\.|TM\.|TỔNG\s+CỤC\s+TRƯỞNG|CỤC\s+TRƯỞNG|GIÁM\s+ĐỐC|BỘ\s+TRƯỞNG|THỦ\s+TRƯỞNG)[\s\S]*?<\/table>/gi;
  res = res.replace(footerTableRegex, (match) => {
    // Extract recipients from left td
    const leftCellMatch = match.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
    const leftContent = leftCellMatch ? leftCellMatch[1] : '';

    // Extract signature from right td
    const rightCellMatches = [...match.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    const rightContent = rightCellMatches.length > 1 ? rightCellMatches[1][1] : '';

    // Parse recipient lines
    const recipientLines = leftContent
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.toLowerCase().includes('nơi nhận'));

    // Parse signature lines
    const signatureLines = rightContent
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '')
      .replace(/<[^>]+>/g, '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const positionLines = signatureLines.filter(
      (l) =>
        l.startsWith('KT.') ||
        l.startsWith('TL.') ||
        l.startsWith('TM.') ||
        l.includes('TỔNG CỤC TRƯỞNG') ||
        l.includes('PHÓ TỔNG CỤC TRƯỞNG') ||
        l.includes('CỤC TRƯỞNG') ||
        l.includes('PHÓ CỤC TRƯỞNG') ||
        l.includes('GIÁM ĐỐC') ||
        l.includes('THỦ TRƯỞNG')
    );

    const signerName = signatureLines.length > 0 ? signatureLines[signatureLines.length - 1] : '';
    const hasSigned = rightContent.toLowerCase().includes('đã ký');

    return `
<div class="dispatch-footer-grid" role="region" aria-label="Nơi nhận và Chữ ký">
  <div class="dispatch-recipients-box">
    <p class="dispatch-recipients-title"><em><strong>Nơi nhận:</strong></em></p>
    <ul class="dispatch-recipients-list">
      ${recipientLines.map((line) => `<li>${line.startsWith('-') ? line : '- ' + line}</li>`).join('\n      ')}
    </ul>
  </div>
  <div class="dispatch-signature-box">
    <p class="signature-position"><strong>${positionLines.join('<br/>') || 'KT. THỦ TRƯỞNG CƠ QUAN'}</strong></p>
    ${hasSigned ? '<p class="signature-signed"><em>(Đã ký điện tử)</em></p>' : '<p class="signature-signed" style="height: 36px;"></p>'}
    <p class="signature-name"><strong>${signerName && !positionLines.includes(signerName) ? signerName : ''}</strong></p>
  </div>
</div>`;
  });

  return res;
}

function extractAgencyFromHtml(html: string): string | null {
  const match = html.match(/(?:<strong>|<b>|<p[^>]*>)\s*(BỘ\s+[A-ZÀ-Ỹ\s]+|TỔNG\s+CỤC\s+[A-ZÀ-Ỹ\s]+|CỤC\s+[A-ZÀ-Ỹ\s]+|ỦY\s+BAN\s+NHÂN\s+DÂN\s+[A-ZÀ-Ỹ\s]+|CHÍNH\s+PHỦ|QUỐC\s+HỘI|TÒA\s+ÁN\s+[A-ZÀ-Ỹ\s]+|VIỆN\s+KIỂM\s+SÁT\s+[A-ZÀ-Ỹ\s]+)\s*(?:<\/strong>|<\/b>|<\/p>)/i);
  return match ? match[1].trim() : null;
}
function extractDocNumberFromHtml(html: string): string | null {
  const match = html.match(/Số:\s*([A-Za-z0-9\/\-\.À-Ỹà-ỹ_]+)/i);
  return match ? match[1].trim() : null;
}

function extractDateFromHtml(html: string): string | null {
  // Match full location and date e.g. "Hà Nội, ngày 18 tháng 8 năm 2026" or "TP. Hồ Chí Minh, ngày 25 tháng 05 năm 2026"
  const matchWithPlace = html.match(/((?:Hà\s+Nội|TP\.\s*Hồ\s+Chí\s+Minh|Thành\s+phố\s+[A-ZÀ-Ỹa-zà-ỹ\s]+|[A-ZÀ-Ỹa-zà-ỹ\s]+),\s*ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})/i);
  if (matchWithPlace) {
    return matchWithPlace[1].trim();
  }

  // Match date only without location
  const matchDateOnly = html.match(/(ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+\d{4})/i);
  return matchDateOnly ? matchDateOnly[1].trim() : null;
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
