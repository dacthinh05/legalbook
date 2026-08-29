/**
 * LegalBook Content Quality Validator
 * 
 * Inspects legal documents to determine authenticity, completeness,
 * and validity according to Vietnamese legal document standards.
 */

import type { DocumentType } from '@/types';

export type ContentQualityStatus = 'complete' | 'partial' | 'invalid' | 'unknown';

export type ContentStatusType =
  | 'not-fetched'
  | 'fetching'
  | 'downloaded'
  | 'extracting'
  | 'extracted'
  | 'partial'
  | 'failed'
  | 'needs-ocr'
  | 'needs-review'
  | 'verified'
  | 'complete';

export type SourceType =
  | 'official-html'
  | 'official-pdf'
  | 'official-docx'
  | 'uploaded-file'
  | 'secondary-source'
  | 'manual'
  | 'unknown';

export interface ContentQualityMetrics {
  characterCount: number;
  wordCount: number;
  paragraphCount: number;
  articleCount: number;
  clauseCount: number;
  pointCount: number;
  chapterCount: number;
  hasPreamble: boolean;
  hasImplementationClause: boolean;
  hasSignerClosing: boolean;
  invalidCharacterRatio: number;
  hasTables: boolean;
}

export interface ContentQualityResult {
  status: ContentQualityStatus;
  score: number; // 0 to 100
  reasons: string[];
  warnings: string[];
  metrics: ContentQualityMetrics;
  detectedType?: DocumentType;
  isFakeOrPlaceholder: boolean;
  isSummaryRepetition: boolean;
  isScanNeedingOcr: boolean;
  isErrorOrCaptchaPage: boolean;
}

export interface ValidationInput {
  htmlContent?: string | null;
  rawText?: string | null;
  title?: string | null;
  documentNumber?: string | null;
  documentType?: DocumentType | string | null;
  summaryMain?: string | null;
  summaryNewPoints?: string | null;
  hasAttachedFiles?: boolean;
}

