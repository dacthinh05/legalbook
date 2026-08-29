/**
 * auto-publish-engine.ts
 *
 * 4-Dimensional Quality Scorer & Hybrid Auto-Publish Decision Engine.
 * Auto-publishes high-integrity legal documents (Score >= 90%) and routes
 * lower-confidence documents to the 3-column Admin Verification Queue.
 */

import type { LegalDocument } from '@/types';
import { extractStructuredArticles } from '@/lib/diff-engine';

export interface AutoPublishEvaluation {
  documentId: string;
  documentNumber: string;
  score: number; // 0 to 100
  decision: 'auto_publish' | 'queue_for_review';
  isPublished: boolean;
  reviewStatus: 'published' | 'pending_review';
  dimensionBreakdown: {
    metadataScore: number; // Max 25
    contentScore: number; // Max 30
    sourceScore: number; // Max 25
    structureScore: number; // Max 20
  };
  passedChecks: string[];
  warningFlags: string[];
  evaluatedAt: string;
}

export function evaluateAutoPublishEligibility(
  doc: LegalDocument,
  thresholdScore: number = 90
): AutoPublishEvaluation {
  const passedChecks: string[] = [];
  const warningFlags: string[] = [];

  let metadataScore = 0;
  let contentScore = 0;
  let sourceScore = 0;
  let structureScore = 0;

  // 1. Dimension 1: Metadata Completeness (Max 25 pts)
  if (doc.document_number && doc.document_number.length >= 3) {
    metadataScore += 8;
    passedChecks.push('Số hiệu văn bản hợp lệ');
  } else {
    warningFlags.push('Thiếu hoặc sai số hiệu văn bản');
  }

  if (doc.title && doc.title.length >= 10) {
    metadataScore += 7;
    passedChecks.push('Tiêu đề văn bản đầy đủ');
  } else {
    warningFlags.push('Tiêu đề văn bản quá ngắn');
  }

  if (doc.issuing_body) {
    metadataScore += 5;
    passedChecks.push('Có cơ quan ban hành');
  } else {
    warningFlags.push('Chưa xác định cơ quan ban hành');
  }

  if (doc.effective_date || doc.issued_date) {
    metadataScore += 5;
    passedChecks.push('Có ngày hiệu lực / ban hành');
  } else {
    warningFlags.push('Thiếu ngày hiệu lực và ngày ký');
  }

  // 2. Dimension 2: Content Cleanliness & Decree 30/2020 Layout (Max 30 pts)
  const html = doc.html_content || '';
  if (html.length >= 200) {
    contentScore += 10;
    passedChecks.push('Độ dài toàn văn đạt chuẩn');
  } else {
    warningFlags.push('Toàn văn quá ngắn (< 200 ký tự)');
  }

  if (html.includes('legal-article-title') || html.includes('dieu-') || html.includes('Điều ')) {
    contentScore += 10;
    passedChecks.push('Định dạng Điều khoản chuẩn hóa');
  } else {
    warningFlags.push('Chưa bóc tách được điều khoản chuẩn');
  }

  // Check no broken unescaped raw code or XSS scripts
  if (!html.includes('<script') && !html.includes('undefined') && !html.includes('[object Object]')) {
    contentScore += 10;
    passedChecks.push('Nội dung sạch, không có lỗi runtime');
  } else {
    warningFlags.push('Phát hiện đoạn mã rác hoặc lỗi render');
  }

  // 3. Dimension 3: Source Authenticity & File Attachment (Max 25 pts)
  const hasDocx = doc.files?.some((f) => f.file_type === 'docx');
  const hasPdf = doc.files?.some((f) => f.file_type === 'pdf');

  if (hasDocx) {
    sourceScore += 25;
    passedChecks.push('Có tệp Word gốc (.docx) chính thống');
  } else if (hasPdf) {
    sourceScore += 20;
    passedChecks.push('Có tệp PDF scan đính kèm');
  } else if (doc.official_source_url) {
    sourceScore += 15;
    passedChecks.push('Có liên kết nguồn chính phủ');
  } else {
    warningFlags.push('Thiếu tệp đính kèm gốc và liên kết nguồn');
  }

  // 4. Dimension 4: Provision Structure & TOC Integrity (Max 20 pts)
  const articles = extractStructuredArticles(html);
  if (articles.length >= 1) {
    structureScore += 15;
    passedChecks.push(`Trích xuất được ${articles.length} điều khoản`);
    if (articles.every((a) => a.id && a.id.startsWith('dieu-'))) {
      structureScore += 5;
      passedChecks.push('100% điều khoản có DOM ID dieu-X');
    }
  } else {
    warningFlags.push('Không trích xuất được điều khoản nào');
  }

  const totalScore = metadataScore + contentScore + sourceScore + structureScore;
  const isEligible = totalScore >= thresholdScore && !warningFlags.some((w) => w.includes('quá ngắn') || w.includes('lỗi render'));

  return {
    documentId: doc.id,
    documentNumber: doc.document_number || doc.title,
    score: totalScore,
    decision: isEligible ? 'auto_publish' : 'queue_for_review',
    isPublished: isEligible,
    reviewStatus: isEligible ? 'published' : 'pending_review',
    dimensionBreakdown: {
      metadataScore,
      contentScore,
      sourceScore,
      structureScore,
    },
    passedChecks,
    warningFlags,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Applies auto-publish decision to a candidate document.
 */
export function applyAutoPublishDecision(
  doc: LegalDocument,
  thresholdScore: number = 90
): { document: LegalDocument; evaluation: AutoPublishEvaluation } {
  const evaluation = evaluateAutoPublishEligibility(doc, thresholdScore);

  const updatedDoc: LegalDocument = {
    ...doc,
    is_published: evaluation.isPublished,
    review_status: evaluation.reviewStatus,
    quality_score: evaluation.score,
    quality_status: evaluation.score >= 90 ? 'complete' : evaluation.score >= 70 ? 'partial' : 'invalid',
    quality_warnings: evaluation.warningFlags,
  };

  return {
    document: updatedDoc,
    evaluation,
  };
}
