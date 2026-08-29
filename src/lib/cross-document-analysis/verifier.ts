import type { LegalDocument, DocumentRelation, RelationType } from '@/types';
import { DEMO_RELATIONS } from '@/lib/demo-data';
import type { ExactDiffVerificationResult } from './types';

/**
 * Normalizes Vietnamese text for regex matching (removes accents/lowercases).
 */
function normalizeForMatch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Extracts list of amended/replaced/repealed articles from an amending document.
 * E.g. "Sửa đổi Điều 15", "Sửa đổi khoản 2 Điều 9", "Bãi bỏ Điều 23" -> ["Điều 15", "Điều 9", "Điều 23"]
 */
export function detectAmendedArticles(amendingDocHtml: string, sourceDocNumber?: string | null): string[] {
  if (!amendingDocHtml) return [];
  const foundArticles = new Set<string>();

  // Strip tags for clean text search
  const text = amendingDocHtml.replace(/<[^>]+>/g, ' ');

  // Pattern 1: Sửa đổi, bổ sung Điều X / Bãi bỏ Điều X / Thay thế Điều X
  const p1 = /(?:sửa\s+đổi|bổ\s+sung|thay\s+thế|bãi\s+bỏ)(?:[,\s]+bổ\s+sung)?(?:\s+(?:các|một\s+số))?(?:\s+khoản\s+[\d,\s]+)?\s+điều\s+(\d+[a-zA-Z]?)/gi;
  let match: RegExpExecArray | null;
  while ((match = p1.exec(text)) !== null) {
    if (match[1]) {
      foundArticles.add(`Điều ${match[1]}`);
    }
  }

  // Pattern 2: "Điều X. Sửa đổi, bổ sung Điều Y của Luật..."
  const p2 = /điều\s+(\d+[a-zA-Z]?)[.\s]+(?:sửa\s+đổi|bổ\s+sung|thay\s+thế|bãi\s+bỏ)/gi;
  while ((match = p2.exec(text)) !== null) {
    if (match[1]) {
      foundArticles.add(`Điều ${match[1]}`);
    }
  }

  // Pattern 3: Explicit target doc number match if provided
  if (sourceDocNumber) {
    const escaped = sourceDocNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const p3 = new RegExp(`(?:điều\\s+(\\d+[a-zA-Z]?)[^.]*?(?:của|thuộc)\\s+(?:luật|nghị định|thông tư|văn bản)?\\s*${escaped})`, 'gi');
    while ((match = p3.exec(text)) !== null) {
      if (match[1]) {
        foundArticles.add(`Điều ${match[1]}`);
      }
    }
  }

  return Array.from(foundArticles);
}

/**
 * Verifies whether Document A and Document B have a verified legal amendment/replacement relationship.
 * Exact Diff is ONLY eligible when:
 * 1. Document A is amended/supplemented/replaced/repealed by Document B (or vice versa) in verified relations.
 * 2. Or explicit statutory amendment clauses exist in text between the two documents.
 * 3. Or both are two consecutive official versions of the same document.
 */
export function verifyExactAmendmentEligibility(
  docA: LegalDocument,
  docB: LegalDocument,
  allRelations: DocumentRelation[] = DEMO_RELATIONS
): ExactDiffVerificationResult {
  if (!docA || !docB || docA.id === docB.id) {
    return {
      isEligibleForExactDiff: false,
      reason: 'Hai văn bản giống nhau hoặc không hợp lệ để đối chiếu sửa đổi.',
    };
  }

  // 1. Check verified relationships in repository
  const relAB = allRelations.find(
    (r) =>
      (r.source_document_id === docA.id && r.target_document_id === docB.id) ||
      (r.source_document_id === docB.id && r.target_document_id === docA.id)
  );

  const amendingTypes: RelationType[] = ['sua_doi', 'thay_the', 'bai_bo_toan_bo', 'bai_bo_mot_phan'];

  if (relAB && amendingTypes.includes(relAB.relation_type)) {
    // In our schema: source_document is often the amending/newer doc, target is the original doc (or vice versa)
    const isSourceAmending =
      relAB.source_document_id === docB.id ||
      (docB.issued_date && docA.issued_date && new Date(docB.issued_date) >= new Date(docA.issued_date));

    const sourceDoc = isSourceAmending ? docA : docB;
    const amendingDoc = isSourceAmending ? docB : docA;
    const amendedArts = detectAmendedArticles(amendingDoc.html_content || '', sourceDoc.document_number);

    const relLabel =
      relAB.relation_type === 'sua_doi'
        ? 'sửa đổi, bổ sung'
        : relAB.relation_type === 'thay_the'
        ? 'thay thế'
        : 'bãi bỏ';

    return {
      isEligibleForExactDiff: true,
      reason: `Có quan hệ ${relLabel} đã xác minh giữa hai văn bản.`,
      legalBasis: relAB.notes || `${amendingDoc.document_number || amendingDoc.title} ${relLabel} ${sourceDoc.document_number || sourceDoc.title}`,
      relationType: relAB.relation_type,
      sourceDoc,
      amendingDoc,
      amendedArticles: amendedArts,
    };
  }

  // 2. Check title / content text for explicit amendment markers
  const titleA = normalizeForMatch(docA.title || '');
  const titleB = normalizeForMatch(docB.title || '');
  const numA = docA.document_number ? normalizeForMatch(docA.document_number) : '';
  const numB = docB.document_number ? normalizeForMatch(docB.document_number) : '';

  // Check if B's title explicitly says it amends A
  const bAmendsA =
    (numA && (titleB.includes(numA) || normalizeForMatch(docB.html_content || '').includes(numA))) &&
    (titleB.includes('sua doi') || titleB.includes('bo sung') || titleB.includes('thay the'));

  const aAmendsB =
    (numB && (titleA.includes(numB) || normalizeForMatch(docA.html_content || '').includes(numB))) &&
    (titleA.includes('sua doi') || titleA.includes('bo sung') || titleA.includes('thay the'));

  if (bAmendsA) {
    const amendedArts = detectAmendedArticles(docB.html_content || '', docA.document_number);
    return {
      isEligibleForExactDiff: true,
      reason: `${docB.document_number || 'Văn bản B'} có điều khoản sửa đổi trực tiếp ${docA.document_number || 'Văn bản A'}.`,
      legalBasis: `${docB.document_number || docB.title} sửa đổi, bổ sung ${docA.document_number || docA.title}`,
      relationType: 'sua_doi',
      sourceDoc: docA,
      amendingDoc: docB,
      amendedArticles: amendedArts,
    };
  }

  if (aAmendsB) {
    const amendedArts = detectAmendedArticles(docA.html_content || '', docB.document_number);
    return {
      isEligibleForExactDiff: true,
      reason: `${docA.document_number || 'Văn bản A'} có điều khoản sửa đổi trực tiếp ${docB.document_number || 'Văn bản B'}.`,
      legalBasis: `${docA.document_number || docA.title} sửa đổi, bổ sung ${docB.document_number || docB.title}`,
      relationType: 'sua_doi',
      sourceDoc: docB,
      amendingDoc: docA,
      amendedArticles: amendedArts,
    };
  }

  // 3. Fallback: Not eligible for exact amendment diff
  return {
    isEligibleForExactDiff: false,
    reason: 'Hai văn bản này không phải hai phiên bản trước–sau. Không thể tạo diff sửa đổi đáng tin cậy.',
  };
}
