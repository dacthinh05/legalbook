import { DuplicateCheckResult } from './types';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import type { LegalDocument } from '@/types';

export function normalizeDocNumber(num: string | null | undefined): string {
  if (!num) return '';
  return num
    .trim()
    .toUpperCase()
    .replace(/^(LUẬT|BỘ LUẬT|NGHỊ ĐỊNH|THÔNG TƯ|QUYẾT ĐỊNH|CÔNG VĂN|VĂN BẢN HỢP NHẤT|NĐ|TT|QĐ|CV|VBHN)\s*(SỐ)?\s*/i, '')
    .replace(/[\/\-\.]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Checks for duplicates against the existing library of documents.
 */
export function checkDocumentDuplicates(
  newDoc: {
    hash?: string;
    documentNumber?: string | null;
    documentType?: string;
    year?: number | null;
    title?: string;
    issuingBody?: string | null;
    fileExtension?: string;
  },
  existingDocs: Partial<LegalDocument>[] = DEMO_DOCUMENTS
): DuplicateCheckResult {
  const normNewNum = normalizeDocNumber(newDoc.documentNumber);

  for (const doc of existingDocs) {
    // 1. Check matching normalized number
    const normExistingNum = normalizeDocNumber(doc.document_number);
    if (normNewNum && normExistingNum && normNewNum === normExistingNum) {
      // Check if existing doc has a different file type
      const hasOtherFileType = doc.files?.some((f) => {
        const ext = f.original_filename?.split('.').pop()?.toLowerCase();
        return ext && ext !== newDoc.fileExtension;
      });

      if (hasOtherFileType) {
        return {
          isDuplicate: true,
          duplicateType: 'alternative_format',
          matchedDocumentId: doc.id,
          matchedDocumentNumber: doc.document_number || undefined,
          matchedDocumentTitle: doc.title,
          matchConfidence: 0.96,
          details: `Trùng số hiệu "${doc.document_number}" với văn bản đã có trong thư viện (${doc.title}). Có thể là bản khác (Word/PDF).`,
        };
      }

      // Check if issuing body differs
      if (
        newDoc.issuingBody &&
        doc.issuing_body &&
        newDoc.issuingBody.toLowerCase() !== doc.issuing_body.toLowerCase()
      ) {
        return {
          isDuplicate: true,
          duplicateType: 'same_number_different_body',
          matchedDocumentId: doc.id,
          matchedDocumentNumber: doc.document_number || undefined,
          matchedDocumentTitle: doc.title,
          matchConfidence: 0.85,
          details: `Cùng số hiệu "${doc.document_number}" nhưng khác cơ quan ban hành: "${newDoc.issuingBody}" vs "${doc.issuing_body}".`,
        };
      }

      return {
        isDuplicate: true,
        duplicateType: 'exact_duplicate',
        matchedDocumentId: doc.id,
        matchedDocumentNumber: doc.document_number || undefined,
        matchedDocumentTitle: doc.title,
        matchConfidence: 0.98,
        details: `Văn bản số "${doc.document_number}" đã tồn tại trong thư viện với tiêu đề: "${doc.title}".`,
      };
    }

    // 2. Check title similarity
    if (newDoc.title && doc.title) {
      const cleanNew = newDoc.title.toLowerCase().trim();
      const cleanExist = doc.title.toLowerCase().trim();
      if (cleanNew === cleanExist || (cleanNew.length > 20 && cleanExist.includes(cleanNew))) {
        return {
          isDuplicate: true,
          duplicateType: 'exact_duplicate',
          matchedDocumentId: doc.id,
          matchedDocumentNumber: doc.document_number || undefined,
          matchedDocumentTitle: doc.title,
          matchConfidence: 0.90,
          details: `Phát hiện văn bản có tiêu đề tương tự đã có trong thư viện: "${doc.title}".`,
        };
      }
    }
  }

  return {
    isDuplicate: false,
    duplicateType: 'new_document',
    matchConfidence: 1.0,
    details: 'Văn bản mới, không phát hiện trùng lặp trong thư viện.',
  };
}