export class ContentQualityValidator {
  /**
   * Main validation entry point.
   */
  public static validate(input: ValidationInput): ContentQualityResult {
    const rawHtml = input.htmlContent || '';
    const rawText = input.rawText || this.stripHtml(rawHtml);
    const title = (input.title || '').trim();
    const docType = (input.documentType || 'khac') as DocumentType;
    const summary = (input.summaryMain || '').trim();

    const reasons: string[] = [];
    const warnings: string[] = [];

    // 1. Compute text metrics
    const cleanText = rawText.replace(/\s+/g, ' ').trim();
    const charCount = cleanText.length;
    const words = cleanText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Paragraphs
    const paragraphs = rawHtml
      ? (rawHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
      : rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    // Article/Chapter regexes for Vietnamese legal documents (Unicode-aware)
    const articleMatches = cleanText.match(/(?:^|[^\p{L}\p{N}])Điều\s+\d+[a-z]?(?=[^\p{L}\p{N}]|$)/giu) || [];
    const articleCount = articleMatches.length;

    const chapterMatches = cleanText.match(/(?:^|[^\p{L}\p{N}])Chương\s+([IVXLCDM\d]+|[0-9]+)(?=[^\p{L}\p{N}]|$)/giu) || [];
    const chapterCount = chapterMatches.length;

    const clauseMatches = cleanText.match(/(?:^|\n|\s)(\d+)\.\s+[A-ZÀ-Ỹ]/gu) || cleanText.match(/(?:^|[^\p{L}\p{N}])Khoản\s+\d+/giu) || [];
    const clauseCount = clauseMatches.length;

    const pointMatches = cleanText.match(/(?:^|\n|\s)([a-zđ])\)\s+[A-ZÀ-Ỹa-zà-ỹ]/gu) || cleanText.match(/(?:^|[^\p{L}\p{N}])Điểm\s+[a-zđ]/giu) || [];
    const pointCount = pointMatches.length;

    // Structure checks
    const hasPreamble = /Căn cứ\s+/i.test(cleanText) || /Theo đề nghị của/i.test(cleanText) || /QUYẾT ĐỊNH:|BAN HÀNH:/i.test(cleanText) || /Kính gửi:|Về việc|Phúc đáp|Trả lời công văn/i.test(cleanText);
    const hasImplementationClause = /Hiệu lực thi hành|Trách nhiệm thi hành|Tổ chức thực hiện|Điều khoản thi hành/i.test(cleanText);
    const hasSignerClosing = /Nơi nhận:|TM\.\s*CHÍNH PHỦ|KT\.\s*BỘ TRƯỞNG|BỘ TRƯỞNG|THỦ TƯỚNG|CHỦ TỊCH|CỤC TRƯỞNG|TỔNG CỤC TRƯỞNG|KT\.\s*CỤC TRƯỞNG|GIÁM ĐỐC/i.test(cleanText);
    const hasTables = /<table\b/i.test(rawHtml) || /\|\s*---\s*\|/.test(rawText);

    // Invalid character ratio (detect broken encodings, gibberish)
    const invalidChars = (cleanText.match(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/g) || []).length;
    const invalidCharacterRatio = charCount > 0 ? invalidChars / charCount : 0;

    // 2. Detect Error / Login / Captcha pages
    const isErrorOrCaptchaPage = this.detectErrorOrCaptcha(cleanText, rawHtml);
    if (isErrorOrCaptchaPage) {
      reasons.push('Nội dung là trang thông báo lỗi, yêu cầu đăng nhập hoặc trang xác thực CAPTCHA.');
    }

    // 3. Detect Scan needing OCR
    const isScanNeedingOcr = Boolean(charCount < 120 && input.hasAttachedFiles && !articleCount);
    if (isScanNeedingOcr) {
      warnings.push('Văn bản có tệp đính kèm nhưng dung lượng text trích xuất thấp, có thể là PDF dạng scan cần OCR.');
    }

    // 4. Detect Summary Repetition / Fake Placeholder
    const { isFakeOrPlaceholder, isSummaryRepetition } = this.detectFakeOrPlaceholder({
      cleanText,
      rawHtml,
      title,
      summary,
      articleCount,
      paragraphCount,
      docType,
    });

    if (isFakeOrPlaceholder) {
      reasons.push('Nội dung chỉ là văn bản mẫu/placeholder ngắn hoặc tóm tắt đại khái, không phải toàn văn quy phạm.');
    }
    if (isSummaryRepetition) {
      reasons.push('Nội dung toàn văn trùng lặp với trường tóm tắt.');
    }
    if (invalidCharacterRatio > 0.03) {
      reasons.push(`Tỷ lệ ký tự lỗi/hỏng mã font quá cao (${(invalidCharacterRatio * 100).toFixed(1)}%).`);
    }

    // 5. Calculate Quality Score (0 - 100)
    let score = 0;

    if (charCount === 0) {
      score = 0;
      reasons.push('Văn bản hoàn toàn chưa có nội dung (0 ký tự).');
    } else if (isErrorOrCaptchaPage) {
      score = 0;
    } else if (isFakeOrPlaceholder || isSummaryRepetition) {
      score = Math.min(15, Math.round(charCount / 50));
    } else {
      // Base score on text volume and legal structure
      if (charCount >= 2000) score += 35;
      else if (charCount >= 1000) score += 25;
      else if (charCount >= 400) score += 15;
      else score += 5;

      // Article structure for structured doc types (luat, nghi_dinh, thong_tu, quyet_dinh)
      const requiresArticles = ['luat', 'nghi_dinh', 'thong_tu'].includes(docType);
      if (requiresArticles) {
        if (articleCount >= 5) score += 30;
        else if (articleCount >= 1) score += 20;
        else {
          warnings.push(`Loại văn bản "${docType}" thông thường phải có cấu trúc các Điều, nhưng không tìm thấy "Điều 1".`);
        }
      } else {
        // Cong van / Huong dan / Chuan muc may not have "Điều"
        if (articleCount >= 1) score += 25;
        else if (charCount > 500) score += 25;
      }

      if (hasPreamble) score += 15;
      if (hasImplementationClause || hasSignerClosing) score += 15;
      if (chapterCount > 0) score += 5;

      // Penalize invalid characters
      score -= Math.round(invalidCharacterRatio * 100);
      score = Math.max(0, Math.min(100, score));
    }

    // 6. Determine final status
    let status: ContentQualityStatus = 'unknown';

    if (charCount === 0 || isErrorOrCaptchaPage || isFakeOrPlaceholder || isSummaryRepetition) {
      status = 'invalid';
    } else if (['luat', 'nghi_dinh', 'thong_tu'].includes(docType) && articleCount === 0 && charCount < 1000) {
      status = 'partial';
      warnings.push('Văn bản thiếu cấu trúc Điều/Khoản quy chuẩn.');
    } else if (score >= 50 && (charCount >= 250 || articleCount >= 1)) {
      status = 'complete';
    } else if (score >= 25 && charCount >= 150) {
      status = 'partial';
    } else {
      status = 'invalid';
    }

    const metrics: ContentQualityMetrics = {
      characterCount: charCount,
      wordCount,
      paragraphCount,
      articleCount,
      clauseCount,
      pointCount,
      chapterCount,
      hasPreamble,
      hasImplementationClause,
      hasSignerClosing,
      invalidCharacterRatio,
      hasTables,
    };

    return {
      status,
      score,
      reasons,
      warnings,
      metrics,
      detectedType: docType,
      isFakeOrPlaceholder,
      isSummaryRepetition,
      isScanNeedingOcr,
      isErrorOrCaptchaPage,
    };
  }

