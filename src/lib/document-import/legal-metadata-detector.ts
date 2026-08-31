import {
  DetectedLegalMetadata,
  ReferencedDocumentItem,
  MetadataConflict,
} from './types';
import { restoreVietnameseLegalText } from './vietnamese-normalizer';
import type { DocumentType } from '@/types';

// Comprehensive Issuing bodies dictionary
export const KNOWN_ISSUING_BODIES: Array<{ pattern: RegExp; name: string }> = [
  // Trung ương & Quốc hội
  { pattern: /quốc\s*hội|ủy\s*ban\s*thường\s*vụ\s*quốc\s*hội|ubtvqh|vpqh/i, name: 'Quốc hội' },
  { pattern: /chính\s*phủ|thủ\s*tướng\s*chính\s*phủ|ttcp|vpch/i, name: 'Chính phủ' },
  { pattern: /tòa\s*án\s*nhân\s*dân\s*tối\s*cao|tandtc/i, name: 'Tòa án nhân dân tối cao' },
  { pattern: /viện\s*kiểm\s*sát\s*nhân\s*dân\s*tối\s*cao|vksndtc/i, name: 'Viện kiểm sát nhân dân tối cao' },
  { pattern: /kiểm\s*toán\s*nhà\s*nước|ktnn/i, name: 'Kiểm toán Nhà nước' },

  // Các Bộ ngành
  { pattern: /bộ\s*tài\s*chính|btc/i, name: 'Bộ Tài chính' },
  { pattern: /tổng\s*cục\s*thuế|tct/i, name: 'Tổng cục Thuế' },
  { pattern: /tổng\s*cục\s*hải\s*quan|tchq/i, name: 'Tổng cục Hải quan' },
  { pattern: /kho\s*bạc\s*nhà\s*nước|kbnn/i, name: 'Kho bạc Nhà nước' },
  { pattern: /ủy\s*ban\s*chứng\s*khoán\s*nhà\s*nước|ubck/i, name: 'Ủy ban Chứng khoán Nhà nước' },
  { pattern: /ngân\s*hàng\s*nhà\s*nước|nhnn/i, name: 'Ngân hàng Nhà nước Việt Nam' },
  { pattern: /bộ\s*kế\s*hoạch\s*và\s*đầu\s*tư|bkhđt/i, name: 'Bộ Kế hoạch và Đầu tư' },
  { pattern: /bộ\s*lao\s*động\s*-\s*thương\s*binh\s*và\s*xã\s*hội|blđtbxh|bộ\s*lđtbxh/i, name: 'Bộ Lao động - Thương binh và Xã hội' },
  { pattern: /bảo\s*hiểm\s*xã\s*hội\s*việt\s*nam|bhxhvn/i, name: 'Bảo hiểm xã hội Việt Nam' },
  { pattern: /tổng\s*liên\s*đoàn\s*lao\s*động\s*việt\s*nam|tlđlđvn|tlđ/i, name: 'Tổng Liên đoàn Lao động Việt Nam' },
  { pattern: /bộ\s*tư\s*pháp|btp/i, name: 'Bộ Tư pháp' },
  { pattern: /bộ\s*công\s*thương|bct/i, name: 'Bộ Công Thương' },
  { pattern: /bộ\s*tài\s*nguyên\s*và\s*môi\s*trường|btnmt/i, name: 'Bộ Tài nguyên và Môi trường' },
  { pattern: /bộ\s*thông\s*tin\s*và\s*truyền\s*thông|btttt/i, name: 'Bộ Thông tin và Truyền thông' },
  { pattern: /bộ\s*xây\s*dựng|bxd/i, name: 'Bộ Xây dựng' },

  // Cục Thuế các tỉnh / thành phố trọng điểm
  { pattern: /cục\s*thuế\s*(tp|thành\s*phố)?\s*hồ\s*chí\s*minh|hcm/i, name: 'Cục Thuế TP. Hồ Chí Minh' },
  { pattern: /cục\s*thuế\s*(tp|thành\s*phố)?\s*hà\s*nội/i, name: 'Cục Thuế TP. Hà Nội' },
  { pattern: /cục\s*thuế\s*(tỉnh)?\s*bình\s*dương/i, name: 'Cục Thuế tỉnh Bình Dương' },
  { pattern: /cục\s*thuế\s*(tỉnh)?\s*đồng\s*nai/i, name: 'Cục Thuế tỉnh Đồng Nai' },
  { pattern: /cục\s*thuế\s*(tp|thành\s*phố)?\s*hải\s*phòng/i, name: 'Cục Thuế TP. Hải Phòng' },
  { pattern: /cục\s*thuế\s*(tp|thành\s*phố)?\s*đà\s*nẵng/i, name: 'Cục Thuế TP. Đà Nẵng' },
  { pattern: /cục\s*thuế\s*(tỉnh)?\s*bắc\s*ninh/i, name: 'Cục Thuế tỉnh Bắc Ninh' },
  { pattern: /cục\s*thuế\s*(tỉnh)?\s*quảng\s*trị/i, name: 'Cục Thuế tỉnh Quảng Trị' },
  { pattern: /cục\s*thuế\s*(tỉnh)?\s*thái\s*nguyên/i, name: 'Cục Thuế tỉnh Thái Nguyên' },
  { pattern: /cục\s*thuế\s*(tỉnh)?\s*quảng\s*ninh/i, name: 'Cục Thuế tỉnh Quảng Ninh' },

  // UBND các địa phương
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
    cleanTitle = cleanTitle
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  if (cleanTitle.length > 60) {
    cleanTitle = cleanTitle.slice(0, 60).replace(/-+$/, '');
  }

  const prefix = typeShort ? `${typeShort}_` : '';
  const yearPart = year && !cleanNumber.includes(String(year)) ? `_${year}` : '';
  const ext = extension.replace(/^\./, '');

  return `${prefix}${cleanNumber}${yearPart}_${cleanTitle}.${ext}`.replace(/_+/g, '_');
}

