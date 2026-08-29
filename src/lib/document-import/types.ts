export type ExtractionStatus =
  | 'pending'
  | 'uploading'
  | 'extracting'
  | 'ocr'
  | 'normalizing'
  | 'review'
  | 'approved'
  | 'failed'
  | 'duplicate';

export type ExtractionMethod = 'docx' | 'doc-conversion' | 'pdf-text' | 'ocr';

export type NormalizationChangeType =
  | 'encoding'
  | 'whitespace'
  | 'line-break'
  | 'diacritic'
  | 'spelling'
  | 'ocr'
  | 'metadata';

export type ChangeStatus = 'pending' | 'accepted' | 'rejected';

export interface NormalizationChange {
  id: string;
  importedDocumentId: string;
  location: string;
  originalText: string;
  suggestedText: string;
  changeType: NormalizationChangeType;
  confidence: number;
  reason: string;
  status: ChangeStatus;
}

export type DuplicateType =
  | 'exact_duplicate'
  | 'alternative_format'
  | 'same_number_different_body'
  | 'new_document';

export type DuplicateResolution =
  | 'skip'
  | 'attach_as_source'
  | 'replace_document'
  | 'import_separate';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateType: DuplicateType;
  matchedDocumentId?: string;
  matchedDocumentNumber?: string;
  matchedDocumentTitle?: string;
  matchConfidence: number;
  details: string;
  resolution?: DuplicateResolution;
}

export interface ReferencedDocumentItem {
  id?: string;
  documentType?: string;
  documentNumber?: string;
  title?: string;
  relationType: 'guides' | 'details' | 'replaces' | 'amends' | 'cites' | 'related';
  evidence?: string;
}

export interface MetadataConflict {
  field: string;
  fileValue: string;
  contentValue: string;
  suggestedValue: string;
  reason: string;
}

export interface DetectedLegalMetadata {
  documentType: string;
  documentNumber: string | null;
  year: number | null;
  issuingBody: string | null;
  issuedDate: string | null;
  effectiveDate: string | null;
  signer: string | null;
  signerTitle: string | null;
  title: string;
  standardTitle: string;
  suggestedFileName: string;
  summary: string | null;
  hasOfficialSymbol: boolean;
  referencedDocuments: ReferencedDocumentItem[];
  conflicts: MetadataConflict[];
  warnings: string[];
  confidence: number;
}

export interface ImportedDocument {
  id: string;
  originalFileName: string;
  originalMimeType: string;
  originalSize: number;
  originalHash: string;
  originalStorageKey: string;
  fileExtension: 'doc' | 'docx' | 'pdf';

  fileBuffer?: Uint8Array;
  fileUrl?: string;

  extractionStatus: ExtractionStatus;
  statusMessage?: string;
  progress?: number;

  rawText?: string;
  cleanText?: string;
  normalizedText?: string;
  htmlContent?: string;

  detectedDocumentType?: string;
  detectedDocumentNumber?: string;
  detectedYear?: number;
  detectedIssuingBody?: string;
  detectedSigner?: string;
  detectedSignerTitle?: string;
  detectedIssuedDate?: string;
  detectedEffectiveDate?: string;
  detectedSummary?: string;
  detectedTitle?: string;
  standardTitle?: string;
  suggestedFileName?: string;

  category_id?: string;

  referencedDocuments?: ReferencedDocumentItem[];
  conflicts?: MetadataConflict[];
  changes?: NormalizationChange[];
  duplicateInfo?: DuplicateCheckResult;

  extractionMethod?: ExtractionMethod;
  extractionConfidence?: number;
  normalizationConfidence?: number;

  warnings: string[];
  createdBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportOptions {
  enableAiCorrection?: boolean;
  enableOcrFallback?: boolean;
  maxFileSize?: number; // in bytes
  preserveDiacriticsInFileName?: boolean;
}

export const IMPORT_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  SUPPORTED_EXTENSIONS: ['.doc', '.docx', '.pdf'],
  SUPPORTED_MIME_TYPES: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'application/x-pdf',
    'application/octet-stream',
  ],
  MAGIC_BYTES: {
    PDF: [0x25, 0x50, 0x44, 0x46], // %PDF
    DOCX_ZIP: [0x50, 0x4b, 0x03, 0x04], // PK..
    DOC_OLE: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], // OLE CFBF
  },
};