  /**
   * Detects fake, placeholder, or generated summary text.
   */
  private static detectFakeOrPlaceholder(params: {
    cleanText: string;
    rawHtml: string;
    title: string;
    summary: string;
    articleCount: number;
    paragraphCount: number;
    docType: DocumentType;
  }): { isFakeOrPlaceholder: boolean; isSummaryRepetition: boolean } {
    const { cleanText, rawHtml, title, summary, articleCount, paragraphCount, docType } = params;

    const lowerClean = cleanText.toLowerCase();
    const lowerTitle = title.toLowerCase();
    const lowerSummary = summary.toLowerCase();

    // Check if cleanText is identical or almost identical to summary
    let isSummaryRepetition = false;
    if (summary && summary.length > 20) {
      const summaryOverlap = lowerClean.replace(/\s+/g, '');
      const summaryClean = lowerSummary.replace(/\s+/g, '');
      if (summaryOverlap === summaryClean || summaryOverlap.includes(summaryClean) && cleanText.length < summary.length * 1.5) {
        isSummaryRepetition = true;
      }
    }

    // Check for short placeholder templates (e.g. <h2>TITLE</h2><p class="meta">...</p><p>Hướng dẫn chi tiết...</p>)
    let isFakeOrPlaceholder = false;

    // Pattern 1: Title + 1 short sentence
    const isVeryShort = cleanText.length < 350;
    const isSingleHeadingWithOneSentence =
      rawHtml.includes('<h2>') &&
      paragraphCount <= 3 &&
      articleCount === 0 &&
      cleanText.length < 500;

    // Pattern 2: Explicit Summary Headings disguised as full-text content
    const containsSummaryTemplateHeadings =
      /tóm tắt nội dung chính/i.test(cleanText) ||
      /điểm mới nổi bật/i.test(cleanText) ||
      /tác động kế toán/i.test(cleanText) ||
      /tác động kiểm toán/i.test(cleanText) ||
      /\d+\.\s*(tóm tắt|điểm mới|tác động|hành động cần thực hiện)/i.test(cleanText);

    // Generic filler phrases
    const hasGenericFiller =
      /^(hướng dẫn chi tiết|quy định về|văn bản hướng dẫn|thông tư hướng dẫn|nghị định quy định|văn bản ban hành|cập nhật quy định)/i.test(
        cleanText.replace(title, '').trim()
      ) ||
      /đang cập nhật toàn văn|nội dung tóm tắt|xem chi tiết tại/i.test(cleanText);

    if (containsSummaryTemplateHeadings && articleCount === 0 && cleanText.length < 2000) {
      isFakeOrPlaceholder = true;
    } else if (['luat', 'nghi_dinh', 'thong_tu'].includes(docType)) {
      if (articleCount === 0 && (isVeryShort || isSingleHeadingWithOneSentence || hasGenericFiller)) {
        isFakeOrPlaceholder = true;
      }
    } else {
      if (isVeryShort && (hasGenericFiller || containsSummaryTemplateHeadings) && paragraphCount <= 3) {
        isFakeOrPlaceholder = true;
      }
    }

    // If text is essentially just repeating title words with nothing else
    const textWithoutTitle = cleanText.toLowerCase().replace(lowerTitle, '').replace(/[\s\W]+/g, '');
    if (textWithoutTitle.length < 50 && cleanText.length < 400) {
      isFakeOrPlaceholder = true;
    }

    return {
      isFakeOrPlaceholder: isFakeOrPlaceholder || isSummaryRepetition,
      isSummaryRepetition,
    };
  }

