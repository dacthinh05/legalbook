/**
 * legal-feed-utils.ts
 * Utilities for the "Cập nhật pháp luật" (Legal Updates Feed) page.
 *
 * Responsibilities:
 * - Determine change types (Mới ban hành, Sắp có hiệu lực, Sửa đổi/Thay thế, Hết hiệu lực)
 * - Look up primary category/topic name for each document
 * - Look up impacted documents (văn bản bị thay thế, sửa đổi, hướng dẫn)
 * - Calculate upcoming days countdown (30/60/90 days filters)
 */

import type { LegalDocument, Category, RelationType } from '@/types';
import { DEMO_CATEGORY_LINKS, DEMO_CATEGORIES, DEMO_RELATIONS } from '@/lib/demo-data';
import { getEffectiveStatus } from '@/lib/utils';

// ─── Change Types ─────────────────────────────────────────────────────────────

export type LegalChangeType =
  | 'newly_issued'        // Mới ban hành
  | 'newly_updated'       // Mới cập nhật vào hệ thống
  | 'upcoming_effective'  // Sắp có hiệu lực
  | 'amends'              // Sửa đổi văn bản khác
  | 'replaces'            // Thay thế văn bản khác
  | 'repeals'             // Bãi bỏ văn bản khác
  | 'expired'             // Hết hiệu lực
  | 'in_force';           // Đang có hiệu lực

export interface LegalChangeInfo {
  type: LegalChangeType;
  label: string;
  badgeClass: string;
  countdownDays?: number;
  impactedDocSummary?: string;
}

// ─── Relation labels ──────────────────────────────────────────────────────────

const RELATION_ACTION_LABELS: Record<RelationType, string> = {
  thay_the: 'Thay thế',
  sua_doi: 'Sửa đổi, bổ sung',
  bai_bo_toan_bo: 'Bãi bỏ toàn bộ',
  bai_bo_mot_phan: 'Bãi bỏ một phần',
  huong_dan: 'Hướng dẫn thi hành',
  can_cu: 'Căn cứ',
  lien_quan: 'Liên quan đến',
};

// ─── Impacted Document Lookup ─────────────────────────────────────────────────

export interface ImpactedDocInfo {
  relationType: RelationType;
  actionLabel: string;
  docTitle?: string;
  docNumber?: string;
  notes?: string;
}

/**
 * Finds documents impacted by this document (e.g. documents this doc replaces/amends),
 * or documents impacting this document (e.g. this doc is replaced by a newer doc).
 */
export function getImpactedDocuments(
  docId: string,
  allDocs: LegalDocument[]
): ImpactedDocInfo[] {
  const docMap = new Map<string, LegalDocument>();
  allDocs.forEach((d) => docMap.set(d.id, d));

  const results: ImpactedDocInfo[] = [];

  // 1. As source: this doc modifies/replaces a target doc
  const sourceRels = DEMO_RELATIONS.filter((r) => r.source_document_id === docId);
  for (const rel of sourceRels) {
    const targetDoc = docMap.get(rel.target_document_id);
    const relType = rel.relation_type as RelationType;
    results.push({
      relationType: relType,
      actionLabel: RELATION_ACTION_LABELS[relType] || 'Tác động',
      docNumber: targetDoc?.document_number || undefined,
      docTitle: targetDoc?.title,
      notes: rel.notes || undefined,
    });
  }

  // 2. As target: a newer source doc replaces/amends this doc
  const targetRels = DEMO_RELATIONS.filter((r) => r.target_document_id === docId);
  for (const rel of targetRels) {
    const sourceDoc = docMap.get(rel.source_document_id);
    const relType = rel.relation_type as RelationType;
    if (relType === 'thay_the' || relType === 'bai_bo_toan_bo') {
      results.push({
        relationType: relType,
        actionLabel: relType === 'thay_the' ? 'Bị thay thế bởi' : 'Bị bãi bỏ bởi',
        docNumber: sourceDoc?.document_number || undefined,
        docTitle: sourceDoc?.title,
        notes: rel.notes || undefined,
      });
    } else if (relType === 'sua_doi' || relType === 'bai_bo_mot_phan') {
      results.push({
        relationType: relType,
        actionLabel: 'Được sửa đổi bởi',
        docNumber: sourceDoc?.document_number || undefined,
        docTitle: sourceDoc?.title,
        notes: rel.notes || undefined,
      });
    }
  }

  return results;
}

