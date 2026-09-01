/**
 * citation-linker.ts
 * 
 * High-Performance Legal Citation Auto-Detection & Hyperlink Engine
 * (Inspired by Free Law Project's Eyecite & Akoma Ntoso Linking Standard).
 * 
 * Automatically detects legal citations in text/HTML:
 * - "Khoản 1 Điều 4 Thông tư số 96/2015/TT-BTC"
 * - "Điểm d Khoản 2 Điều 5 Nghị định 132/2020/NĐ-CP"
 * - "Luật Quản lý thuế số 38/2019/QH14"
 * - "Thông tư 200/2014/TT-BTC"
 * 
 * Transforms them into interactive smart citations with popover previews and instant navigation.
 */

import type { LegalDocument } from '@/types';

export interface DetectedCitation {
  id: string;
  rawText: string;
  provisionCitation?: string; // e.g. "Khoản 1 Điều 4"
  documentNumber?: string;    // e.g. "96/2015/TT-BTC"
  documentTypeLabel?: string; // e.g. "Thông tư"
  targetDocumentId?: string;
  targetDocumentTitle?: string;
  targetProvisionId?: string;
  isResolved: boolean;
}

// Regex for extracting legal citations
const CITATION_REGEX = /(?:(?:Khoản\s+(\d+)\s+)?(?:Điểm\s+([a-zđ])\s+)?(?:Điều\s+(\d+)\s+)?)?(?:(Luật|Bộ luật|Nghị định|Thông tư|Quyết định|Nghị quyết|Văn bản hợp nhất|Công văn)\s+(?:số\s+)?([0-9]+(?:\/[0-9]+)?\/[A-Z0-9Đ\-_]+))/gi;

/**
 * Normalizes document numbers for robust cross-matching.
 */
function normalizeDocNumber(num: string): string {
  return num
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[\.\-_]/g, '/')
    .replace(/\/+/g, '/');
}

/**
 * Scans HTML content and injects interactive legal citation hyperlinks.
 */
export function linkLegalCitations(
  htmlContent: string,
  allDocuments: LegalDocument[] = []
): { html: string; citationsCount: number; citations: DetectedCitation[] } {
  if (!htmlContent || typeof htmlContent !== 'string') {
    return { html: htmlContent || '', citationsCount: 0, citations: [] };
  }

  // Create fast lookup maps by document_number and slug
  const docMapByNumber = new Map<string, LegalDocument>();
  const docMapById = new Map<string, LegalDocument>();

  for (const doc of allDocuments) {
    if (doc.id) docMapById.set(doc.id, doc);
    if (doc.document_number) {
      const cleanNum = doc.document_number.toUpperCase().trim();
      docMapByNumber.set(cleanNum, doc);
      docMapByNumber.set(normalizeDocNumber(cleanNum), doc);
    }
  }

  const detectedCitations: DetectedCitation[] = [];
  let citationIndex = 0;

  // Replace text nodes while preserving existing HTML tags
  const processedHtml = htmlContent.replace(
    /(<[^>]+>)|([^<]+)/g,
    (_match: string, htmlTag?: string, textContent?: string): string => {
      if (htmlTag) {
        return htmlTag; // Don't touch HTML tags
      }
      if (!textContent || textContent.trim().length === 0) {
        return textContent || '';
      }
      // Scan text content for citations
      return textContent.replace(CITATION_REGEX, (fullMatch: string, clause?: string, point?: string, article?: string, typeLabel?: string, docNum?: string) => {
        if (!docNum) return fullMatch;

        const cleanDocNum = docNum.trim();
        const normNum = normalizeDocNumber(cleanDocNum);
        const targetDoc = docMapByNumber.get(cleanDocNum.toUpperCase()) || docMapByNumber.get(normNum);

        const citationId = `cite-${++citationIndex}`;
        const provParts: string[] = [];
        if (point) provParts.push(`Điểm ${point}`);
        if (clause) provParts.push(`Khoản ${clause}`);
        if (article) provParts.push(`Điều ${article}`);
        const provisionCitation = provParts.join(' ');

        const targetProvisionId = article ? `dieu-${article}` : undefined;
        const clauseAttr = clause ? ` data-clause-num="${clause}"` : '';
        const pointAttr = point ? ` data-point-letter="${point}"` : '';
        const provCitationAttr = provisionCitation ? ` data-provision-citation="${encodeURIComponent(provisionCitation)}"` : '';

        const citation: DetectedCitation = {
          id: citationId,
          rawText: fullMatch,
          provisionCitation: provisionCitation || undefined,
          documentNumber: cleanDocNum,
          documentTypeLabel: typeLabel,
          targetDocumentId: targetDoc?.id,
          targetDocumentTitle: targetDoc?.title,
          targetProvisionId,
          isResolved: Boolean(targetDoc),
        };

        detectedCitations.push(citation);

        if (targetDoc) {
          const tooltip = `Mở ${targetDoc.document_number}${provisionCitation ? ` (${provisionCitation})` : ''}: ${targetDoc.title.slice(0, 60)}...`;
          return `<a href="#doc-${targetDoc.id}${targetProvisionId ? `:${targetProvisionId}` : ''}" class="legal-citation-link font-semibold text-blue-700 hover:text-blue-900 underline decoration-blue-300 hover:decoration-blue-600 underline-offset-2 transition-colors cursor-pointer" data-citation-id="${citationId}" data-doc-id="${targetDoc.id}" data-doc-number="${cleanDocNum}" ${targetProvisionId ? `data-provision-id="${targetProvisionId}"` : ''}${clauseAttr}${pointAttr}${provCitationAttr} title="${tooltip}">${fullMatch}</a>`;
        }

        return `<span class="legal-citation-badge text-slate-800 font-medium" data-citation-id="${citationId}" data-doc-number="${cleanDocNum}" ${targetProvisionId ? `data-provision-id="${targetProvisionId}"` : ''}${clauseAttr}${pointAttr}${provCitationAttr}>${fullMatch}</span>`;
      });
    }
  );
  return {
    html: processedHtml,
    citationsCount: detectedCitations.length,
    citations: detectedCitations,
  };
}
