import {
  DetectedLegalMetadata,
  ReferencedDocumentItem,
  MetadataConflict,
} from './types';
import { restoreVietnameseLegalText } from './vietnamese-normalizer';

// Issuing bodies mapping
const KNOWN_ISSUING_BODIES: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /tổng\s*liên\s*đoàn\s*lao\s*động\s*việt\s*nam|tlđlđvn|tlđ/i, name: 'Tổng Liên đoàn Lao động Việt Nam' },
  { pattern: /tổng\s*cục\s*thuế|tct/i, name: 'Tổng cục Thuế' },
  { pattern: /bộ\s*tài\s*chính|btc/i, name: 'Bộ Tài chính' },
  { pattern: /chính\s*phủ|cp/i, name: 'Chính phủ' },
  { pattern: /quốc\s*hội|qh/i, name: 'Quốc hội' },
  { pattern: /ngân\s*hàng\s*nhà\s*nước|nhnn/i, name: 'Ngân hàng Nhà nước Việt Nam' },
  { pattern: /bộ\s*kế\s*hoạch\s*và\s*đầu\s*tư|bkhđt/i, name: 'Bộ Kế hoạch và Đầu tư' },
  { pattern: /bộ\s*lao\s*động\s*-\s*thương\s*binh\s*và\s*xã\s*hội|blđtbxh/i, name: 'Bộ Lao động - Thương binh và Xã hội' },
  { pattern: /bộ\s*tư\s*pháp|btp/i, name: 'Bộ Tư pháp' },
  { pattern: /cục\s*thuế\s*(tp|thành\s*phố)?\s*hồ\s*chí\s*minh|hcm/i, name: 'Cục Thuế TP. Hồ Chí Minh' },
  { pattern: /cục\s*thuế\s*(tp|thành\s*phố)?\s*hà\s*nội/i, name: 'Cục Thuế TP. Hà Nội' },
  { pattern: /ubnd\s*(tỉnh|thành\s*phố)?\s*hồ\s*chí\s*minh/i, name: 'UBND TP. Hồ Chí Minh' },
  { pattern: /ubnd\s*(tỉnh|thành\s*phố)?\s*hà\s*nội/i, name: 'UBND TP. Hà Nội' },
];

/**
 * Standardizes Windows-safe filenames.
 */
