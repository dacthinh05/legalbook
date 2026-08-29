import type { LegalDocument } from '@/types';
import type { ValidationConflict, VerificationField, ConflictSeverity } from './types';

/**
 * Normalizes strings for comparison by removing diacritics and excess whitespace
 */
export function normalizeText(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts date components if valid date string (YYYY-MM-DD or DD/MM/YYYY)
 */
export function parseDateString(dateStr: string | null | undefined): { day?: number; month?: number; year?: number } | null {
  if (!dateStr) return null;
  const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return { year: parseInt(isoMatch[1], 10), month: parseInt(isoMatch[2], 10), day: parseInt(isoMatch[3], 10) };
  }
  const vnMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (vnMatch) {
    return { day: parseInt(vnMatch[1], 10), month: parseInt(vnMatch[2], 10), year: parseInt(vnMatch[3], 10) };
  }
  return null;
}

/**
 * Detects conflicts and validation discrepancies for a legal document
 */
export function detectDocumentConflicts(
  doc: LegalDocument,
  fields: Record<string, VerificationField>,
  allDocs: LegalDocument[] = []
): ValidationConflict[] {
  const conflicts: ValidationConflict[] = [];

  // 1. Check Document Number conflict between metadata and OCR page 1
  const docNumberField = fields['document_number'];
  if (docNumberField) {
    if (!docNumberField.currentValue) {
      conflicts.push({
        id: 'err-missing-doc-number',
        fieldKey: 'document_number',
        severity: 'error',
        title: 'Thiếu số hiệu văn bản',
        message: 'Văn bản chưa có số hiệu hợp lệ. Cần xác định hoặc trích xuất từ trang đầu.',
        isResolved: false,
        isConfirmed: false,
      });
    } else if (
      docNumberField.detectedScanValue &&
      normalizeText(docNumberField.currentValue) !== normalizeText(docNumberField.detectedScanValue)
    ) {
      conflicts.push({
        id: 'err-doc-number-mismatch',
        fieldKey: 'document_number',
        severity: 'error',
        title: 'Mâu thuẫn số hiệu văn bản',
        message: `Số hiệu metadata (${docNumberField.currentValue}) khác số hiệu phát hiện trên scan (${docNumberField.detectedScanValue}).`,
        suggestedValues: [docNumberField.currentValue, docNumberField.detectedScanValue],
        sourceQuote: docNumberField.ocrSnippet || `Số: ${docNumberField.detectedScanValue}`,
        isResolved: false,
        isConfirmed: false,
      });
    }
  }

  // 2. Check Issued Date conflict between metadata and scan content
  const issuedDateField = fields['issued_date'];
  if (issuedDateField) {
    if (!issuedDateField.currentValue) {
      conflicts.push({
        id: 'warn-missing-issued-date',
        fieldKey: 'issued_date',
        severity: 'warning',
        title: 'Chưa xác định ngày ban hành',
        message: 'Văn bản chưa có ngày ban hành trong hệ thống.',
        isResolved: false,
        isConfirmed: false,
      });
    } else if (
      issuedDateField.detectedScanValue &&
      issuedDateField.currentValue !== issuedDateField.detectedScanValue
    ) {
      conflicts.push({
        id: 'warn-issued-date-mismatch',
        fieldKey: 'issued_date',
        severity: 'warning',
        title: 'Mâu thuẫn ngày ban hành',
        message: `Trích xuất: ${issuedDateField.currentValue}. Phát hiện trên bản scan: ${issuedDateField.detectedScanValue}. Mâu thuẫn giữa metadata và nội dung.`,
        suggestedValues: [issuedDateField.currentValue, issuedDateField.detectedScanValue],
        sourceQuote: issuedDateField.ocrSnippet || `ngày ... tháng ... năm ...`,
        isResolved: false,
        isConfirmed: false,
      });
    }
  }

  // 3. Issuing body mismatch with header
  const issuingBodyField = fields['issuing_body'];
  if (issuingBodyField) {
    if (!issuingBodyField.currentValue) {
      conflicts.push({
        id: 'err-missing-issuing-body',
        fieldKey: 'issuing_body',
        severity: 'error',
        title: 'Thiếu cơ quan ban hành',
        message: 'Chưa có thông tin cơ quan ban hành văn bản.',
        isResolved: false,
        isConfirmed: false,
      });
    } else if (
      issuingBodyField.detectedScanValue &&
      normalizeText(issuingBodyField.currentValue) !== normalizeText(issuingBodyField.detectedScanValue)
    ) {
      conflicts.push({
        id: 'warn-issuing-body-mismatch',
        fieldKey: 'issuing_body',
        severity: 'warning',
        title: 'Cơ quan không khớp phần đầu văn bản',
        message: `Metadata ghi nhận '${issuingBodyField.currentValue}' nhưng scan đầu trang ghi '${issuingBodyField.detectedScanValue}'.`,
        suggestedValues: [issuingBodyField.currentValue, issuingBodyField.detectedScanValue],
        isResolved: false,
        isConfirmed: false,
      });
    }
  }

  // 4. Document Type mismatch with title
  const docTypeField = fields['document_type'];
  const titleField = fields['title'];
  if (docTypeField && titleField && titleField.currentValue) {
    const normTitle = normalizeText(titleField.currentValue);
    const typeValue = docTypeField.currentValue;
    let expectedType = '';

    if (normTitle.startsWith('cong van') || normTitle.includes('ve viec') || normTitle.includes('huong dan ve')) {
      expectedType = 'cong_van';
    } else if (normTitle.startsWith('nghi dinh')) {
      expectedType = 'nghi_dinh';
    } else if (normTitle.startsWith('thong tu')) {
      expectedType = 'thong_tu';
    } else if (normTitle.startsWith('quyet dinh')) {
      expectedType = 'quyet_dinh';
    } else if (normTitle.startsWith('luat')) {
      expectedType = 'luat';
    }

    if (expectedType && typeValue && expectedType !== typeValue) {
      conflicts.push({
        id: 'warn-doc-type-mismatch',
        fieldKey: 'document_type',
        severity: 'warning',
        title: 'Loại văn bản không khớp tiêu đề',
        message: `Tiêu đề có dấu hiệu là '${expectedType.replace('_', ' ')}' nhưng loại đang chọn là '${typeValue.replace('_', ' ')}'.`,
        suggestedValues: [expectedType, typeValue],
        isResolved: false,
        isConfirmed: false,
      });
    }
  }

  // 5. Missing Signer or Position
  const signerField = fields['signer'];
  if (signerField && !signerField.currentValue) {
    conflicts.push({
      id: 'info-missing-signer',
      fieldKey: 'signer',
      severity: 'info',
      title: 'Thiếu người ký',
      message: 'Văn bản chưa có người ký xác định ở phần chữ ký cuối trang.',
      isResolved: false,
      isConfirmed: false,
    });
  }

  // 6. Low OCR Confidence (< 85%)
  Object.values(fields).forEach((f) => {
    if (f.confidence < 0.85 && f.status === 'unresolved') {
      conflicts.push({
        id: `warn-low-confidence-${f.key}`,
        fieldKey: f.key,
        severity: 'warning',
        title: `Độ tin cậy OCR thấp (${Math.round(f.confidence * 100)}%)`,
        message: `Trường '${f.label}' có độ tin cậy trích xuất thấp. Vui lòng đối chiếu với bản scan gốc.`,
        isResolved: false,
        isConfirmed: false,
      });
    }
  });

  // 7. Source file unreachable / missing
  const sourceFileField = fields['source_file'];
  if (!sourceFileField || !sourceFileField.currentValue) {
    conflicts.push({
      id: 'warn-missing-source-file',
      fieldKey: 'source_file',
      severity: 'warning',
      title: 'Thiếu file scan gốc',
      message: 'Chưa có file PDF/ảnh scan đính kèm để đối chiếu trực tiếp.',
      isResolved: false,
      isConfirmed: false,
    });
  }

  // 8. Extracted content too short (< 100 characters / words)
  const ocrContentField = fields['ocr_content'];
  if (ocrContentField && ocrContentField.currentValue) {
    const plainLength = ocrContentField.currentValue.replace(/<[^>]+>/g, '').trim().length;
    if (plainLength < 100) {
      conflicts.push({
        id: 'err-content-too-short',
        fieldKey: 'ocr_content',
        severity: 'error',
        title: 'Nội dung trích xuất quá ngắn',
        message: `Nội dung OCR chỉ có ${plainLength} ký tự, có khả năng lỗi trích xuất hoặc scan hỏng.`,
        isResolved: false,
        isConfirmed: false,
      });
    }
  } else {
    conflicts.push({
      id: 'err-no-content',
      fieldKey: 'ocr_content',
      severity: 'error',
      title: 'Chưa có nội dung trích xuất',
      message: 'Văn bản không có dữ liệu toàn văn OCR để đối chiếu.',
      isResolved: false,
      isConfirmed: false,
    });
  }

  // 9. Check duplicate document number in system
  if (docNumberField?.currentValue && allDocs.length > 0) {
    const duplicates = allDocs.filter(
      (d) => d.id !== doc.id && normalizeText(d.document_number) === normalizeText(docNumberField.currentValue)
    );
    if (duplicates.length > 0) {
      conflicts.push({
        id: 'warn-duplicate-doc-number',
        fieldKey: 'document_number',
        severity: 'warning',
        title: 'Trùng số hiệu với tài liệu khác',
        message: `Số hiệu '${docNumberField.currentValue}' đã tồn tại trong hệ thống (ID: ${duplicates[0].id.slice(0, 8)}...).`,
        suggestedValues: [docNumberField.currentValue],
        isResolved: false,
        isConfirmed: false,
      });
    }
  }

  return conflicts;
}

/**
 * Calculates overall confidence score (0 - 100)
 */
export function calculateOverallConfidence(
  fields: Record<string, VerificationField>,
  conflicts: ValidationConflict[]
): number {
  const fieldList = Object.values(fields);
  if (fieldList.length === 0) return 0;

  const sumConfidence = fieldList.reduce((acc, f) => acc + f.confidence, 0);
  const avgConfidence = (sumConfidence / fieldList.length) * 100;

  // Penalize for unresolved conflicts
  const errorPenalty = conflicts.filter((c) => c.severity === 'error' && !c.isResolved).length * 15;
  const warningPenalty = conflicts.filter((c) => c.severity === 'warning' && !c.isResolved && !c.isConfirmed).length * 5;

  const finalScore = Math.max(10, Math.min(100, Math.round(avgConfidence - errorPenalty - warningPenalty)));
  return finalScore;
}
