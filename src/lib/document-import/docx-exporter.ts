/**
 * LegalBook Standardized DOCX Converter & Exporter
 * 
 * Generates official-grade Microsoft Word (.docx) documents conforming to
 * Vietnamese Legal Drafting Standard (Nghị định 30/2020/NĐ-CP về công tác văn thư):
 * - Header 2-column layout (Cơ quan ban hành / Số hiệu + Quốc hiệu / Tiêu ngữ / Ngày tháng)
 * - Standard typography: Times New Roman 13-14pt, 1.25-1.5 line spacing, 2cm margins
 * - Structured Điều, Khoản, Điểm formatting with legal hierarchy indentation
 * - Closing block: Nơi nhận (Left) + Chức vụ / Người ký (Right)
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
} from 'docx';
import { formatDate } from '@/lib/utils';
import type { LegalDocument } from '@/types';
import type { ImportedDocument } from './types';

export interface DocxGenerationInput {
  title?: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  issuingBody?: string | null;
  signer?: string | null;
  issuedDate?: string | null;
  effectiveDate?: string | null;
  plainText?: string | null;
  htmlContent?: string | null;
  summaryMain?: string | null;
}

const FONT_FAMILY = 'Times New Roman';

/**
 * Strips HTML tags into clean structured paragraphs.
 */
function extractCleanParagraphs(htmlOrText: string | null | undefined): string[] {
  if (!htmlOrText) return [];
  const text = htmlOrText
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");

  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/**
 * Builds an official Vietnamese Legal Word (.docx) Document.
 */
export function createLegalDocxDocument(input: DocxGenerationInput): Document {
  const issuingBody = (input.issuingBody || 'CƠ QUAN BAN HÀNH').toUpperCase();
  const docNumber = input.documentNumber || 'Số: .../...';
  const issuedDate = input.issuedDate ? formatDate(input.issuedDate) : '...';
  const title = (input.title || 'VĂN BẢN PHÁP LUẬT').toUpperCase();
  const signer = input.signer || 'NGƯỜI KÝ';

  // 1. Header Table (Cơ quan / Số hiệu + Quốc hiệu / Tiêu ngữ)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Left cell: Cơ quan ban hành & Số hiệu
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: issuingBody,
                    font: FONT_FAMILY,
                    bold: true,
                    size: 24, // 12pt
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 120 },
                children: [
                  new TextRun({
                    text: `Số: ${docNumber}`,
                    font: FONT_FAMILY,
                    size: 24, // 12pt
                  }),
                ],
              }),
            ],
          }),

          // Right cell: Quốc hiệu & Tiêu ngữ
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    font: FONT_FAMILY,
                    bold: true,
                    size: 24, // 12pt
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: 120 },
                children: [
                  new TextRun({
                    text: 'Độc lập - Tự do - Hạnh phúc',
                    font: FONT_FAMILY,
                    bold: true,
                    underline: {},
                    size: 26, // 13pt
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `Ngày ban hành: ${issuedDate}`,
                    font: FONT_FAMILY,
                    italics: true,
                    size: 22, // 11pt
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // 2. Document Title
  const titleParagraph = new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 360, after: 240 },
    children: [
      new TextRun({
        text: title,
        font: FONT_FAMILY,
        bold: true,
        size: 28, // 14pt
      }),
    ],
  });

  // 3. Body Content Paragraphs
  const rawContent = input.htmlContent || input.plainText || input.summaryMain || '';
  const paragraphs = extractCleanParagraphs(rawContent);

  const contentParagraphs: Paragraph[] = [];

  for (const line of paragraphs) {
    const isHeading =
      /^(Chương\s+[IVXLCDM\d]+|Điều\s+\d+|Phần\s+[IVXLCDM\d]+|Mục\s+\d+|Phụ lục)/i.test(line);

    if (isHeading) {
      contentParagraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: line,
              font: FONT_FAMILY,
              bold: true,
              size: 26, // 13pt
            }),
          ],
        })
      );
    } else {
      contentParagraphs.push(
        new Paragraph({
          spacing: { before: 60, after: 60, line: 300 }, // 1.25 line spacing
          indent: { firstLine: 400 }, // 1cm indent
          alignment: AlignmentType.JUSTIFIED,
          children: [
            new TextRun({
              text: line,
              font: FONT_FAMILY,
              size: 26, // 13pt
            }),
          ],
        })
      );
    }
  }

  // 4. Closing Block (Nơi nhận + Người ký)
  const closingTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        children: [
          // Nơi nhận
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 240 },
                children: [
                  new TextRun({
                    text: 'Nơi nhận:',
                    font: FONT_FAMILY,
                    bold: true,
                    italics: true,
                    size: 22, // 11pt
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: '- Như trên;\n- Ban Giám đốc;\n- Lưu: VT, Hồ sơ.',
                    font: FONT_FAMILY,
                    size: 20, // 10pt
                  }),
                ],
              }),
            ],
          }),

          // Người ký
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240 },
                children: [
                  new TextRun({
                    text: 'THỦ TRƯỞNG CƠ QUAN',
                    font: FONT_FAMILY,
                    bold: true,
                    size: 24, // 12pt
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 600 },
                children: [
                  new TextRun({
                    text: signer,
                    font: FONT_FAMILY,
                    bold: true,
                    size: 26, // 13pt
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 2.5cm
              bottom: 1440, // 2.5cm
              left: 1700, // 3cm
              right: 1134, // 2cm
            },
          },
        },
        children: [headerTable, titleParagraph, ...contentParagraphs, closingTable],
      },
    ],
  });
}

