import type { LegalDocument, DocumentType, DocumentStatus, ReviewStatus } from '@/types';
import type { LegalRelationship, LegalChange, LegalRelationshipType } from '@/lib/legal-engine/types';

export type VerificationTabType = 'documents' | 'relationship' | 'changeset' | 'audit';

export type ConflictSeverity = 'error' | 'warning' | 'info';

export type FieldVerificationStatus = 'confirmed' | 'edited' | 'unresolved';

export interface BoundingBox {
  x: number; // percentage 0-100 or px
  y: number; // percentage 0-100 or px
  width: number;
  height: number;
  page: number;
  label?: string;
}

export interface VerificationField {
  key: string;
  label: string;
  category: 'metadata' | 'administrative' | 'content' | 'source';
  extractedValue: string | null;
  detectedScanValue?: string | null;
  currentValue: string | null;
  confidence: number; // 0 to 1
  status: FieldVerificationStatus;
  sourcePage: number;
  sourceLocationText?: string;
  boundingBox?: BoundingBox;
  ocrSnippet?: string;
  conflictReason?: string;
  severity?: ConflictSeverity;
  isMandatory?: boolean;
}

export interface ValidationConflict {
  id: string;
  fieldKey: string;
  severity: ConflictSeverity;
  title: string;
  message: string;
  suggestedValues?: string[];
  sourceQuote?: string;
  isResolved: boolean;
  isConfirmed: boolean;
  ignoredReason?: string;
}

export interface VerificationAuditEntry {
  id: string;
  targetId: string;
  targetType: 'document' | 'relationship' | 'changeset';
  targetTitle: string;
  action: 'verified' | 'rejected' | 'draft_saved' | 'metadata_modified' | 'ocr_requested' | 'duplicate_marked' | 'direction_swapped' | 'relation_type_changed';
  reviewer: string;
  timestamp: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  reason?: string;
  notes?: string;
  evidenceSource?: string;
  publishedStatus: 'draft' | 'pending_review' | 'verified' | 'published';
}

export interface OcrPageBlock {
  id: string;
  page: number;
  blockType: 'header' | 'number' | 'title' | 'date' | 'body' | 'signature' | 'recipient';
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface DocumentVerificationRecord {
  id: string;
  document: LegalDocument;
  overallConfidence: number; // 0-100
  applicableLayoutRule: string; // e.g. "Nghị định 30/2020/NĐ-CP"
  fields: Record<string, VerificationField>;
  conflicts: ValidationConflict[];
  ocrPages: {
    pageNumber: number;
    imageUrl?: string;
    pdfPage?: number;
    blocks: OcrPageBlock[];
    rawText: string;
  }[];
  reviewStatus: 'pending' | 'verified' | 'rejected' | 'needs_ocr';
  autoPublishOnVerify: boolean;
  isDirty?: boolean;
  lastSavedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  rejectionNotes?: string;
  ocrRequestReason?: string;
}

export interface VerificationFilterState {
  searchQuery: string;
  issueFilter: 'all' | 'errors' | 'warnings' | 'clean';
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  statusFilter: 'all' | 'pending' | 'verified' | 'rejected';
}

export interface RelationshipVerificationItem extends LegalRelationship {
  sourceDoc?: LegalDocument;
  targetDoc?: LegalDocument;
  isConflictWithExisting?: boolean;
  existingConflictNote?: string;
  isDirty?: boolean;
}

export interface ChangesetDiffItem extends LegalChange {
  articleLabel?: string;
  clauseLabel?: string;
  pointLabel?: string;
  isVerified?: boolean;
  verificationNotes?: string;
}
