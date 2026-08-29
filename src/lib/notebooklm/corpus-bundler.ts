/**
 * Google NotebookLM Corpus Bundler & Exporter
 * 
 * Packages LegalBook documents into clean, structured Markdown corpora
 * optimized for Google NotebookLM (50-source budget, audio overview synthesis).
 */
import type { LegalDocument } from '@/types';
import { stripHtml } from '@/lib/search';
import { formatShortTitle, formatDate } from '@/lib/utils';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';

export interface NotebookLmBundleResult {
  totalDocuments: number;
  totalCharacters: number;
  estimatedTokens: number;
  filename: string;
  markdownContent: string;
  documentList: Array<{
    id: string;
    documentNumber: string;
    title: string;
    effectiveDate: string;
    charCount: number;
  }>;
}

/**
 * Formats a single LegalDocument into clean Markdown for NotebookLM
 */
export function formatDocumentForNotebookLm(doc: LegalDocument): string {
  const docNum = doc.document_number || 'Văn bản quy định';
  const cleanBody = doc.html_content ? stripHtml(doc.html_content) : '';
  const shortTitle = formatShortTitle(doc.title, doc.document_type, doc.document_number);
  const lines: string[] = [];
  lines.push(`================================================================================`);
  lines.push(`# VĂN BẢN: ${docNum}`);
  lines.push(`## TIÊU ĐỀ: ${shortTitle}`);
  lines.push(`================================================================================`);
  lines.push(``);
  lines.push(`- **Số hiệu:** ${docNum}`);
  lines.push(`- **Loại văn bản:** ${doc.document_type || 'Văn bản quy phạm'}`);
  lines.push(`- **Cơ quan ban hành:** ${doc.issuing_body || 'Chưa cập nhật'}`);
  lines.push(`- **Người ký:** ${doc.signer || 'Chưa cập nhật'}`);
  lines.push(`- **Ngày ban hành:** ${formatDate(doc.issued_date)}`);
  lines.push(`- **Ngày có hiệu lực:** ${formatDate(doc.effective_date)}`);
  lines.push(`- **Trạng thái hiệu lực:** ${doc.status === 'hieu_luc' ? 'Đang có hiệu lực' : 'Sắp có hiệu lực'}`);
  lines.push(``);

  if (doc.summary_main) {
    lines.push(`### TÓM TẮT NỘI DUNG CHÍNH:`);
    lines.push(doc.summary_main);
    lines.push(``);
  }

  if (doc.summary_new_points) {
    lines.push(`### CÁC ĐIỂM MỚI NỔI BẬT:`);
    lines.push(doc.summary_new_points);
    lines.push(``);
  }

  if (doc.summary_affected_parties) {
    lines.push(`### ĐỐI TƯỢNG ÁP DỤNG & CHỊU TÁC ĐỘNG:`);
    lines.push(doc.summary_affected_parties);
    lines.push(``);
  }

  if (cleanBody) {
    lines.push(`### TOÀN VĂN QUY ĐỊNH PHÁP LUẬT:`);
    lines.push(cleanBody);
    lines.push(``);
  }

  lines.push(`\n\n`);
  return lines.join('\n');
}

/**
 * Generates a unified Markdown corpus bundle from legal documents
 */
export function generateNotebookLmBundle(
  documents: LegalDocument[] = DEMO_DOCUMENTS as unknown as LegalDocument[],
  maxDocs: number = 50
): NotebookLmBundleResult {
  // Sort documents: active first, then most recently enacted
  const sorted = [...documents].sort((a, b) => {
    const da = a.effective_date || a.issued_date || '';
    const db = b.effective_date || b.issued_date || '';
    return db.localeCompare(da);
  });

  const selectedDocs = sorted.slice(0, maxDocs);
  const parts: string[] = [];

  parts.push(`# TỔNG HỢP HỆ THỐNG VĂN BẢN PHÁP LUẬT THUẾ - KẾ TOÁN - DOANH NGHIỆP`);
  parts.push(`*Xuất bản tự động từ PACO LegalBook phục vụ Sổ tay Google NotebookLM*`);
  parts.push(`*Ngày xuất dữ liệu: ${new Date().toLocaleDateString('vi-VN')}*`);
  parts.push(`*Tổng số văn bản nạp: ${selectedDocs.length} văn bản*\n\n`);

  const documentList: NotebookLmBundleResult['documentList'] = [];

  for (const doc of selectedDocs) {
    const formatted = formatDocumentForNotebookLm(doc);
    parts.push(formatted);

    documentList.push({
      id: doc.id,
      documentNumber: doc.document_number || 'N/A',
      title: doc.title,
      effectiveDate: formatDate(doc.effective_date),
      charCount: formatted.length,
    });
  }

  const markdownContent = parts.join('\n');
  const totalCharacters = markdownContent.length;
  const estimatedTokens = Math.round(totalCharacters / 3.2); // Average 3.2 chars per token for Vietnamese legal text

  return {
    totalDocuments: selectedDocs.length,
    totalCharacters,
    estimatedTokens,
    filename: `LegalBook-Corpus-NotebookLM-${new Date().toISOString().slice(0, 10)}.md`,
    markdownContent,
    documentList,
  };
}