export interface CategoryInferenceResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  tags: string[];
}

/**
 * Automatically detects the most accurate category from 49-category taxonomy.
 */
export function detectLegalCategory(
  rawText: string,
  title: string,
  docNumber: string | null,
  docType: DocumentType
): CategoryInferenceResult {
  const combined = `${rawText.slice(0, 4000)} ${title} ${docNumber || ''}`.toLowerCase();
  const tags: string[] = [];

  // Giao dịch liên kết & Chuyển giá
  if (/giao\s*dịch\s*liên\s*kết|chuyển\s*giá|bên\s*liên\s*kết|lãi\s*vay\s*30%|ebitda|master\s*file|local\s*file|cbcr|132\/2020|20\/2025/i.test(combined)) {
    tags.push('giao-dich-lien-ket', 'chi-phi-lai-vay', 'ebitda-30');
    return {
      categoryId: 'cat-thue-tndn-gdlk',
      categoryName: 'Giao dịch liên kết & Chuyển giá',
      confidence: 0.98,
      tags
    };
  }

  // Hóa đơn, chứng từ điện tử & Máy tính tiền
  if (/hóa\s*đơn|chứng\s*từ|hóa\s*đơn\s*điện\s*tử|máy\s*tính\s*tiền|123\/2020|78\/2021|4394\/qđ-tct/i.test(combined)) {
    tags.push('hoa-don-dien-tu', 'may-tinh-tien', 'nghi-dinh-123');
    return {
      categoryId: 'cat-hoa-don-chung-tu',
      categoryName: 'Hóa đơn, chứng từ',
      confidence: 0.96,
      tags
    };
  }

  // Thuế Thu nhập Doanh nghiệp (TNDN) & Chi phí được trừ
  if (/thuế\s*tndn|thu\s*nhập\s*doanh\s*nghiệp|chi\s*phí\s*được\s*trừ|chi\s*phí\s*hợp\s*lý|tạm\s*nộp\s*80%|96\/2015|78\/2014|67\/2025|320\/2025/i.test(combined)) {
    tags.push('thue-tndn', 'chi-phi-duoc-tru', 'tam-nop-80');
    return {
      categoryId: 'cat-thue-tndn',
      categoryName: 'Thuế Thu nhập Doanh nghiệp',
      confidence: 0.95,
      tags
    };
  }

  // Thuế Giá trị Gia tăng (GTGT) & Hoàn thuế
  if (/thuế\s*gtgt|giá\s*trị\s*gia\s*tăng|hoàn\s*thuế|khấu\s*trừ\s*thuế|giảm\s*2%|219\/2013|181\/2025|48\/2024|174\/2025|80\/2021/i.test(combined)) {
    tags.push('thue-gtgt', 'hoan-thue', 'khau-tru-thue');
    return {
      categoryId: 'cat-thue-gtgt',
      categoryName: 'Thuế Giá trị Gia tăng',
      confidence: 0.95,
      tags
    };
  }

  // Thuế Thu nhập Cá nhân (TNCN) & Giảm trừ gia cảnh
  if (/thuế\s*tncn|thu\s*nhập\s*cá\s*nhân|giảm\s*trừ\s*gia\s*cảnh|người\s*phụ\s*thuộc|111\/2013|954\/2020|109\/2025|253\/2026/i.test(combined)) {
    tags.push('thue-tncn', 'giam-tru-gia-canh', 'tien-luong-tien-cong');
    return {
      categoryId: 'cat-thue-tncn',
      categoryName: 'Thuế TNCN & Tiền lương',
      confidence: 0.95,
      tags
    };
  }

  // Kiểm toán độc lập & Chuẩn mực VSA / IFRS
  if (/kiểm\s*toán|chuẩn\s*mực\s*kiểm\s*toán|vsa|báo\s*cáo\s*kiểm\s*toán|kiểm\s*toán\s*viên|cpa|vacpa|214\/2012|67\/2011|84\/2016|345\/qđ/i.test(combined)) {
    tags.push('kiem-toan-doc-lap', 'vsa-standards', 'cpa-vietnam');
    return {
      categoryId: 'cat-kiem-toan',
      categoryName: 'Kiểm toán độc lập & VSA',
      confidence: 0.97,
      tags
    };
  }

  // Kế toán & Báo cáo tài chính & Khấu hao / Dự phòng
  if (/kế\s*toán|báo\s*cáo\s*tài\s*chính|khấu\s*hao|tài\s*sản\s*cố\s*định|dự\s*phòng|200\/2014|99\/2025|45\/2013|48\/2019|133\/2016|24\/2024|88\/2015/i.test(combined)) {
    tags.push('che-do-ke-toan', 'khau-hao-tscd', 'trich-lap-du-phong');
    return {
      categoryId: 'cat-ke-toan',
      categoryName: 'Kế toán & Báo cáo tài chính',
      confidence: 0.96,
      tags
    };
  }

  // Đăng ký doanh nghiệp & Biểu mẫu kinh doanh
  if (/đăng\s*ký\s*doanh\s*nghiệp|đăng\s*ký\s*kinh\s*doanh|hộ\s*kinh\s*doanh|biểu\s*mẫu\s*đkkd|thành\s*lập\s*công\s*ty|01\/2021|02\/2023|59\/2020/i.test(combined)) {
    tags.push('dang-ky-doanh-nghiep', 'bieu-mau-dkkd', 'ho-kinh-doanh');
    return {
      categoryId: 'cat-doanh-nghiep',
      categoryName: 'Doanh nghiệp & Đăng ký kinh doanh',
      confidence: 0.95,
      tags
    };
  }

  // Lao động, Tiền lương & BHXH
  if (/bảo\s*hiểm\s*xã\s*hội|bhxh|hợp\s*đồng\s*lao\s*động|tiền\s*lương|lương\s*tối\s*thiểu|45\/2019|41\/2024|145\/2020|74\/2024/i.test(combined)) {
    tags.push('bao-hiem-xa-hoi', 'hop-dong-lao-dong', 'tien-luong');
    return {
      categoryId: 'cat-bao-hiem',
      categoryName: 'Bảo hiểm xã hội & Lao động',
      confidence: 0.94,
      tags
    };
  }

  // Mặc định cho Công văn
  if (docType === 'cong_van') {
    return {
      categoryId: 'cat-quan-ly-thue',
      categoryName: 'Quản lý thuế & Xử phạt VPHC',
      confidence: 0.85,
      tags: ['cong-van-giai-dap']
    };
  }

  return {
    categoryId: 'cat-doanh-nghiep',
    categoryName: 'Doanh nghiệp',
    confidence: 0.75,
    tags: ['van-ban-phap-luat']
  };
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
  const first2500Chars = normalizedText.slice(0, 3000);

  // 1. Detect Document Type from content header & filename
  let docType: DocumentType = 'cong_van';
  let docTypeLabel = 'Công văn';
  let typeShort = 'CV';

  if (/^(Luật|Bộ luật)/im.test(first2500Chars) || /\b(Luật|Bo luat)\b/i.test(originalFileName)) {
    docType = 'luat';
    docTypeLabel = 'Luật';
    typeShort = 'Luat';
  } else if (/^Nghị quyết/im.test(first2500Chars) || /\b(Nghị quyết|NQ)\b/i.test(originalFileName)) {
    docType = 'luat';
    docTypeLabel = 'Nghị quyết';
    typeShort = 'NQ';
  } else if (/^Nghị định/im.test(first2500Chars) || /\b(Nghị định|Nghị Định|ND|NĐ)\b/i.test(originalFileName)) {
    if (/^Công văn|Kính gửi/im.test(first2500Chars) && !/^Nghị định/im.test(first2500Chars)) {
      docType = 'cong_van';
      docTypeLabel = 'Công văn';
      typeShort = 'CV';
    } else {
      docType = 'nghi_dinh';
      docTypeLabel = 'Nghị định';
      typeShort = 'ND';
    }
  } else if (/^Thông tư/im.test(first2500Chars) || (first2500Chars.includes('THÔNG TƯ') && !first2500Chars.includes('Kính gửi:')) || originalFileName.toLowerCase().startsWith('tt')) {
    if (/^Công văn|Kính gửi/im.test(first2500Chars) && !/^Thông tư/im.test(first2500Chars)) {
      docType = 'cong_van';
      docTypeLabel = 'Công văn';
      typeShort = 'CV';
    } else {
      docType = 'thong_tu';
      docTypeLabel = 'Thông tư';
      typeShort = 'TT';
    }
  } else if (/^Quyết định/im.test(first2500Chars) || originalFileName.toLowerCase().startsWith('qd') || originalFileName.toLowerCase().startsWith('qđ')) {
    docType = 'quyet_dinh';
    docTypeLabel = 'Quyết định';
    typeShort = 'QD';
  } else if (/Văn bản hợp nhất/i.test(first2500Chars) || /VBHN/i.test(originalFileName)) {
    docType = 'khac';
    docTypeLabel = 'Văn bản hợp nhất';
    typeShort = 'VBHN';
  } else if (/^Chỉ thị/im.test(first2500Chars) || originalFileName.toLowerCase().startsWith('ct')) {
    docType = 'khac';
    docTypeLabel = 'Chỉ thị';
    typeShort = 'CT';
  } else if (/^Thông báo/im.test(first2500Chars) || originalFileName.toLowerCase().startsWith('tb')) {
    docType = 'khac';
    docTypeLabel = 'Thông báo';
    typeShort = 'TB';
  } else if (/^Hướng dẫn/im.test(first2500Chars) || originalFileName.toLowerCase().startsWith('hd')) {
    docType = 'huong_dan';
    docTypeLabel = 'Hướng dẫn';
    typeShort = 'HD';
  }

  // 2. Extract Document Number (Số hiệu)
  let docNumber: string | null = null;
  let hasOfficialSymbol = false;

  const numberMatch = first2500Chars.match(/Số\s*:\s*([0-9]+(?:\/[A-Z0-9\-_đĐ]+)+)/i) ||
                      first2500Chars.match(/Số\s*([0-9]+(?:\/[A-Z0-9\-_đĐ]+)+)/i);

  if (numberMatch) {
    docNumber = numberMatch[1].trim();
    hasOfficialSymbol = docNumber.includes('/');
  } else {
    const fnMatch = originalFileName.match(/(?:CV|TT|ND|NĐ|QD|QĐ|Luật|NQ|VBHN)\s*([0-9]{4}\s*-\s*[0-9]+|[0-9]+(?:\.[0-9]+)?(?:\/[A-Z0-9\-_]+)?)/i);
    if (fnMatch) {
      const rawFnNum = fnMatch[1].replace(/\s*-\s*/g, '/').replace(/\s+/g, '');
      docNumber = rawFnNum;
      warnings.push('Số hiệu được trích xuất từ tên tệp, chưa có ký hiệu chính thức đầy đủ từ nội dung.');
    }
  }

  // 3. Extract Year of Issuance
  let detectedYear: number | null = null;
  const yearFromDateMatch = first2500Chars.match(/ngày\s+\d{1,2}\s+tháng\s+\d{1,2}\s+năm\s+(\d{4})/i);
  if (yearFromDateMatch) {
    detectedYear = parseInt(yearFromDateMatch[1], 10);
  } else if (docNumber) {
    const yMatch = docNumber.match(/\/(20[1-3][0-9])\//) || docNumber.match(/(20[1-3][0-9])/);
    if (yMatch) detectedYear = parseInt(yMatch[1], 10);
  }

  // 4. Extract Issuing Body (Cơ quan ban hành)
  let issuingBody: string | null = null;
  for (const known of KNOWN_ISSUING_BODIES) {
    if (known.pattern.test(first2500Chars)) {
      issuingBody = known.name;
      break;
    }
  }
  if (!issuingBody && docNumber) {
    if (docNumber.includes('BTC')) issuingBody = 'Bộ Tài chính';
    else if (docNumber.includes('TCT')) issuingBody = 'Tổng cục Thuế';
    else if (docNumber.includes('NĐ-CP') || docNumber.includes('NQ-CP')) issuingBody = 'Chính phủ';
    else if (docNumber.includes('QH') || docNumber.includes('UBTVQH')) issuingBody = 'Quốc hội';
    else if (docNumber.includes('BKHĐT')) issuingBody = 'Bộ Kế hoạch và Đầu tư';
    else if (docNumber.includes('BLĐTBXH')) issuingBody = 'Bộ Lao động - Thương binh và Xã hội';
    else if (docNumber.includes('TLĐ')) issuingBody = 'Tổng Liên đoàn Lao động Việt Nam';
    else if (docNumber.includes('NHNN')) issuingBody = 'Ngân hàng Nhà nước Việt Nam';
  }

  // 5. Extract Signer & Title
  let signer: string | null = null;
  let signerTitle: string | null = null;
  const signerMatch = normalizedText.slice(-1500).match(/(KT\.\s*BỘ\s*TRƯỞNG|KT\.\s*TỔNG\s*CỤC\s*TRƯỞNG|KT\.\s*CHỦ\s*TỊCH|BỘ\s*TRƯỞNG|THỨ\s*TRƯỞNG|TỔNG\s*CỤC\s*TRƯỞNG|PHÓ\s*TỔNG\s*CỤC\s*TRƯỞNG|CỤC\s*TRƯỞNG|PHÓ\s*CỤC\s*TRƯỞNG|CHỦ\s*TỊCH|PHÓ\s*CHỦ\s*TỊCH|THỦ\s*TƯỚNG)\s*\n+([A-ZÀ-Ỹ\s]{3,40})/i);
  if (signerMatch) {
    signerTitle = signerMatch[1].trim();
    signer = signerMatch[2].trim();
  }

  // 6. Extract Dates (Issued Date & Effective Date)
  let issuedDate: string | null = null;
  let effectiveDate: string | null = null;

  const dateMatch = first2500Chars.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
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
  } else if (docType === 'cong_van') {
    effectiveDate = null; // Official dispatches do not have statutory effective date
  } else if (issuedDate) {
    effectiveDate = issuedDate;
  }

  // 7. Extract Referenced Documents from Text
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
  const vvMatch = first2500Chars.match(/V\/v\s*:\s*([^\n\r]+)/i);
  const veViecMatch = first2500Chars.match(/Về\s*việc\s*([^\n\r]+)/i);

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
    const titleLineMatch = first2500Chars.match(/^(?:QUY ĐỊNH|HƯỚNG DẪN|QUYẾT ĐỊNH|THÔNG TƯ|NGHỊ ĐỊNH|LUẬT|BỘ LUẬT)\s+([^\n\r]+)/im);
    if (titleLineMatch) {
      summary = titleLineMatch[0].trim();
    } else {
      const { normalizedText: fnClean } = restoreVietnameseLegalText(
        originalFileName.replace(/\.(docx|doc|pdf)$/i, '').replace(/^(?:CV|TT|ND|NĐ|QD|QĐ|NQ|VBHN)\s*[0-9\-_.\s]+/i, '')
      );
      summary = fnClean.replace(/^[-_\s]+/, '').trim();
    }
  }

  // 9. Standard Title Generation
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
    confidence: docNumber && hasOfficialSymbol ? 0.96 : 0.85,
  };
}
