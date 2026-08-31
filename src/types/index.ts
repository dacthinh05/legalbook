// Database types matching our Supabase schema

export type UserRole = 'admin' | 'editor' | 'reader';

export type DocumentType =
  | 'luat'
  | 'nghi_dinh'
  | 'thong_tu'
  | 'quyet_dinh'
  | 'cong_van'
  | 'chuan_muc'
  | 'huong_dan'
  | 'vbhn'
  | 'nghi_quyet'
  | 'khac';
export type DocumentStatus =
  | 'hieu_luc'
  | 'chua_hieu_luc'
  | 'het_hieu_luc_mot_phan'
  | 'het_hieu_luc_toan_bo'
  | 'chua_xac_dinh';

export type ReviewStatus = 'draft' | 'pending_review' | 'published';

export type RelationType =
  | 'can_cu'
  | 'huong_dan'
  | 'sua_doi'
  | 'thay_the'
  | 'bai_bo_toan_bo'
  | 'bai_bo_mot_phan'
  | 'lien_quan';

export type ReadingStatus =
  | 'chua_doc'
  | 'dang_doc'
  | 'da_doc'
  | 'can_xem_lai';

export type FileType = 'pdf' | 'docx' | 'html';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed fields
  children?: Category[];
  document_count?: number;
  unread_count?: number;
  has_new?: boolean;
  is_pinned?: boolean;
}

export interface LegalDocument {
  id: string;
  title: string;
  slug?: string | null;
  document_number: string | null;
  document_type: DocumentType;
  issuing_body: string | null;
  signer: string | null;
  issued_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  status: DocumentStatus;
  html_content: string | null;
  // Content quality and provenance
  raw_source_content?: string | null;
  extracted_content?: string | null;
  normalized_content?: string | null;
  content_status?:
    | 'not-fetched'
    | 'fetching'
    | 'downloaded'
    | 'extracting'
    | 'extracted'
    | 'partial'
    | 'failed'
    | 'needs-ocr'
    | 'needs-review'
    | 'verified'
    | 'complete';
  source_type?:
    | 'official-html'
    | 'official-pdf'
    | 'official-docx'
    | 'uploaded-file'
    | 'secondary-source'
    | 'manual'
    | 'unknown';
  source_file_hash?: string | null;
  extraction_method?: string | null;
  extraction_confidence?: number | null;
  quality_score?: number | null;
  quality_status?: 'complete' | 'partial' | 'invalid' | 'unknown';
  quality_warnings?: string[];
  search_vector?: unknown;
  // Granular 4-Dimensional Verification Statuses
  metadata_verification_status?: 'verified' | 'unverified' | 'needs_review';
  content_verification_status?: 'verified' | 'unverified' | 'missing' | 'needs_ocr' | 'partial';
  source_verification_status?: 'verified' | 'stored_file' | 'stored_url' | 'unverified' | 'none';
  relationship_verification_status?: 'verified' | 'unverified' | 'pending';
  metadataVerificationStatus?: 'verified' | 'unverified' | 'needs_review';
  contentVerificationStatus?: 'verified' | 'unverified' | 'missing' | 'needs_ocr' | 'partial';
  sourceVerificationStatus?: 'verified' | 'stored_file' | 'stored_url' | 'unverified' | 'none';
  relationshipVerificationStatus?: 'verified' | 'unverified' | 'pending';
  verified_by?: string | null;
  verified_at?: string | null;
  // AI-generated summaries
  summary_main: string | null;
  summary_new_points: string | null;
  summary_affected_parties: string | null;
  summary_accounting_impact: string | null;
  summary_audit_impact: string | null;
  summary_actions_needed: string | null;
  summary_is_ai_generated: boolean;
  official_source_url: string | null;
  is_deleted: boolean;
  is_published: boolean;
  review_status: ReviewStatus;
  view_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed/joined fields
  user_reading_status?: UserReadingStatus | null;
  is_bookmarked?: boolean;
  is_new?: boolean; // new since user's last visit
  files?: DocumentFile[];
  categories?: Category[];
  relations_as_source?: DocumentRelation[];
  relations_as_target?: DocumentRelation[];
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  change_description: string | null;
  changed_by: string | null;
  created_at: string;
  changed_by_profile?: Profile;
}