  /**
   * Detects HTTP 404/500, Captcha, or Login page responses captured as content.
   */
  private static detectErrorOrCaptcha(cleanText: string, rawHtml: string): boolean {
    const errorPatterns = [
      /404\s+not\s+found/i,
      /trang\s+không\s+tồn\s+tại/i,
      /không\s+tìm\s+thấy\s+trang/i,
      /truy\s+cập\s+bị\s+từ\s+chối/i,
      /access\s+denied/i,
      /403\s+forbidden/i,
      /502\s+bad\s+gateway/i,
      /500\s+internal\s+server\s+error/i,
      /hãy\s+đăng\s+nhập\s+để\s+xem/i,
      /vui\s+lòng\s+đăng\s+nhập/i,
      /please\s+sign\s+in/i,
      /g-recaptcha/i,
      /cf-turnstile/i,
      /cloudflare\s+ray\s+id/i,
      /xác\s+nhận\s+bạn\s+không\s+phải\s+là\s+người\s+máy/i,
      /verify\s+you\s+are\s+human/i,
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(cleanText) || pattern.test(rawHtml)) {
        // Double check length: error pages are usually under 1200 chars
        if (cleanText.length < 1500) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Helper to strip HTML tags safely.
   */
  private static stripHtml(html: string): string {
    return html
      .replace(/<br\s*[\/]?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  /**
   * Evaluates whether AI summary is legally safe and permitted to be generated/displayed.
   * Strictly prevents generating or presenting AI summary when full text is missing or partial.
   */
  public static canGenerateAiSummary(doc: {
    html_content?: string | null;
    content_status?: string | null;
    title?: string;
    document_type?: DocumentType;
    files?: unknown[];
  }): { allowed: boolean; reason?: string } {
    if (!doc.html_content || doc.html_content.trim().length === 0) {
      return { allowed: false, reason: 'Chưa có toàn văn văn bản số hóa.' };
    }
    if (doc.content_status === 'needs-ocr') {
      return { allowed: false, reason: 'Tài liệu dạng scan cần OCR, chưa trích xuất đủ văn bản.' };
    }
    if (doc.content_status === 'not-fetched' || doc.content_status === 'failed') {
      return { allowed: false, reason: 'Nội dung chưa được tải thành công từ nguồn chính thức.' };
    }
    const quality = this.validate({
      htmlContent: doc.html_content,
      title: doc.title,
      documentType: doc.document_type,
      hasAttachedFiles: Boolean(doc.files && doc.files.length > 0),
    });
    if (quality.status !== 'complete') {
      return { allowed: false, reason: 'Chất lượng toàn văn chưa đạt chuẩn xác minh đầy đủ.' };
    }
    return { allowed: true };
  }
}
