import mammoth from 'mammoth';
import { ExtractionMethod } from './types';
import { shouldPerformOcr, performOcrOnScannedPage } from './ocr-engine';
import { normalizeVietnameseEncoding } from './encoding-converter';
import { cleanDocumentLayout } from './text-cleaner';

export interface ExtractedDocumentData {
  rawText: string;
  cleanText: string;
  htmlContent: string;
  extractionMethod: ExtractionMethod;
  extractionConfidence: number;
  warnings: string[];
}

/**
 * Extracts plain text from binary DOC (Word 97-2003 CFBF format) safely.
 */
export function extractTextFromBinaryDoc(buffer: Uint8Array): string {
  // Binary extraction from WordDocument stream: scan text runs (ASCII + UTF-16LE)
  let extracted = '';
  let inTextRun = false;
  let currentRun = '';

  for (let i = 0; i < buffer.length - 1; i++) {
    const b1 = buffer[i];
    const b2 = buffer[i + 1];

    // Check for UTF-16LE printable chars
    if (b2 === 0x00 && ((b1 >= 0x20 && b1 <= 0x7e) || b1 === 0x0a || b1 === 0x0d || (b1 >= 0xc0 && b1 <= 0xff))) {
      currentRun += String.fromCharCode(b1);
      inTextRun = true;
      i++; // skip high byte
    } else if (b1 >= 0x20 && b1 <= 0x7e) {
      currentRun += String.fromCharCode(b1);
      inTextRun = true;
    } else if (b1 === 0x0a || b1 === 0x0d) {
      if (currentRun.length > 0) {
        currentRun += '\n';
      }
    } else {
      if (inTextRun) {
        if (currentRun.trim().length > 3) {
          extracted += currentRun.trim() + '\n';
        }
        currentRun = '';
        inTextRun = false;
      }
    }
  }

  if (currentRun.trim().length > 3) {
    extracted += currentRun.trim() + '\n';
  }

  return extracted.trim();
}

/**
 * Extracts text and HTML from DOCX buffer.
 */
export async function extractFromDocx(buffer: Uint8Array): Promise<ExtractedDocumentData> {
  const warnings: string[] = [];
  try {
    const arrayBuffer = buffer.slice().buffer as ArrayBuffer;
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const rawHtml = result.value || '';
    
    // Also extract raw text
    const textResult = await mammoth.extractRawText({ arrayBuffer });
    const rawText = textResult.value || '';

    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        if (msg.type === 'warning') {
          warnings.push(msg.message);
        }
      }
    }

    // Encoding normalization
    const { normalizedText: encNormText } = normalizeVietnameseEncoding(rawText);
    const { cleanedText } = cleanDocumentLayout(encNormText);

    return {
      rawText,
      cleanText: cleanedText,
      htmlContent: `<div class="document-full-body">${rawHtml}</div>`,
      extractionMethod: 'docx',
      extractionConfidence: 0.98,
      warnings,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    warnings.push(`Lỗi phân tích DOCX bằng Mammoth: ${errorMsg}. Đang sử dụng phương thức dự phòng.`);
    
    // Fallback binary text extractor
    const fallbackText = extractTextFromBinaryDoc(buffer);
    const { normalizedText } = normalizeVietnameseEncoding(fallbackText);
    const { cleanedText } = cleanDocumentLayout(normalizedText);

    return {
      rawText: fallbackText,
      cleanText: cleanedText,
      htmlContent: `<div class="document-full-body"><pre>${cleanedText}</pre></div>`,
      extractionMethod: 'docx',
      extractionConfidence: 0.75,
      warnings,
    };
  }
}

/**
 * Extracts text from binary DOC.
 */