export interface DocumentFile {
  id: string;
  document_id: string;
  file_type: FileType;
  file_url: string;
  file_size: number | null;
  original_filename: string | null;
  is_primary: boolean;
  version: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentCategoryLink {
  id: string;
  document_id: string;
  category_id: string;
  is_primary: boolean;
}

export interface DocumentRelation {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relation_type: RelationType;
  notes: string | null;
  created_at: string;
  source_document?: LegalDocument;
  target_document?: LegalDocument;
}

export interface UserReadingStatus {
  id: string;
  user_id: string;
  document_id: string;
  status: ReadingStatus;
  last_read_at: string | null;
  last_page: number;
  read_percentage: number;
  marked_read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  document_id: string;
  created_at: string;
  document?: LegalDocument;
}

export interface Note {
  id: string;
  user_id: string;
  document_id: string;
  content: string;
  page_number: number | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface DocumentTagLink {
  id: string;
  user_id: string;
  document_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'new_document' | 'updated_document' | 'system';
  document_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PinnedCategory {
  id: string;
  user_id: string;
  category_id: string;
  order_index: number;
  created_at: string;
}

// UI-specific types
export interface DocumentListItem {
  id: string;
  title: string;
  document_number: string | null;
  document_type: DocumentType;
  issuing_body: string | null;
  issued_date: string | null;
  effective_date: string | null;
  status: DocumentStatus;
  is_published: boolean;
  updated_at: string;
  user_reading_status?: UserReadingStatus | null;
  is_bookmarked?: boolean;
  is_new?: boolean;
  has_file?: boolean;
}

export interface SearchResult {
  id: string;
  title: string;
  document_number: string | null;
  document_type: DocumentType;
  status: DocumentStatus;
  snippet: string;
  rank: number;
}

export type EffectiveStatusType =
  | 'active'
  | 'upcoming'
  | 'partial'
  | 'partially_expired'
  | 'expired'
  | 'unknown';

export type MatchLocationType =
  | 'number'
  | 'title'
  | 'content'
  | 'note'
  | 'topic'
  | 'document-number'
  | 'article'
  | 'chapter'
  | 'appendix'
  | 'clause';

export interface HighlightSegment {
  text: string;
  isHighlight: boolean;
  highlightLevel?: 'exact' | 'partial';
}

export interface SearchResultViewModel {
  id: string;
  documentId: string;
  documentType: string;
  documentTypeLabel: string;
  documentTypeColor: string;
  documentNumber: string;
  title: string;
  displayTitle?: string;
  issuer?: string;
  effectiveStatus: EffectiveStatusType;
  effectiveStatusLabel: string;
  effectiveStatusBadgeClass: string;
  effectiveStatusTooltip: string;
  effectiveDate?: string;
  issuedDate?: string;
  matchType: MatchLocationType;
  matchScope?: 'document' | 'provision';
  matchTypeLabel?: string;
  locationLabel?: string;
  targetNodeId?: string;
  targetAnchor?: string;
  actionLabel?: string;
  snippet: string;
  otherMatchesCount?: number;
  highlightedRanges?: Array<{ start: number; end: number }>;
  score?: number;
  officialSourceUrl?: string | null;
}

export type SearchSortOption = 'relevance' | 'issued_date' | 'effective_date' | 'updated_at';

export interface DocumentFilters {
  status?: DocumentStatus | 'all';
  document_type?: DocumentType | 'all';
  reading_status?: ReadingStatus | 'bookmarked' | 'new' | 'all';
  category_id?: string;
  year?: number;
  search?: string;
}

export interface DocumentSort {
  field: 'updated_at' | 'issued_date' | 'effective_date' | 'document_number';
  direction: 'asc' | 'desc';
}

// ─── Reader: Table of Contents ───────────────────────────────────────────────

export interface TocItem {
  id: string;           // stable: "toc-ch-0", "toc-art-7"
  targetId?: string;    // exact DOM id: "dieu-14", "chuong-3", "phu-luc-1"
  title: string;
  type: 'chapter' | 'article' | 'section' | 'appendix';
  level: number;        // 0 = chapter/part, 1 = section/article, 2+ = sub
  articleNumber?: string;  // "7", "7a" — numeric part of Điều X
  anchorText: string;   // exact text used to find in DOM
}

// ─── Reader: Panel Mode ───────────────────────────────────────────────────────
export type ReaderPanelMode = 'closed' | 'toc' | 'notes' | 'effects' | 'ai';
// ─── Reader: Legal Effects & Provisions ──────────────────────────────────────

export type LegalEffectCategory = 'substantive_change' | 'application_support';

export type LegalEffectType =
  | 'amends'            // Sửa đổi
  | 'supplements'       // Bổ sung
  | 'replaces'          // Thay thế
  | 'repeals'           // Bãi bỏ toàn bộ
  | 'partially_repeals' // Bãi bỏ một phần
  | 'suspends'          // Đình chỉ / Tạm ngưng
  | 'extends'           // Gia hạn
  | 'corrects'          // Đính chính
  | 'guides'            // Hướng dẫn thi hành
  | 'implements'        // Quy định chi tiết
  | 'references';       // Dẫn chiếu

export interface DocumentProvision {
  id: string;
  documentId: string;
  parentProvisionId?: string;
  provisionType: 'chapter' | 'section' | 'article' | 'clause' | 'point' | 'appendix';
  numberLabel: string;
  headingTitle?: string;
  normalizedPath: string;
  stableKey: string;
  orderIndex: number;
  contentText: string;
  contentHash: string;
}

export interface ProvisionAnchor {
  id: string;
  legalEffectId: string;
  targetProvisionId: string;
  exactText: string;
  prefixText?: string;
  suffixText?: string;
  normalizedStartOffset?: number;
  normalizedEndOffset?: number;
  contentHash: string;
  resolutionStatus: 'resolved' | 'orphaned' | 'ambiguous';
}

export interface LegalEffect {
  id: string;
  category: LegalEffectCategory;
  effectType: LegalEffectType;
  sourceDocumentId: string;
  sourceDocumentNumber?: string;
  sourceDocumentTitle?: string;
  targetDocumentId: string;
  targetDocumentNumber?: string;
  targetProvisionId?: string;
  targetProvisionLabel?: string;
  clauseLabel?: string;
  pointLabel?: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  impactScope: 'whole_document' | 'whole_provision' | 'text_range';
  legalCitation: string;
  sourceProvisionCitation?: string;
  sourceExcerpt: string;
  explanationSummary?: string;
  sourceUrl?: string;
  anchor?: ProvisionAnchor;
  previousContent?: string;
  replacementContent?: string;
  reviewStatus: 'verified' | 'pending' | 'rejected';
  confidence: number;
}
// ─── Reader: Annotations ─────────────────────────────────────────────────────

export type AnnotationColor = 'yellow' | 'green' | 'pink' | 'blue' | 'purple';
export type AnnotationAnchorStatus = 'active' | 'reanchored' | 'orphaned' | 'deleted';

export interface AnnotationAnchor {
  exactText: string;
  prefix?: string;
  suffix?: string;
  startOffset?: number;
  endOffset?: number;
  contentVersion: string;
  contentHash?: string;
}

export interface DocumentAnnotation {
  id: string;
  documentId: string;
  userId: string;
  organizationId?: string;
  nodeId?: string;
  anchor: AnnotationAnchor;
  type: 'highlight' | 'note';
  color?: AnnotationColor;
  noteContent?: string;
  visibility: 'private' | 'team' | 'organization';
  anchorStatus: AnnotationAnchorStatus;
  createdAt: string;
  updatedAt: string;
}
export * from '@/lib/document-import/types';
export * from '@/lib/quality/content-validator';


