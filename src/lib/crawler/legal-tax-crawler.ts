/**
 * legal-tax-crawler.ts
 *
 * Automated Ingestion Pipeline for Tax, Accounting, Social Insurance,
 * Labor, and Enterprise Regulations (2024–2026).
 */

import type { LegalDocument, DocumentType, DocumentStatus } from '@/types';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';
import { ContentQualityValidator, type ContentQualityResult } from '@/lib/quality/content-validator';
import { chunkLegalDocumentByArticle } from '@/lib/document-import/article-chunker';
export interface CrawlTargetTopic {
  id: string;
  name: string;
  categorySlug: string;
  priorityYears: number[];
  keywords: string[];
}

export const PRIORITY_TOPICS_2024_2026: CrawlTargetTopic[] = [
  {
    id: 'thue-tndn-2025',
    name: 'Thuế Thu nhập Doanh nghiệp & Chi phí được trừ (2024-2026)',
    categorySlug: 'thue-tndn',
    priorityYears: [2024, 2025, 2026],
    keywords: ['thuế thu nhập doanh nghiệp', 'chi phí được trừ', 'giao dịch liên kết', 'lãi vay 30% ebitda'],
  },
  {
    id: 'thue-gtgt-2025',
    name: 'Luật Thuế Giá trị Gia tăng 2024 & Hoàn thuế',
    categorySlug: 'thue-gtgt',
    priorityYears: [2024, 2025, 2026],
    keywords: ['thuế giá trị gia tăng', 'giảm 2% thuế gtgt', 'hoàn thuế xuất khẩu', 'dự án đầu tư'],
  },
  {
    id: 'thue-tncn-2025',
    name: 'Thuế Thu nhập Cá nhân & Giảm trừ gia cảnh 15.5 triệu (2025-2026)',
    categorySlug: 'thue-tncn',
    priorityYears: [2025, 2026],
    keywords: ['thuế thu nhập cá nhân', 'giảm trừ gia cảnh', '15,5 triệu', 'biểu thuế 5 bậc'],
  },
  {
    id: 'che-do-ke-toan-moi',
    name: 'Chế độ Kế toán Doanh nghiệp mới (Thay thế TT 200/2014 & IFRS)',
    categorySlug: 'che-do-ke-toan',
    priorityYears: [2024, 2025, 2026],
    keywords: ['chế độ kế toán doanh nghiệp', 'chuẩn mực báo cáo tài chính quốc tế', 'ifrs', 'vfrs'],
  },
  {
    id: 'hoa-don-dien-tu-pos',
    name: 'Hóa đơn Điện tử khởi tạo từ Máy tính tiền & Chứng từ',
    categorySlug: 'hoa-don-chung-tu',
    priorityYears: [2024, 2025, 2026],
    keywords: ['hóa đơn điện tử', 'máy tính tiền', 'chứng từ điện tử', 'nghị định 123'],
  },
  {
    id: 'bhxh-lao-dong-2025',
    name: 'Luật Bảo hiểm Xã hội 2024 & Tiền lương, Hợp đồng lao động điện tử',
    categorySlug: 'bao-hiem-xa-hoi',
    priorityYears: [2024, 2025, 2026],
    keywords: ['bảo hiểm xã hội', 'lương tối thiểu vùng', 'hợp đồng lao động điện tử'],
  },
];

export interface IngestedDocumentBatch {
  topicId: string;
  ingestedAt: string;
  totalFound: number;
  autoPublishedCount: number;
  queuedForReviewCount: number;
  documents: Array<{
    document: LegalDocument;
    quality: ContentQualityResult;
    autoPublished: boolean;
    totalProvisions: number;
  }>;
}

/**
 * Standardizes raw crawled legal data into validated LegalDocument with Decree 30/2020 layout and chunks.
 */
export function standardizeCrawledDocument(raw: {
  id?: string;
  title: string;
  document_number: string;
  document_type: DocumentType;
  issuing_body?: string;
  signer?: string;
  issued_date?: string;
  effective_date?: string;
  status?: DocumentStatus;
  raw_html: string;
  official_file_url?: string;
  file_type?: 'docx' | 'pdf';
}): { document: LegalDocument; quality: ContentQualityResult; totalProvisions: number } {
  const formattedHtml = formatLegalHtmlContent(raw.raw_html, {
    title: raw.title,
    document_number: raw.document_number,
    issuing_body: raw.issuing_body,
    signer: raw.signer,
    issued_date: raw.issued_date,
    effective_date: raw.effective_date,
  });

  const chunkResult = chunkLegalDocumentByArticle(formattedHtml, {
    documentNumber: raw.document_number,
  });

  const files = raw.official_file_url
    ? [
        {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          document_id: raw.id || `doc-${Date.now()}`,
          file_type: raw.file_type || 'docx',
          file_url: raw.official_file_url,
          file_size: 154000,
          original_filename: `${raw.document_number.replace(/\//g, '_')}.${raw.file_type || 'docx'}`,
          is_primary: true,
          version: 1,
          uploaded_by: 'crawler_service',
          created_at: new Date().toISOString(),
        },
      ]
    : [];

  const candidateDoc: LegalDocument = {
    id: raw.id || `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: raw.title.trim(),
    document_number: raw.document_number.trim(),
    document_type: raw.document_type,
    issuing_body: raw.issuing_body || 'Cơ quan nhà nước có thẩm quyền',
    signer: raw.signer || null,
    issued_date: raw.issued_date || null,
    effective_date: raw.effective_date || null,
    expiry_date: null,
    status: raw.status || 'hieu_luc',
    html_content: formattedHtml,
    raw_source_content: raw.raw_html,
    files,
    content_status: 'verified',
    source_type: raw.file_type === 'docx' ? 'official-docx' : 'official-html',
    is_deleted: false,
    is_published: false, // will be decided by quality scorer
    review_status: 'pending_review',
    view_count: 0,
    summary_main: null,
    summary_new_points: null,
    summary_affected_parties: null,
    summary_accounting_impact: null,
    summary_audit_impact: null,
    summary_actions_needed: null,
    summary_is_ai_generated: false,
    official_source_url: raw.official_file_url || null,
    created_by: 'system_crawler',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const quality = ContentQualityValidator.validate({
    htmlContent: candidateDoc.html_content,
    title: candidateDoc.title,
    documentNumber: candidateDoc.document_number,
    documentType: candidateDoc.document_type,
    hasAttachedFiles: files.length > 0,
  });

  return {
    document: candidateDoc,
    quality,
    totalProvisions: chunkResult.totalChunks,
  };
}
