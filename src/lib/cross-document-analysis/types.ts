import type { LegalDocument, DocumentStatus, RelationType } from '@/types';

export type AnalysisObjective =
  | 'overview' // Tổng quan điểm giống và khác
  | 'applicable_rule' // Văn bản nào đang áp dụng (Thứ bậc & Phạm vi)
  | 'amendment_replacement' // Nội dung sửa đổi hoặc bị thay thế
  | 'scope_conditions' // Điều kiện, đối tượng và phạm vi áp dụng
  | 'accounting_tax_impact' // Tác động đến kế toán, thuế hoặc kiểm toán
  | 'conflicts_crosscheck' // Mâu thuẫn và điểm cần đối chiếu
  | 'custom_question'; // Đặt câu hỏi cụ thể

export interface AnalysisObjectiveOption {
  id: AnalysisObjective;
  label: string;
  description: string;
  iconName: string;
}

export type SignalCategory = 'verified_relation' | 'rule_detected' | 'ai_suggested';

export interface DocumentSuggestion {
  document: LegalDocument;
  reason: string;
  signalCategory: SignalCategory;
  priority: number; // 1 (highest) to 8 (lowest)
  isVerified: boolean;
  relationType?: RelationType;
  matchedCitation?: string;
}

export interface ExactDiffVerificationResult {
  isEligibleForExactDiff: boolean;
  reason: string;
  legalBasis?: string;
  relationType?: RelationType;
  sourceDoc?: LegalDocument;
  amendingDoc?: LegalDocument;
  amendedArticles?: string[];
}

export interface DocumentRoleItem {
  documentId: string;
  documentNumber: string;
  title: string;
  role: string;
  scope: string;
  legalStatus: string;
  hierarchyLevel?: string;
}

export interface ComparisonMatrixRow {
  topic: string;
  docValues: Record<string, string>; // key: documentId -> text summary for that doc
  remarks: string;
  confidence: 'fact' | 'inference' | 'uncertainty';
}

export interface PracticalImpactSection {
  affectedParties: string[];
  conditionsToMeet: string[];
  applicationTimeline: string;
  requiredDossier: string[];
  complianceRisks: string[];
}

export interface AnalysisUncertainty {
  type: 'unverified_relation' | 'missing_source' | 'expired_document' | 'unclear_effective_date' | 'check_needed';
  title: string;
  description: string;
  suggestedAction?: string;
}

export interface CrossDocCitation {
  id: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  articleNumber?: string; // e.g. "Điều 9"
  clauseNumber?: string; // e.g. "Khoản 1"
  pointLetter?: string; // e.g. "Điểm c"
  snippet: string;
  targetNodeId?: string;
  fullCitationText: string;
}

export interface CrossDocAnalysisResult {
  id: string;
  title: string;
  createdAt: string;
  primaryDocId: string;
  selectedDocIds: string[];
  selectedDocuments: Array<{
    id: string;
    document_number: string | null;
    title: string;
    status: DocumentStatus;
    effective_date: string | null;
    issuing_body: string | null;
    document_type: string;
    contentVersionHash?: string;
  }>;
  objective: AnalysisObjective;
  customQuestion?: string;
  model: string;
  promptVersion: string;
  // A. KẾT LUẬN NGẮN
  executiveConclusion: string;
  // B. VAI TRÒ CỦA TỪNG VĂN BẢN
  documentRoles: DocumentRoleItem[];
  // C. ĐIỂM GIỐNG VÀ KHÁC
  comparisonMatrix: ComparisonMatrixRow[];
  // D. TÁC ĐỘNG THỰC TẾ
  practicalImpact: PracticalImpactSection;
  // E. ĐIỂM CHƯA CHẮC CHẮN
  uncertaintiesAndWarnings: AnalysisUncertainty[];
  // F. NGUỒN DẪN CHIẾU
  citations: CrossDocCitation[];
  isStale?: boolean;
  suggestedFollowUps?: string[];
  source?: 'gemini' | 'local_rag';
}

export interface StoredAnalysisSession {
  id: string;
  title: string;
  savedAt: string;
  primaryDocId: string;
  docIds: string[];
  objective: AnalysisObjective;
  customQuestion?: string;
  result: CrossDocAnalysisResult;
  docVersionHashes: Record<string, string>; // docId -> hash
}