export function generateSafeFileName(
  typeShort: string,
  docNumber: string | null,
  year: number | null,
  shortTitle: string,
  extension: string = 'docx',
  preserveDiacritics: boolean = false
): string {
  const cleanNumber = (docNumber || 'VB')
    .replace(/[\/\\:\*\?"<>\|]/g, '-')
    .replace(/\s+/g, '');
  
  let cleanTitle = shortTitle
    .replace(/[\/\\:\*\?"<>\|]/g, '')
    .replace(/\s+/g, '-')
    .trim();

  if (!preserveDiacritics) {
    // Strip accents for maximum filesystem compatibility
    cleanTitle = cleanTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  // Truncate title if too long (Windows max path 260 chars)
  if (cleanTitle.length > 50) {
    cleanTitle = cleanTitle.slice(0, 50).replace(/-+$/, '');
  }

  const prefix = typeShort ? `${typeShort}_` : '';
  const yearPart = year && !cleanNumber.includes(String(year)) ? `_${year}` : '';
  const ext = extension.replace(/^\./, '');

  return `${prefix}${cleanNumber}${yearPart}_${cleanTitle}.${ext}`.replace(/_+/g, '_');
}

/**
 * Parses raw text & filename to detect legal metadata, referenced documents, and conflicts.
 */
export function detectLegalDocumentMetadata(
  rawText: string,
  originalFileName: string
): DetectedLegalMetadata {
  const warnings: string[] = [];
  const conflicts: MetadataConflict[] = [];
  const referencedDocuments: ReferencedDocumentItem[] = [];

  // Normalize text for parsing
  const { normalizedText } = restoreVietnameseLegalText(rawText);
  const first2000Chars = normalizedText.slice(0, 2500);

  // 1. Detect Document Type from content header & filename
  let docType = 'cong_van';
  let docTypeLabel = 'Công văn';
  let typeShort = 'CV';

  if (/^(Luật|Bộ luật)/im.test(first2000Chars) || /\b(Luật|Bo luat)\b/i.test(originalFileName)) {
    docType = 'luat';
    docTypeLabel = 'Luật';
    typeShort = 'Luat';
  } else if (/^Nghị định/im.test(first2000Chars) || /\b(Nghị định|Nghị Định|ND|NĐ)\b/i.test(originalFileName)) {
    // Distinguish if document is an official dispatch introducing a decree vs decree itself
    if (/^Công văn|Kính gửi/im.test(first2000Chars) && !/^Nghị định/im.test(first2000Chars)) {
      docType = 'cong_van';
      docTypeLabel = 'Công văn';
      typeShort = 'CV';
    } else if (first2000Chars.includes('NGHỊ ĐỊNH') || /^Nghị định/im.test(first2000Chars) || originalFileName.toLowerCase().startsWith('nd') || originalFileName.toLowerCase().startsWith('nđ')) {
      docType = 'nghi_dinh';
      docTypeLabel = 'Nghị định';
      typeShort = 'ND';
    }
  } else if (/^Thông tư/im.test(first2000Chars) || (first2000Chars.includes('THÔNG TƯ') && !first2000Chars.includes('Kính gửi:')) || originalFileName.toLowerCase().startsWith('tt')) {
    if (/^Công văn|Kính gửi/im.test(first2000Chars) && !/^Thông tư/im.test(first2000Chars)) {
      docType = 'cong_van';
      docTypeLabel = 'Công văn';
      typeShort = 'CV';
    } else {
      docType = 'thong_tu';
      docTypeLabel = 'Thông tư';
      typeShort = 'TT';
    }
  } else if (/^Quyết định/im.test(first2000Chars) || originalFileName.toLowerCase().startsWith('qd') || originalFileName.toLowerCase().startsWith('qđ')) {
    docType = 'quyet_dinh';
    docTypeLabel = 'Quyết định';
    typeShort = 'QD';
  } else if (/^Nghị quyết/im.test(first2000Chars) || originalFileName.toLowerCase().startsWith('nq')) {
    docType = 'nghi_quyet';
    docTypeLabel = 'Nghị quyết';
    typeShort = 'NQ';
  } else if (/Văn bản hợp nhất/i.test(first2000Chars) || /VBHN/i.test(originalFileName)) {
    docType = 'van_ban_hop_nhat';
    docTypeLabel = 'Văn bản hợp nhất';
    typeShort = 'VBHN';
  } else if (/^Thông báo/im.test(first2000Chars) || originalFileName.toLowerCase().startsWith('tb')) {
    docType = 'thong_bao';
    docTypeLabel = 'Thông báo';
    typeShort = 'TB';
  }

  // 2. Extract Document Number (Số hiệu)
  let docNumber: string | null = null;
  let hasOfficialSymbol = false;

  // Search for formal document number line e.g. "Số: 2231/BTC-TCT", "Số: 253/2026/NĐ-CP", "Số: 87/2026/TT-BTC", "Số: 1363/TLĐ-CSPL"
  const numberMatch = first2000Chars.match(/Số\s*:\s*([0-9]+(?:\/[A-Z0-9\-_đĐ]+)+)/i) ||
                      first2000Chars.match(/Số\s*([0-9]+(?:\/[A-Z0-9\-_đĐ]+)+)/i);

  if (numberMatch) {
    docNumber = numberMatch[1].trim();
    hasOfficialSymbol = docNumber.includes('/');
  } else {
    // Extract from filename as fallback
    const fnMatch = originalFileName.match(/(?:CV|TT|ND|NĐ|QD|QĐ|Luật|NQ)\s*([0-9]{4}\s*-\s*[0-9]+|[0-9]+(?:\.[0-9]+)?(?:\/[A-Z0-9\-_]+)?)/i);
    if (fnMatch) {
      const rawFnNum = fnMatch[1].replace(/\s*-\s*/g, '/').replace(/\s+/g, '');
      docNumber = rawFnNum;
      warnings.push('Số hiệu được trích xuất từ tên tệp, chưa có ký hiệu chính thức đầy đủ từ nội dung.');
    }
  }

  // 3. Extract Year of Issuance
  let detectedYear: number | null = null;
  const yearFromDateMatch = first2000Chars.match(/ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+(\d{4})/i);
  if (yearFromDateMatch) {
    detectedYear = parseInt(yearFromDateMatch[1], 10);
  } else if (docNumber) {
    const yMatch = docNumber.match(/\/(20[2-3][0-9])\//) || docNumber.match(/(20[2-3][0-9])/);
    if (yMatch) detectedYear = parseInt(yMatch[1], 10);
  }

  // Extract year mentioned in filename to detect conflicts
  const fnYearMatch = originalFileName.match(/\b(20[2-3][0-9])\b/);
  if (fnYearMatch) {
    const fnYear = parseInt(fnYearMatch[1], 10);
    if (detectedYear && fnYear !== detectedYear) {
      conflicts.push({
        field: 'year',
        fileValue: String(fnYear),
        contentValue: String(detectedYear),
        suggestedValue: String(detectedYear),
        reason: `Tên tệp ghi năm ${fnYear} nhưng nội dung văn bản xác nhận năm ${detectedYear}. Đề xuất sử dụng năm ${detectedYear}.`,
      });
      warnings.push(`Xung đột năm ban hành: Tên file ghi ${fnYear}, nội dung văn bản ghi ${detectedYear}.`);
    } else if (!detectedYear) {
      detectedYear = fnYear;
    }
  }

  // 4. Extract Issuing Body (Cơ quan ban hành)
  let issuingBody: string | null = null;
  for (const known of KNOWN_ISSUING_BODIES) {
    if (known.pattern.test(first2000Chars)) {
      issuingBody = known.name;
      break;
    }
  }
  if (!issuingBody && docNumber) {
    if (docNumber.includes('BTC')) issuingBody = 'Bộ Tài chính';
    else if (docNumber.includes('TCT')) issuingBody = 'Tổng cục Thuế';
    else if (docNumber.includes('NĐ-CP') || docNumber.includes('NQ-CP')) issuingBody = 'Chính phủ';
    else if (docNumber.includes('QH')) issuingBody = 'Quốc hội';
    else if (docNumber.includes('TLĐ')) issuingBody = 'Tổng Liên đoàn Lao động Việt Nam';
    else if (docNumber.includes('NHNN')) issuingBody = 'Ngân hàng Nhà nước Việt Nam';
  }

  // 5. Extract Signer & Title
  let signer: string | null = null;
  let signerTitle: string | null = null;
  const signerMatch = normalizedText.slice(-1500).match(/(KT\.\s*BỘ\s*TRƯỞNG|KT\.\s*TỔNG\s*CỤC\s*TRƯỞNG|KT\.\s*CHỦ\s*TỊCH|BỘ\s*TRƯỞNG|THỨ\s*TRƯỞNG|PHÓ\s*TỔNG\s*CỤC\s*TRƯỞNG|CHỦ\s*TỊCH|PHÓ\s*CHỦ\s*TỊCH)\s*\n+([A-ZÀ-Ỹ\s]{3,40})/i);
  if (signerMatch) {
    signerTitle = signerMatch[1].trim();
    signer = signerMatch[2].trim();
  }

  // 6. Extract Dates (Issued Date & Effective Date)
  let issuedDate: string | null = null;
  let effectiveDate: string | null = null;

  const dateMatch = first2000Chars.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    issuedDate = `${year}-${month}-${day}`;
  }

  const effDateMatch = normalizedText.match(/hiệu\s*lực(?:\s*thi\s*hành)?\s*từ\s*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (effDateMatch) {
    const day = effDateMatch[1].padStart(2, '0');
    const month = effDateMatch[2].padStart(2, '0');
    const year = effDateMatch[3];
    effectiveDate = `${year}-${month}-${day}`;
  } else if (issuedDate) {
    effectiveDate = issuedDate;
  }

  // 7. Extract Referenced Documents from Text & Filename
  const refMatches = [
    ...normalizedText.matchAll(/(?:Nghị định|NĐ)\s*(?:số)?\s*([0-9]+(?:\/[0-9]+\/NĐ-CP|[0-9\-]+)?)/gi),
    ...normalizedText.matchAll(/(?:Thông tư|TT)\s*(?:số)?\s*([0-9]+(?:\/[0-9]+\/TT-[A-Z]+|[0-9\-]+)?)/gi),
    ...normalizedText.matchAll(/(?:Luật)\s*(?:số)?\s*([0-9]+(?:\/[0-9]+\/QH[0-9]+|[A-Za-z0-9\s]+)?)/gi),
  ];

  const seenRefs = new Set<string>();
  for (const m of refMatches) {
    const fullText = m[0].trim();
    const num = m[1]?.trim();
    if (!seenRefs.has(fullText) && fullText.length < 50) {
      seenRefs.add(fullText);
      const isGuide = /hướng dẫn|quy định chi tiết/i.test(normalizedText);
      referencedDocuments.push({
        documentNumber: num || fullText,
        title: fullText,
        relationType: isGuide ? 'guides' : 'cites',
        evidence: `Trích xuất từ nội dung: "${fullText}"`,
      });
    }
  }

  // 8. Extract Summary / Subject (Trích yếu)
  let summary = '';
  const vvMatch = first2000Chars.match(/V\/v\s*:\s*([^\n\r]+)/i);
  const veViecMatch = first2000Chars.match(/Về\s*việc\s*([^\n\r]+)/i);

  if (vvMatch) {
    const rawSummary = vvMatch[1].trim();
    if (/^Về\s*việc/i.test(rawSummary)) {
      summary = rawSummary.replace(/^Về\s*việc\s*/i, 'về việc ');
    } else {
      summary = rawSummary;
    }
  } else if (veViecMatch) {
    summary = `về việc ${veViecMatch[1].trim()}`;
  } else {
    // Try title line
    const titleLineMatch = first2000Chars.match(/^(?:QUY ĐỊNH|HƯỚNG DẪN|QUYẾT ĐỊNH|THÔNG TƯ|NGHỊ ĐỊNH)\s+([^\n\r]+)/im);
    if (titleLineMatch) {
      summary = titleLineMatch[0].trim();
    } else {
      // Fallback clean title from filename
      const { normalizedText: fnClean } = restoreVietnameseLegalText(
        originalFileName.replace(/\.(docx|doc|pdf)$/i, '').replace(/^(?:CV|TT|ND|NĐ|QD|QĐ)\s*[0-9\-_.\s]+/i, '')
      );
      summary = fnClean.replace(/^[-_\s]+/, '').trim();
    }
  }

  // 9. Standard Title Generation
  // Format: [Loại văn bản] số [số hiệu] [trích yếu]
  let standardTitle = '';
  const numberText = docNumber ? `số ${docNumber}` : (detectedYear ? `năm ${detectedYear}` : '');
  
  let summaryPart = '';
  if (summary) {
    const sLower = summary.toLowerCase();
    if (sLower.startsWith('về việc') || sLower.startsWith('quy định') || sLower.startsWith('hướng dẫn')) {
      summaryPart = summary;
    } else {
      summaryPart = `về ${summary}`;
    }
  }
  
  if (numberText && summaryPart) {
    standardTitle = `${docTypeLabel} ${numberText} ${summaryPart}`.replace(/\s+/g, ' ').trim();
  } else if (numberText) {
    standardTitle = `${docTypeLabel} ${numberText}`.trim();
  } else {
    standardTitle = `${docTypeLabel}: ${summary || originalFileName}`.trim();
  }

  // 10. Generate Suggested File Name
  const ext = originalFileName.split('.').pop() || 'docx';
  const suggestedFileName = generateSafeFileName(
    typeShort,
    docNumber,
    detectedYear,
    summary || standardTitle,
    ext
  );

  return {
    documentType: docType,
    documentNumber: docNumber,
    year: detectedYear,
    issuingBody,
    issuedDate,
    effectiveDate,
    signer,
    signerTitle,
    title: summary || standardTitle,
    standardTitle,
    suggestedFileName,
    summary: summary || standardTitle,
    hasOfficialSymbol,
    referencedDocuments: referencedDocuments.slice(0, 5),
    conflicts,
    warnings,
    confidence: docNumber && hasOfficialSymbol ? 0.95 : 0.82,
  };
}
