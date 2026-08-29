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
 * Extracts text from PDF using coordinate-aware layout analysis and fallback OCR.
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

      const { pageText, rawText: pageRaw } = parsePdfPageLayout(textContent.items, pageNum === 1);

      const ocrCheck = shouldPerformOcr(pageText, pageNum);
      if (ocrCheck.needsOcr) {
        isScanned = true;
        warnings.push(ocrCheck.reason || `Trang ${pageNum} cần OCR.`);
        const ocrRes = await performOcrOnScannedPage(buffer, pageNum, pageText);
        pageTexts.push(ocrRes.text);
      } else {
        pageTexts.push(pageText || pageRaw);
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

  // Convert cleaned text into structured semantic HTML using formatLegalHtmlContent
  const { formatLegalHtmlContent } = await import('@/lib/legal-formatter');

  // Wrap cleaned text blocks into initial HTML paragraphs
  const rawBlocks = cleanedText.split(/\n\s*\n/).filter(Boolean);
  const initialHtml = `<div class="document-full-body">\n${rawBlocks
    .map((b) => `<p>${b.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')}\n</div>`;

  const htmlContent = formatLegalHtmlContent(initialHtml);

  return {
    rawText: fullText,
    cleanText: cleanedText,
    htmlContent,
    extractionMethod: isScanned ? 'ocr' : 'pdf-text',
    extractionConfidence: isScanned ? 0.85 : 0.96,
    warnings,
  };
}

interface PdfItemCoord {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Coordinate-aware text reconstruction from PDF.js items.
 * Preserves 2-column administrative letterheads, place/date, and legal hierarchy.
 */
function parsePdfPageLayout(items: unknown[], isFirstPage: boolean): { pageText: string; rawText: string } {
  const coords: PdfItemCoord[] = [];

  for (const item of items) {
    if (item && typeof item === 'object' && 'str' in item && 'transform' in item) {
      const raw = item as { str: unknown; transform: unknown; width?: unknown; height?: unknown };
      const str = typeof raw.str === 'string' ? raw.str : '';
      const transform = Array.isArray(raw.transform) ? raw.transform : [];
      if (str.trim().length > 0 && transform.length >= 6) {
        coords.push({
          str,
          x: typeof transform[4] === 'number' ? transform[4] : 0,
          y: typeof transform[5] === 'number' ? transform[5] : 0,
          width: typeof raw.width === 'number' ? raw.width : 0,
          height: typeof raw.height === 'number' ? raw.height : 0,
        });
      }
    }
  }

  if (coords.length === 0) {
    return { pageText: '', rawText: '' };
  }

  // Group items into lines by Y-coordinate (tolerance: 3.5px)
  const lines: { y: number; items: PdfItemCoord[] }[] = [];
  for (const item of coords) {
    let matchedLine = lines.find((l) => Math.abs(l.y - item.y) <= 3.5);
    if (!matchedLine) {
      matchedLine = { y: item.y, items: [] };
      lines.push(matchedLine);
    }
    matchedLine.items.push(item);
  }

  // Sort lines from top to bottom (Y descending)
  lines.sort((a, b) => b.y - a.y);

  // Sort items within each line from left to right (X ascending)
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  const resultLines: string[] = [];

  // On page 1, detect if the top region contains 2-column administrative letterhead
  let bodyStartIndex = 0;
  if (isFirstPage && lines.length > 0) {
    const topLines = lines.slice(0, Math.min(12, lines.length));
    const hasMotto = topLines.some((l) =>
      l.items.some((it) => /CỘNG\s+H[ÒO]A/i.test(it.str) || /Độc\s+lập/i.test(it.str))
    );
    const hasAgency = topLines.some((l) =>
      l.items.some((it) => /BỘ|CHÍNH\s+PHỦ|ỦY\s+BAN|TỔNG\s+CỤC|CỤC|SỞ|QUỐC\s+HỘI|Số:/i.test(it.str))
    );

    if (hasMotto || hasAgency) {
      // Determine header line count (until document type heading, e.g. THÔNG TƯ / NGHỊ ĐỊNH / QUYẾT ĐỊNH / LUẬT)
      let headerEndIndex = 0;
      for (let i = 0; i < topLines.length; i++) {
        const lineStr = topLines[i].items.map((it) => it.str).join(' ');
        if (/^(THÔNG TƯ|NGHỊ ĐỊNH|QUYẾT ĐỊNH|LUẬT|BỘ LUẬT|CÔNG VĂN|NGHỊ QUYẾT|CHỈ THỊ)\b/i.test(lineStr.trim())) {
          headerEndIndex = i;
          break;
        }
        headerEndIndex = i + 1;
      }

      // Split header items into left (X < 240) and right (X >= 240) columns
      const leftColLines: string[] = [];
      const rightColLines: string[] = [];

      for (let i = 0; i < headerEndIndex; i++) {
        const leftItems = lines[i].items.filter((it) => it.x < 240);
        const rightItems = lines[i].items.filter((it) => it.x >= 240);

        if (leftItems.length > 0) {
          const leftStr = mergeLineItems(leftItems);
          if (leftStr && !/^[_-\s]+$/.test(leftStr)) {
            leftColLines.push(leftStr);
          }
        }
        if (rightItems.length > 0) {
          const rightStr = mergeLineItems(rightItems);
          if (rightStr && !/^[_-\s]+$/.test(rightStr)) {
            rightColLines.push(rightStr);
          }
        }
      }

      if (leftColLines.length > 0) {
        resultLines.push(leftColLines.join('\n'));
      }
      if (rightColLines.length > 0) {
        resultLines.push(rightColLines.join('\n'));
      }

      bodyStartIndex = headerEndIndex;
    }
  }

  // Process remaining body lines
  for (let i = bodyStartIndex; i < lines.length; i++) {
    const lineStr = mergeLineItems(lines[i].items);
    if (lineStr) {
      resultLines.push(lineStr);
    }
  }

  const pageText = resultLines.join('\n\n');
  const rawText = coords.map((it) => it.str).join(' ');
  return { pageText, rawText };
}

function mergeLineItems(items: PdfItemCoord[]): string {
  if (items.length === 0) return '';
  let line = '';
  for (let i = 0; i < items.length; i++) {
    const curr = items[i];
    if (i === 0) {
      line += curr.str;
    } else {
      const prev = items[i - 1];
      const gap = curr.x - (prev.x + prev.width);
      if (gap > 2 && !line.endsWith(' ') && !curr.str.startsWith(' ')) {
        line += ' ' + curr.str;
      } else {
        line += curr.str;
      }
    }
  }
  return line.trim();
}

/**
 * Calls remote Python document processing worker if PROCESSOR_WORKER_URL is configured.
 */
export async function extractViaRemoteWorker(
  buffer: Uint8Array,
  fileExtension: 'doc' | 'docx' | 'pdf'
): Promise<ExtractedDocumentData | null> {
  const workerUrl = process.env.PROCESSOR_WORKER_URL;
  if (!workerUrl || !workerUrl.startsWith('http')) return null;

  try {
    const endpoint = fileExtension === 'docx' ? '/api/v1/extract-docx' : '/api/v1/extract-pdf';
    const formData = new FormData();
    const blob = new Blob([buffer as unknown as BlobPart], {
      type: fileExtension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('file', blob, `document.${fileExtension}`);

    const res = await fetch(`${workerUrl.replace(/\/+$/, '')}${endpoint}`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(20000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        success?: boolean;
        html_content?: string;
        plain_text?: string;
        is_scanned?: boolean;
        confidence?: number;
        warnings?: string[];
      };
      if (data.success && data.html_content) {
        return {
          rawText: data.plain_text || '',
          cleanText: data.plain_text || '',
          htmlContent: data.html_content,
          extractionMethod: data.is_scanned ? 'ocr' : 'pdf-text',
          extractionConfidence: data.confidence || 0.95,
          warnings: data.warnings || [],
        };
      }
    }
  } catch {
    // Graceful fallback to local extraction on network/worker error
  }

  return null;
}

/**
 * Universal text extraction router based on file extension / format.
 */
export async function extractDocumentContent(
  buffer: Uint8Array,
  fileExtension: 'doc' | 'docx' | 'pdf'
): Promise<ExtractedDocumentData> {
  // 1. Try remote high-performance Python worker if configured
  const remoteResult = await extractViaRemoteWorker(buffer, fileExtension);
  if (remoteResult) {
    return remoteResult;
  }

  // 2. Fallback to local TypeScript extractor
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
