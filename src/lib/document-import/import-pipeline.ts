import {
  ImportedDocument,
  ImportOptions,
  IMPORT_CONFIG,
} from './types';
import { validateFile, sanitizeFileName } from './file-validator';
import { extractDocumentContent } from './text-extractor';
import { restoreVietnameseLegalText } from './vietnamese-normalizer';
import { detectLegalDocumentMetadata } from './legal-metadata-detector';
import { checkDocumentDuplicates } from './duplicate-detector';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';

export type ProgressCallback = (docId: string, progress: number, status: string) => void;

/**
 * Processes a single uploaded file through the entire pipeline:
 * Validation -> Extraction -> Encoding & Clean -> Diacritic restoration & Change tracking -> Metadata & Relations -> Duplicate Check -> Ready for Review.
 */
export async function processUploadedFile(
  file: { name: string; size: number; type?: string },
  buffer: Uint8Array,
  options: ImportOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<ImportedDocument> {
  const docId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const sanitizedName = sanitizeFileName(file.name);
  const now = new Date().toISOString();

  onProgress?.(10, 'Đang kiểm tra tính hợp lệ & chữ ký tệp...');

  // 1. Validation & Magic bytes check
  const validation = await validateFile(
    file,
    buffer,
    options.maxFileSize || IMPORT_CONFIG.MAX_FILE_SIZE
  );

  if (!validation.isValid || !validation.fileExtension) {
    return {
      id: docId,
      originalFileName: sanitizedName,
      originalMimeType: validation.mimeType,
      originalSize: file.size,
      originalHash: validation.hash,
      originalStorageKey: `imports/${docId}/${sanitizedName}`,
      fileExtension: 'docx',
      fileBuffer: buffer,
      extractionStatus: 'failed',
      statusMessage: validation.error || 'Tệp không hợp lệ.',
      warnings: [validation.error || 'Tệp không hợp lệ.'],
      createdBy: 'Chuyên viên Pháp chế',
      createdAt: now,
      updatedAt: now,
    };
  }

  const fileExt = validation.fileExtension;

  // 2. Text & Structure Extraction
  onProgress?.(30, 'Đang đọc và trích xuất nội dung văn bản...');
  let extracted;
  try {
    extracted = await extractDocumentContent(buffer, fileExt);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      id: docId,
      originalFileName: sanitizedName,
      originalMimeType: validation.mimeType,
      originalSize: file.size,
      originalHash: validation.hash,
      originalStorageKey: `imports/${docId}/${sanitizedName}`,
      fileExtension: fileExt,
      fileBuffer: buffer,
      extractionStatus: 'failed',
      statusMessage: `Lỗi trích xuất: ${errorMsg}`,
      warnings: [`Lỗi trích xuất: ${errorMsg}`],
      createdBy: 'Chuyên viên Pháp chế',
      createdAt: now,
      updatedAt: now,
    };
  }

  onProgress?.(60, 'Đang chuẩn hóa tiếng Việt & khôi phục dấu chuyên ngành...');

  // 3. Vietnamese Diacritic Restoration & Spelling Correction
  const { normalizedText, changes, overallConfidence } = restoreVietnameseLegalText(
    extracted.cleanText,
    docId,
    'Nội dung chính'
  );

  onProgress?.(80, 'Đang nhận diện metadata, số hiệu & văn bản viện dẫn...');

  // 4. Legal Metadata Detection & Conflict Analysis
  const metadata = detectLegalDocumentMetadata(normalizedText, sanitizedName);

  // 5. Duplicate Detection
  onProgress?.(90, 'Đang kiểm tra trùng lặp trong thư viện...');
  const duplicateInfo = checkDocumentDuplicates(
    {
      hash: validation.hash,
      documentNumber: metadata.documentNumber,
      documentType: metadata.documentType,
      year: metadata.year,
      title: metadata.title,
      issuingBody: metadata.issuingBody,
      fileExtension: fileExt,
    },
    DEMO_DOCUMENTS
  );

  const allWarnings = [
    ...extracted.warnings,
    ...metadata.warnings,
    ...(duplicateInfo.isDuplicate ? [duplicateInfo.details] : []),
  ];

  const hasUncertainties =
    metadata.conflicts.length > 0 ||
    !metadata.hasOfficialSymbol ||
    duplicateInfo.isDuplicate ||
    allWarnings.length > 0;

  const extractionStatus = duplicateInfo.isDuplicate
    ? 'duplicate'
    : hasUncertainties
    ? 'review'
    : 'review'; // Always route to review before committing to library

  onProgress?.(100, duplicateInfo.isDuplicate ? 'Trùng văn bản' : 'Đã sẵn sàng kiểm duyệt');

  return {
    id: docId,
    originalFileName: sanitizedName,
    originalMimeType: validation.mimeType,
    originalSize: file.size,
    originalHash: validation.hash,
    originalStorageKey: `imports/${docId}/${sanitizedName}`,
    fileExtension: fileExt,
    fileBuffer: buffer,

    extractionStatus,
    statusMessage: duplicateInfo.isDuplicate
      ? duplicateInfo.details
      : 'Trích xuất và nhận diện thành công. Đang chờ kiểm duyệt.',
    progress: 100,

    rawText: extracted.rawText,
    cleanText: extracted.cleanText,
    normalizedText,
    htmlContent: extracted.htmlContent,

    detectedDocumentType: metadata.documentType,
    detectedDocumentNumber: metadata.documentNumber || undefined,
    detectedYear: metadata.year || undefined,
    detectedIssuingBody: metadata.issuingBody || undefined,
    detectedSigner: metadata.signer || undefined,
    detectedSignerTitle: metadata.signerTitle || undefined,
    detectedIssuedDate: metadata.issuedDate || undefined,
    detectedEffectiveDate: metadata.effectiveDate || undefined,
    detectedSummary: metadata.summary || undefined,
    detectedTitle: metadata.title,
    standardTitle: metadata.standardTitle,
    suggestedFileName: metadata.suggestedFileName,

    referencedDocuments: metadata.referencedDocuments,
    conflicts: metadata.conflicts,
    changes,
    duplicateInfo,

    extractionMethod: extracted.extractionMethod,
    extractionConfidence: extracted.extractionConfidence,
    normalizationConfidence: overallConfidence,

    warnings: allWarnings,
    createdBy: 'Chuyên viên Pháp chế',
    createdAt: now,
    updatedAt: now,
  };
}