/**
 * Converts input into a downloadable DOCX Blob in browser runtime.
 */
export async function generateLegalDocxBlob(
  input: DocxGenerationInput | LegalDocument | ImportedDocument
): Promise<Blob> {
  let normalized: DocxGenerationInput;

  if ('detectedDocumentType' in input || 'originalFileName' in input) {
    const imp = input as ImportedDocument;
    normalized = {
      title: imp.standardTitle || imp.detectedTitle || imp.originalFileName,
      documentNumber: imp.detectedDocumentNumber,
      documentType: imp.detectedDocumentType,
      issuingBody: imp.detectedIssuingBody,
      signer: imp.detectedSigner,
      issuedDate: imp.detectedIssuedDate,
      effectiveDate: imp.detectedEffectiveDate,
      plainText: imp.normalizedText || imp.cleanText || imp.rawText,
      htmlContent: imp.htmlContent,
      summaryMain: imp.detectedSummary,
    };
  } else if ('title' in input && typeof input.title === 'string' && 'html_content' in input) {
    const doc = input as LegalDocument;
    normalized = {
      title: doc.title,
      documentNumber: doc.document_number || undefined,
      documentType: doc.document_type,
      issuingBody: doc.issuing_body || undefined,
      signer: doc.signer || undefined,
      issuedDate: doc.issued_date,
      effectiveDate: doc.effective_date,
      plainText: doc.html_content ? undefined : undefined,
      htmlContent: doc.html_content,
      summaryMain: doc.summary_main || undefined,
    };
  } else {
    normalized = input as DocxGenerationInput;
  }

  const docx = createLegalDocxDocument(normalized);
  return await Packer.toBlob(docx);
}

/**
 * Triggers direct browser file download of the converted Word (.docx) file.
 */
export async function downloadLegalDocxFile(
  input: DocxGenerationInput | LegalDocument | ImportedDocument,
  customFileName?: string
): Promise<string> {
  const blob = await generateLegalDocxBlob(input);
  let docNum = 'VanBan';
  if ('document_number' in input && input.document_number) {
    docNum = input.document_number;
  } else if ('detectedDocumentNumber' in input && (input as ImportedDocument).detectedDocumentNumber) {
    docNum = (input as ImportedDocument).detectedDocumentNumber!;
  } else if ('documentNumber' in input && (input as DocxGenerationInput).documentNumber) {
    docNum = (input as DocxGenerationInput).documentNumber!;
  }
  const cleanNumber = docNum.replace(/[\/\\:\*\?"<>\|]/g, '-').replace(/\s+/g, '');
  const fileName = customFileName || `${cleanNumber}.docx`;

  if (typeof window !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return fileName;
}
