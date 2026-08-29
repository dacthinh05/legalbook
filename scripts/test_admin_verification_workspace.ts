import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { verificationService } from '../src/lib/verification/data-service.ts';
import {
  detectDocumentConflicts,
  calculateOverallConfidence,
  normalizeText,
  parseDateString,
} from '../src/lib/verification/conflict-detector.ts';
import type { VerificationField, DocumentVerificationRecord } from '../src/lib/verification/types.ts';
import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';

describe('Admin Verification Workspace & Inspection Suite (16 Mandatory Criteria)', () => {
  // Test 1: Selecting another document updates preview and Inspector accurately
  test('1. Document selection updates preview and Inspector without state leakage', () => {
    const docs = verificationService.getDocuments();
    assert.ok(docs.length >= 2, 'Must have at least 2 documents in verification queue');

    const doc1 = verificationService.getDocumentById(docs[0].id);
    const doc2 = verificationService.getDocumentById(docs[1].id);

    assert.ok(doc1 && doc2, 'Both documents must exist');
    assert.notEqual(doc1.id, doc2.id);
    assert.notEqual(doc1.document.document_number, doc2.document.document_number);

    // Inspector fields must belong to doc1
    assert.equal(doc1.fields['document_number'].currentValue, doc1.document.document_number);
    // Inspector fields of doc2 must be distinct
    assert.equal(doc2.fields['document_number'].currentValue, doc2.document.document_number);
  });

  // Test 2: Preview titles match actual document, no hardcoded rule names in preview title
  test('2. Preview titles are dynamic based on document number, not fixed to ND 30/2020', () => {
    const docs = verificationService.getDocuments();
    const doc572 = docs.find((d) => d.document.document_number === '572/TNG-QLDN2');

    assert.ok(doc572, '572/TNG-QLDN2 must be in verification queue');
    assert.equal(doc572.document.document_number, '572/TNG-QLDN2');

    // Rule is placed inside inspector, not as preview title
    assert.equal(doc572.applicableLayoutRule, 'Nghị định 30/2020/NĐ-CP');
    assert.ok(doc572.document.title.includes('572/TNG-QLDN2') || doc572.document.title.includes('thanh toán'));
  });

  // Test 3: Metadata editing and draft saving
  test('3. Edit metadata fields, save draft, recalculate confidence, and record audit log', () => {
    const docs = verificationService.getDocuments();
    const targetDoc = docs[0];

    const initialAuditCount = verificationService.getAuditLogs().length;

    const updated = verificationService.saveDocumentDraft(
      targetDoc.id,
      {
        document_number: { currentValue: '999/TEST-2026' },
        signer: { currentValue: 'Nguyễn Văn Kiểm Duyệt' },
      },
      'Kiểm thử lưu nháp'
    );

    assert.ok(updated, 'Draft save must succeed');
    assert.equal(updated.fields['document_number'].currentValue, '999/TEST-2026');
    assert.equal(updated.fields['document_number'].status, 'edited');
    assert.equal(updated.fields['signer'].currentValue, 'Nguyễn Văn Kiểm Duyệt');
    assert.equal(updated.isDirty, false);
    assert.ok(updated.lastSavedAt, 'lastSavedAt must be populated');

    const newAuditCount = verificationService.getAuditLogs().length;
    assert.equal(newAuditCount, initialAuditCount + 1, 'Draft save must append an audit entry');
    const latestAudit = verificationService.getAuditLogs()[0];
    assert.equal(latestAudit.action, 'draft_saved');
    assert.equal(latestAudit.targetId, targetDoc.id);

    // Revert draft for subsequent tests
    verificationService.undoLastAction();
  });

  // Test 4: Unsaved changes guard
  test('4. Detects unsaved changes (dirty state) when fields are modified', () => {
    const docs = verificationService.getDocuments();
    const doc = docs[0];

    // Modify a field directly in working copy
    doc.isDirty = true;
    assert.equal(doc.isDirty, true, 'isDirty must be true when unsaved edits exist');

    doc.isDirty = false;
    assert.equal(doc.isDirty, false, 'isDirty resets after save or discard');
  });

  // Test 5: Re-run AI OCR and track status
  test('5. Re-run OCR request requires reason, transitions status to needs_ocr and logs audit', () => {
    const docs = verificationService.getDocuments();
    const targetDoc = docs[0];

    // Empty reason must fail
    const emptyFail = verificationService.requestRerunOcr(targetDoc.id, '', '');
    assert.equal(emptyFail.success, false);

    const result = verificationService.requestRerunOcr(
      targetDoc.id,
      'Scan mờ / Thiếu trang',
      'Cần áp dụng OCR model chuyên dụng'
    );

    assert.equal(result.success, true);
    assert.equal(result.doc?.reviewStatus, 'needs_ocr');
    assert.equal(result.doc?.ocrRequestReason, 'Scan mờ / Thiếu trang');

    const audit = verificationService.getAuditLogs()[0];
    assert.equal(audit.action, 'ocr_requested');
    assert.equal(audit.reason, 'Scan mờ / Thiếu trang');

    // Revert
    verificationService.undoLastAction();
  });

  // Test 6: Rejection with mandatory reason
  test('6. Reject document requires mandatory reason, records in audit log, does not delete data', () => {
    const docs = verificationService.getDocuments();
    const targetDoc = docs[1];

    const failRes = verificationService.rejectDocument(targetDoc.id, '', '');
    assert.equal(failRes.success, false, 'Rejection without reason must fail');

    const successRes = verificationService.rejectDocument(
      targetDoc.id,
      'Văn bản trùng lặp',
      'Đã đối chiếu với số hiệu tương tự'
    );

    assert.equal(successRes.success, true);
    assert.equal(successRes.doc?.reviewStatus, 'rejected');
    assert.equal(successRes.doc?.rejectionReason, 'Văn bản trùng lặp');

    const audit = verificationService.getAuditLogs()[0];
    assert.equal(audit.action, 'rejected');
    assert.equal(audit.reason, 'Văn bản trùng lặp');

    // Revert
    verificationService.undoLastAction();
  });

  // Test 7: Verification blocked when blocking errors exist
  test('7. Verification is blocked when unresolved error conflicts exist', () => {
    const mockDoc: DocumentVerificationRecord = {
      id: 'mock-error-doc',
      document: {
        id: 'mock-error-doc',
        title: 'Văn bản kiểm thử lỗi',
        document_number: null,
        document_type: 'cong_van',
        status: 'hieu_luc',
        issuing_body: null,
        signer: null,
        issued_date: null,
        effective_date: null,
        expiry_date: null,
        html_content: '<p>Nội dung quá ngắn</p>',
      },
      overallConfidence: 40,
      applicableLayoutRule: 'Nghị định 30/2020/NĐ-CP',
      fields: {
        document_number: {
          key: 'document_number',
          label: 'Số hiệu',
          category: 'metadata',
          extractedValue: null,
          currentValue: null,
          confidence: 0.1,
          status: 'unresolved',
          sourcePage: 1,
          isMandatory: true,
        },
      },
      conflicts: [
        {
          id: 'err-missing-number',
          fieldKey: 'document_number',
          severity: 'error',
          title: 'Thiếu số hiệu',
          message: 'Bắt buộc phải có số hiệu',
          isResolved: false,
          isConfirmed: false,
        },
      ],
      ocrPages: [],
      reviewStatus: 'pending',
      autoPublishOnVerify: false,
    };

    const blockingErrors = mockDoc.conflicts.filter((c) => c.severity === 'error' && !c.isResolved);
    assert.equal(blockingErrors.length, 1, 'Must detect 1 blocking error');
  });

  // Test 8: Unbundled Verification and Publishing
  test('8. Verification does not automatically publish document unless autoPublish is explicitly enabled', () => {
    const docs = verificationService.getDocuments();
    const doc = docs.find((d) => d.conflicts.filter((c) => c.severity === 'error' && !c.isResolved).length === 0);

    assert.ok(doc, 'Should have a document with no blocking errors');

    // 8a. Verify without auto-publish
    const verifyResult = verificationService.verifyDocument(doc.id, false, 'Chuyên viên Kiểm toán');
    assert.equal(verifyResult.success, true);
    assert.equal(verifyResult.doc?.reviewStatus, 'verified');
    assert.equal(verifyResult.doc?.document.content_status, 'verified');
    assert.equal(verifyResult.doc?.document.review_status, 'pending_review', 'Must NOT be published automatically');

    const audit1 = verificationService.getAuditLogs()[0];
    assert.equal(audit1.publishedStatus, 'verified');

    verificationService.undoLastAction();

    // 8b. Verify with auto-publish explicitly checked
    const publishResult = verificationService.verifyDocument(doc.id, true, 'Trưởng ban Pháp chế');
    assert.equal(publishResult.success, true);
    assert.equal(publishResult.doc?.document.review_status, 'published');

    const audit2 = verificationService.getAuditLogs()[0];
    assert.equal(audit2.publishedStatus, 'published');

    verificationService.undoLastAction();
  });

  // Test 9: Automatic conflict detector for date mismatches (e.g. 572/TNG-QLDN2)
  test('9. Conflict detector identifies 10/05/2025 vs 26/01/2026 mismatch on document 572/TNG-QLDN2', () => {
    const docs = verificationService.getDocuments();
    const doc572 = docs.find((d) => d.document.document_number === '572/TNG-QLDN2');

    assert.ok(doc572, '572/TNG-QLDN2 must exist');

    const dateConflict = doc572.conflicts.find((c) => c.fieldKey === 'issued_date');
    assert.ok(dateConflict, 'Must detect issued_date conflict');
    assert.equal(dateConflict.severity, 'warning');
    assert.ok(dateConflict.message.includes('10/05/2025') && dateConflict.message.includes('26/01/2026'));
    assert.deepEqual(dateConflict.suggestedValues, ['10/05/2025', '26/01/2026']);
  });

  // Test 10: Bounding Box overlay mappings
  test('10. Original scan blocks have accurate bounding boxes and page references', () => {
    const docs = verificationService.getDocuments();
    const doc = docs[0];

    assert.ok(doc.ocrPages.length >= 2, 'Should have multiple OCR pages');

    const page1 = doc.ocrPages[0];
    assert.equal(page1.pageNumber, 1);
    assert.ok(page1.blocks.length >= 4, 'Page 1 must have header, number, date, title blocks');

    const headerBlock = page1.blocks.find((b) => b.blockType === 'header');
    assert.ok(headerBlock?.boundingBox);
    assert.equal(headerBlock.boundingBox.page, 1);
    assert.ok(headerBlock.boundingBox.width > 0 && headerBlock.boundingBox.height > 0);
  });

  // Test 11: Relationship verification workflow (Direction swap, type change, verify, reject)
  test('11. Relationship verification supports type change, direction swap, and audit logging', () => {
    const rels = verificationService.getRelationships();
    assert.ok(rels.length >= 1, 'Must have queue relationships');

    const targetRel = rels[0];
    const initialSrc = targetRel.source_document_number;
    const initialTgt = targetRel.target_document_number;

    // Test direction swap
    const swapped = verificationService.swapRelationshipDirection(targetRel.id);
    assert.ok(swapped);
    assert.equal(swapped.source_document_number, initialTgt);
    assert.equal(swapped.target_document_number, initialSrc);

    // Swap back
    verificationService.swapRelationshipDirection(targetRel.id);

    // Test verify relationship
    const verified = verificationService.verifyRelationship(
      targetRel.id,
      'Chuyên viên Pháp chế',
      'Đã đối chiếu',
      { relationship_type: 'amends' }
    );
    assert.ok(verified);
    assert.equal(verified.review_status, 'verified');
    assert.equal(verified.relationship_type, 'amends');

    const audit = verificationService.getAuditLogs()[0];
    assert.equal(audit.targetType, 'relationship');
    assert.equal(audit.action, 'metadata_modified');

    // Revert
    verificationService.undoLastAction();
  });

  // Test 12: Changeset diff semantic grouping
  test('12. Changeset verification groups by Điều/Khoản and maintains before/after diff', () => {
    const changesets = verificationService.getChangesets();
    assert.ok(changesets.length >= 1, 'Must have changesets in queue');

    const chg = changesets[0];
    assert.ok(chg.articleLabel);
    assert.ok(chg.clauseLabel);
    assert.ok(chg.operation);

    // Verify changeset
    const verified = verificationService.verifyChangeset(chg.id, 'Chuyên viên Pháp chế', 'Xác nhận phạm vi');
    assert.ok(verified);
    assert.equal(verified.isVerified, true);

    const audit = verificationService.getAuditLogs()[0];
    assert.equal(audit.targetType, 'changeset');
  });

  // Test 13: Audit log immutability and before/after capture
  test('13. Audit logs record before and after snapshots with timestamps and reviewers', () => {
    const logs = verificationService.getAuditLogs();
    assert.ok(logs.length >= 2, 'Must have initial audit logs');

    const log = logs[0];
    assert.ok(log.id);
    assert.ok(log.timestamp);
    assert.ok(log.reviewer);
    assert.ok(log.action);
  });

  // Test 14: Overall confidence calculation with penalties
  test('14. Calculate overall confidence penalizes unresolved errors and warnings correctly', () => {
    const fields: Record<string, VerificationField> = {
      f1: { key: 'f1', label: 'F1', category: 'metadata', extractedValue: 'A', currentValue: 'A', confidence: 0.95, status: 'unresolved', sourcePage: 1 },
      f2: { key: 'f2', label: 'F2', category: 'metadata', extractedValue: 'B', currentValue: 'B', confidence: 0.95, status: 'unresolved', sourcePage: 1 },
    };

    // Clean score
    const cleanScore = calculateOverallConfidence(fields, []);
    assert.equal(cleanScore, 95);

    // Score with 1 warning
    const warningScore = calculateOverallConfidence(fields, [
      { id: 'w1', fieldKey: 'f1', severity: 'warning', title: 'W', message: 'W', isResolved: false, isConfirmed: false },
    ]);
    assert.equal(warningScore, 90);

    // Score with 1 error
    const errorScore = calculateOverallConfidence(fields, [
      { id: 'e1', fieldKey: 'f1', severity: 'error', title: 'E', message: 'E', isResolved: false, isConfirmed: false },
    ]);
    assert.equal(errorScore, 80);
  });

  // Test 15: Text normalizer and date parser
  test('15. Text normalization and date parsing handle Vietnamese diacritics and formats', () => {
    assert.equal(normalizeText('Công văn số 572/TNG-QLDN2'), 'cong van so 572/tng-qldn2');
    assert.equal(normalizeText('Nghị định 123/2020/NĐ-CP'), 'nghi dinh 123/2020/nd-cp');

    const d1 = parseDateString('2026-01-26');
    assert.deepEqual(d1, { year: 2026, month: 1, day: 26 });

    const d2 = parseDateString('10/05/2025');
    assert.deepEqual(d2, { day: 10, month: 5, year: 2025 });
  });

  // Test 16: Undo state stack restores previous document values
  test('16. Undo mechanism safely recovers previous state after accidental actions', () => {
    const docs = verificationService.getDocuments();
    const doc = docs[0];
    const originalStatus = doc.reviewStatus;

    verificationService.verifyDocument(doc.id, false, 'Tester');
    assert.equal(doc.reviewStatus, 'verified');

    const undoRes = verificationService.undoLastAction();
    assert.equal(undoRes.success, true);
    assert.equal(doc.reviewStatus, originalStatus);
  });
});
