export type NodeType =
  | 'phan'
  | 'chuong'
  | 'muc'
  | 'tieu_muc'
  | 'dieu'
  | 'khoan'
  | 'diem'
  | 'tiet'
  | 'doan'
  | 'phu_luc'
  | 'bieu_mau';

export interface DocumentNode {
  id: string;              // Node ID: e.g. doc_123_2020.art_19.cl_1.pt_b
  document_id: string;     // Foreign key to LegalDocument
  node_type: NodeType;     // Type of node
  order_index: number;     // Display order index
  number_label: string;    // e.g. "Điều 19", "Khoản 1", "Điểm b", "Chương II"
  title?: string;          // Heading text e.g. "Xử lý hóa đơn có sai sót"
  content: string;         // Full text of this node
  parent_id?: string;      // ID of parent node
  content_hash: string;    // SHA-256 hash of content
  path: string;            // e.g. "Chương II > Điều 19 > Khoản 1 > Điểm b"
  children?: DocumentNode[];
}

export type LegalRelationshipType =
  | 'amends'         // Sửa đổi
  | 'supplements'    // Bổ sung
  | 'replaces'       // Thay thế
  | 'repeals'        // Bãi bỏ
  | 'suspends'       // Đình chỉ / Tạm ngưng
  | 'guides'         // Hướng dẫn thi hành
  | 'details'        // Quy định chi tiết
  | 'consolidates'   // Hợp nhất
  | 'corrects'       // Đính chính
  | 'cites'          // Dẫn chiếu
  | 'can_cu'         // Căn cứ ban hành
  | 'related';       // Liên quan nghiệp vụ

export type DetectionMethod =
  | 'rule'           // Deterministic rule engine regex match
  | 'metadata'       // Issuance metadata header
  | 'official-source'// Published concordance table
  | 'ai'             // LLM inference
  | 'manual';        // Human entered

export type ReviewStatus =
  | 'pending'
  | 'verified'
  | 'rejected'
  | 'needs-more-information';

export interface LegalRelationship {
  id: string;
  source_document_id: string;
  target_document_id: string;
  relationship_type: LegalRelationshipType;
  source_node_id?: string;
  target_node_id?: string;
  effective_from?: string;
  effective_to?: string;
  extracted_instruction: string;
  evidence_text: string;
  evidence_location: string;
  detection_method: DetectionMethod;
  confidence: number;            // 0.0 to 1.0
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;

  // Populated fields
  source_document_title?: string | null;
  source_document_number?: string | null;
  target_document_title?: string | null;
  target_document_number?: string | null;
}

export type ChangeOperation =
  | 'replace_node'
  | 'replace_phrase'
  | 'insert_before'
  | 'insert_after'
  | 'append'
  | 'delete'
  | 'rename'
  | 'renumber'
  | 'suspend'
  | 'restore';

export interface LegalChange {
  id: string;
  relationship_id?: string;
  amending_document_id: string;
  target_document_id: string;
  target_node_id?: string;
  operation: ChangeOperation;
  old_content?: string;
  new_content?: string;
  anchor_before?: string;
  anchor_after?: string;
  effective_from: string;
  effective_to?: string;
  evidence_text: string;
  evidence_location: string;
  confidence: number;
  review_status: ReviewStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}
