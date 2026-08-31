/**
 * diff-exporter.ts
 * 
 * Multi-format export engine for Legal Comparison & Cross-Reference Matrix.
 * Generates Excel (.csv/.xlsx format) and Word (.docx Decree 30/2020 format).
 */
import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, Packer } from 'docx';
import type { LegalDocumentDiffResult, LegalCrossReferenceResult } from '@/lib/diff-engine';
import type { LegalDocument } from '@/types';
import { formatDate } from '@/lib/utils';

/**
 * Exports Amendment Diff Matrix to Excel CSV format with UTF-8 BOM.
 */
export function exportDiffToCsv(diff: LegalDocumentDiffResult, filename?: string): Blob {
  const lines: string[] = [];
  // UTF-8 BOM for Excel Vietnamese display
  lines.push('\uFEFF');
  lines.push(`"BÁO CÁO ĐỐI CHIẾU THAY ĐỔI VĂN BẢN QUY PHẠM PHÁP LUẬT"`);
  lines.push(`"Văn bản gốc:","${diff.titleA.replace(/"/g, '""')}"`);
  lines.push(`"Văn bản sửa đổi:","${diff.titleB.replace(/"/g, '""')}"`);
  lines.push(`"Tổng số điều khoản:","${diff.totalArticlesCount}"`);
  lines.push(`"Số điều sửa đổi:","${diff.modifiedArticlesCount}"`);
  lines.push(`"Số điều bổ sung mới:","${diff.addedArticlesCount}"`);
  lines.push(`"Số điều bãi bỏ:","${diff.deletedArticlesCount}"`);
  lines.push(``);
  lines.push(`"STT","Mã Điều","Tiêu đề","Trạng thái thay đổi","Số từ thêm","Số từ bớt","Nội dung đánh dấu thay đổi"`);

  diff.articles.forEach((art, idx) => {
    const statusLabel =
      art.status === 'modified'
        ? 'Sửa đổi'
        : art.status === 'added'
        ? 'Bổ sung mới'
        : art.status === 'deleted'
        ? 'Bãi bỏ'
        : 'Giữ nguyên';

    const cleanSnippet = art.tokens.map((t) => (t.op === 'added' ? `[+ ${t.text}]` : t.op === 'deleted' ? `[- ${t.text}]` : t.text)).join('');

    lines.push(
      `"${idx + 1}","${(art.articleLabel || art.articleId).replace(/"/g, '""')}","${(art.articleTitleB || art.articleTitleA).replace(/"/g, '""')}","${statusLabel}","${art.additionsCount}","${art.deletionsCount}","${cleanSnippet.replace(/"/g, '""')}"`
    );
  });

  const content = lines.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  
  if (typeof window !== 'undefined' && filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
}

/**
 * Exports Guidance Cross-Reference Matrix to Excel CSV format with UTF-8 BOM.
 */
export function exportGuidanceMatrixToCsv(matrix: LegalCrossReferenceResult, filename?: string): Blob {
  const lines: string[] = [];
  lines.push('\uFEFF');
  lines.push(`"MA TRẬN HƯỚNG DẪN & CHI TIẾT HÓA ĐIỀU KHOẢN PHÁP LUẬT"`);
  lines.push(`"Văn bản Luật (Gốc):","${matrix.docLawNumber} - ${matrix.docLawTitle.replace(/"/g, '""')}"`);
  lines.push(`"Văn bản Hướng dẫn:","${matrix.docGuidingNumber} - ${matrix.docGuidingTitle.replace(/"/g, '""')}"`);
  lines.push(`"Tổng số cặp dẫn chiếu:","${matrix.totalMappedPairs}"`);
  lines.push(``);
  lines.push(`"STT","Điều khoản Luật","Tiêu đề Điều Luật","Nội dung Luật","Điều khoản Hướng dẫn","Tiêu đề Hướng dẫn","Nội dung chi tiết hóa","Loại dẫn chiếu"`);

  matrix.pairs.forEach((pair, idx) => {
    const typeLabel =
      pair.citationType === 'citation'
        ? 'Dẫn chiếu đích danh'
        : pair.citationType === 'title_match'
        ? 'Trùng khớp chủ đề'
        : 'Quy định khung';

    lines.push(
      `"${idx + 1}","${pair.lawArticleNumber.replace(/"/g, '""')}","${pair.lawArticleTitle.replace(/"/g, '""')}","${pair.lawSnippet.replace(/"/g, '""')}","${pair.guidingArticleNumber.replace(/"/g, '""')}","${pair.guidingArticleTitle.replace(/"/g, '""')}","${pair.guidingSnippet.replace(/"/g, '""')}","${typeLabel}"`
    );
  });

  const content = lines.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

  if (typeof window !== 'undefined' && filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return blob;
}

/**
 * Exports Comparison Diff Matrix to formatted Word Document (.docx)
 */
export async function exportDiffToDocx(
  diff: LegalDocumentDiffResult,
  docA: LegalDocument,
  docB: LegalDocument,
  filename?: string
): Promise<Blob> {
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 1500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Điều khoản', bold: true, size: 20 })] })] }),
        new TableCell({ width: { size: 2000, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Trạng thái', bold: true, size: 20 })] })] }),
        new TableCell({ width: { size: 5500, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: 'Nội dung so sánh đối chiếu', bold: true, size: 20 })] })] }),
      ],
    }),
  ];

  diff.articles.slice(0, 40).forEach((art) => {
    const runs: TextRun[] = [];
    art.tokens.slice(0, 100).forEach((t) => {
      if (t.op === 'added') {
        runs.push(new TextRun({ text: t.text, color: '15803D', bold: true, highlight: 'green' }));
      } else if (t.op === 'deleted') {
        runs.push(new TextRun({ text: t.text, color: 'B91C1C', strike: true }));
      } else {
        runs.push(new TextRun({ text: t.text, color: '334155' }));
      }
    });

    const statusText = art.status === 'modified' ? 'Sửa đổi' : art.status === 'added' ? 'Bổ sung' : art.status === 'deleted' ? 'Bãi bỏ' : 'Giữ nguyên';

    rows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: art.articleLabel || art.articleId, bold: true, size: 20 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: statusText, size: 20, color: art.status === 'modified' ? 'D97706' : art.status === 'added' ? '15803D' : '64748B' })] })] }),
          new TableCell({ children: [new Paragraph({ children: runs.length > 0 ? runs : [new TextRun({ text: art.articleTitleB || 'Nội dung điều khoản', size: 19 })] })] }),
        ],
      })
    );
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'BÁO CÁO ĐỐI CHIẾU THAY ĐỔI VĂN BẢN PHÁP LUẬT',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Văn bản 1: ${docA.document_number || ''} — ${docA.title}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Văn bản 2: ${docB.document_number || ''} — ${docB.title}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  if (typeof window !== 'undefined' && filename) {
    const url = URL.createObjectURL(buffer);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return buffer;
}