export async function extractFromDoc(buffer: Uint8Array): Promise<ExtractedDocumentData> {
  const warnings: string[] = [];
  try {
    // Try Mammoth first in case it's a misnamed docx or compatible XML
    const arrayBuffer = buffer.slice().buffer as ArrayBuffer;
    const result = await mammoth.convertToHtml({ arrayBuffer });
    if (result.value && result.value.length > 100) {
      const textResult = await mammoth.extractRawText({ arrayBuffer });
      const { normalizedText } = normalizeVietnameseEncoding(textResult.value || '');
      const { cleanedText } = cleanDocumentLayout(normalizedText);
      return {
        rawText: textResult.value || '',
        cleanText: cleanedText,
        htmlContent: `<div class="document-full-body">${result.value}</div>`,
        extractionMethod: 'doc-conversion',
        extractionConfidence: 0.92,
        warnings,
      };
    }
  } catch {
    // Expected for binary DOC format
  }

  // Use safe binary parser for legacy Word 97-2003 .doc format
  const rawText = extractTextFromBinaryDoc(buffer);
  const { normalizedText } = normalizeVietnameseEncoding(rawText);
  const { cleanedText } = cleanDocumentLayout(normalizedText);

  if (cleanedText.length < 50) {
    warnings.push('Tệp .doc nhị phân có lượng nội dung trích xuất thấp. Khuyến nghị lưu sang định dạng .docx để có chất lượng cao nhất.');
  }

  return {
    rawText,
    cleanText: cleanedText,
    htmlContent: `<div class="document-full-body"><pre class="whitespace-pre-wrap font-sans text-sm">${cleanedText || 'Không trích xuất được nội dung định dạng .doc cũ.'}</pre></div>`,
    extractionMethod: 'doc-conversion',
    extractionConfidence: cleanedText.length > 100 ? 0.85 : 0.60,
    warnings,
  };
}

/**
 * Extracts text from PDF using PDF.js or fallback parser.
 */
export async function extractFromPdf(buffer: Uint8Array): Promise<ExtractedDocumentData> {
  const warnings: string[] = [];
  let fullText = '';
  let isScanned = false;

  try {
    // Dynamic import pdfjs-dist for browser/node compatibility
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      useSystemFonts: true,
      disableFontFace: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStr = textContent.items
        .map((item: unknown) => {
          if (item && typeof item === 'object' && 'str' in item) {
            return typeof (item as { str: unknown }).str === 'string' ? (item as { str: string }).str : '';
          }
          return '';
        })
        .join(' ');

      const ocrCheck = shouldPerformOcr(pageStr, pageNum);
      if (ocrCheck.needsOcr) {
        isScanned = true;
        warnings.push(ocrCheck.reason || `Trang ${pageNum} cần OCR.`);
        const ocrRes = await performOcrOnScannedPage(buffer, pageNum, pageStr);
        pageTexts.push(ocrRes.text);
      } else {
        pageTexts.push(pageStr);
      }
    }

    fullText = pageTexts.join('\n\n');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    warnings.push(`Không thể trích xuất PDF qua PDF.js: ${errorMsg}. Đang dùng bộ phân tích nhị phân dự phòng.`);
    fullText = extractTextFromBinaryDoc(buffer);
  }

  const { normalizedText } = normalizeVietnameseEncoding(fullText);
  const { cleanedText } = cleanDocumentLayout(normalizedText);

  // Convert cleaned text into structured readable HTML
  const paragraphs = cleanedText.split('\n\n').filter(Boolean);
  const htmlContent = `<div class="document-full-body space-y-3">${paragraphs
    .map((p) => {
      const trimmed = p.trim();
      if (/^(Điều\s+\d+|Chương\s+[IVXLCDM\d]+)/i.test(trimmed)) {
        return `<h3 class="font-bold text-base text-gray-900 mt-4">${trimmed}</h3>`;
      }
      return `<p class="text-sm text-gray-800 leading-relaxed">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('')}</div>`;

  return {
    rawText: fullText,
    cleanText: cleanedText,
    htmlContent,
    extractionMethod: isScanned ? 'ocr' : 'pdf-text',
    extractionConfidence: isScanned ? 0.85 : 0.95,
    warnings,
  };
}

/**
 * Universal text extraction router based on file extension / format.
 */
export async function extractDocumentContent(
  buffer: Uint8Array,
  fileExtension: 'doc' | 'docx' | 'pdf'
): Promise<ExtractedDocumentData> {
  switch (fileExtension) {
    case 'docx':
      return extractFromDocx(buffer);
    case 'doc':
      return extractFromDoc(buffer);
    case 'pdf':
      return extractFromPdf(buffer);
    default:
      throw new Error(`Định dạng không được hỗ trợ: ${fileExtension}`);
  }
}