// ─── Topic / Category Lookup ──────────────────────────────────────────────────

/**
 * Finds the primary category name for a document.
 */
export function getDocumentTopicName(
  docId: string,
  categories: Category[] = DEMO_CATEGORIES
): string {
  const catMap = new Map<string, Category>();
  categories.forEach((c) => catMap.set(c.id, c));

  const link = DEMO_CATEGORY_LINKS.find((l) => l.document_id === docId && l.is_primary);
  if (link && catMap.has(link.category_id)) {
    return catMap.get(link.category_id)!.name;
  }

  const anyLink = DEMO_CATEGORY_LINKS.find((l) => l.document_id === docId);
  if (anyLink && catMap.has(anyLink.category_id)) {
    return catMap.get(anyLink.category_id)!.name;
  }

  return 'Pháp luật chung';
}

// ─── Change Type Analysis ─────────────────────────────────────────────────────

/**
 * Calculates the days difference between today and a date string (YYYY-MM-DD).
 * Positive: target date is in the future.
 * Negative: target date is in the past.
 */
export function getDaysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Analyzes a document to determine its prominent change type and description.
 */
export function analyzeDocumentChange(
  doc: LegalDocument,
  allDocs: LegalDocument[]
): LegalChangeInfo {
  const effStatus = getEffectiveStatus(doc);
  const daysUntilEffective = getDaysUntil(doc.effective_date);
  const daysSinceIssued = getDaysUntil(doc.issued_date);
  const impacted = getImpactedDocuments(doc.id, allDocs);

  // 1. Upcoming in-force
  if (effStatus === 'chua_hieu_luc' && daysUntilEffective !== null && daysUntilEffective > 0) {
    return {
      type: 'upcoming_effective',
      label: `Sắp hiệu lực (còn ${daysUntilEffective} ngày)`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      countdownDays: daysUntilEffective,
      impactedDocSummary: impacted[0] ? `${impacted[0].actionLabel} ${impacted[0].docNumber || ''}`.trim() : undefined,
    };
  }

  // 2. Expired / replaced
  if (effStatus === 'het_hieu_luc_toan_bo') {
    return {
      type: 'expired',
      label: 'Hết hiệu lực',
      badgeClass: 'bg-red-100 text-red-800 border-red-300 font-semibold',
      impactedDocSummary: impacted[0] ? `${impacted[0].actionLabel} ${impacted[0].docNumber || ''}`.trim() : undefined,
    };
  }
  if (effStatus === 'het_hieu_luc_mot_phan') {
    return {
      type: 'expired',
      label: 'Hết hiệu lực một phần',
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-300 font-semibold',
      impactedDocSummary: impacted[0] ? `${impacted[0].actionLabel} ${impacted[0].docNumber || ''}`.trim() : undefined,
    };
  }

  // 3. Replaces / Amends other documents
  const replaceRel = impacted.find((r) => r.relationType === 'thay_the');
  if (replaceRel) {
    return {
      type: 'replaces',
      label: `Thay thế ${replaceRel.docNumber || 'văn bản cũ'}`,
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
      impactedDocSummary: replaceRel.notes || `Thay thế ${replaceRel.docNumber || ''}`,
    };
  }

  const amendRel = impacted.find((r) => r.relationType === 'sua_doi');
  if (amendRel) {
    return {
      type: 'amends',
      label: `Sửa đổi ${amendRel.docNumber || 'văn bản liên quan'}`,
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold',
      impactedDocSummary: amendRel.notes || `Sửa đổi ${amendRel.docNumber || ''}`,
    };
  }

  // 4. Newly issued (within last 180 days)
  if (daysSinceIssued !== null && daysSinceIssued >= -180 && daysSinceIssued <= 0) {
    return {
      type: 'newly_issued',
      label: 'Mới ban hành',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold',
      impactedDocSummary: impacted[0] ? `${impacted[0].actionLabel} ${impacted[0].docNumber || ''}`.trim() : undefined,
    };
  }

  // 5. Default in force / newly updated
  return {
    type: 'newly_updated',
    label: 'Mới cập nhật',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 font-medium',
    impactedDocSummary: impacted[0] ? `${impacted[0].actionLabel} ${impacted[0].docNumber || ''}`.trim() : undefined,
  };
}
