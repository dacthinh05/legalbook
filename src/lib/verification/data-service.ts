import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import type { LegalDocument } from '@/types';
import { LegalDocumentAnalyzer } from '@/lib/legal-engine/analyzer';
import type { LegalRelationship, LegalChange } from '@/lib/legal-engine/types';
import type {
  DocumentVerificationRecord,
  VerificationField,
  ValidationConflict,
  VerificationAuditEntry,
  RelationshipVerificationItem,
  ChangesetDiffItem,
  BoundingBox,
  OcrPageBlock,
} from './types';
import { detectDocumentConflicts, calculateOverallConfidence } from './conflict-detector';

// Singleton verification store
class VerificationDataService {
  private static instance: VerificationDataService;
  private documents: DocumentVerificationRecord[] = [];
  private relationships: RelationshipVerificationItem[] = [];
  private changesets: ChangesetDiffItem[] = [];
  private auditLogs: VerificationAuditEntry[] = [];
  private lastActionSnapshot: {
    type: 'document' | 'relationship' | 'changeset';
    recordId: string;
    previousDoc?: DocumentVerificationRecord;
    previousRel?: RelationshipVerificationItem;
    auditLogId?: string;
  } | null = null;

  private constructor() {
    this.initializeData();
  }

  public static getInstance(): VerificationDataService {
    if (!VerificationDataService.instance) {
      VerificationDataService.instance = new VerificationDataService();
    }
    return VerificationDataService.instance;
  }

  public initializeData(customDocs?: LegalDocument[]) {
    const analyzer = LegalDocumentAnalyzer.getInstance();
    const demoDocs = (customDocs || DEMO_DOCUMENTS) as unknown as LegalDocument[];
    // 1. Initialize Document Verification Records
    // Prioritize unverified/pending docs or highlight key test docs like 572/TNG-QLDN2
    const targetDocs = demoDocs.filter(
      (d) =>
        d.content_status !== 'verified' ||
        d.review_status !== 'published' ||
        d.document_number === '572/TNG-QLDN2' ||
        d.document_number?.includes('110') ||
        d.document_number?.includes('118')
    );

    // If targetDocs is small, use first 10 docs
    const rawDocs = targetDocs.length >= 3 ? targetDocs : demoDocs.slice(0, 10);

    // Make sure 572/TNG-QLDN2 is first if present
    const doc572Index = rawDocs.findIndex((d) => d.document_number === '572/TNG-QLDN2');
    if (doc572Index > 0) {
      const [doc572] = rawDocs.splice(doc572Index, 1);
      rawDocs.unshift(doc572);
    }

    this.documents = rawDocs.map((doc) => this.buildVerificationRecord(doc, demoDocs));

    // 2. Initialize Relationships
    const queueRels = analyzer.getQueueRelationships();
    this.relationships = queueRels.map((r) => {
      const srcDoc = demoDocs.find((d) => d.document_number === r.source_document_number || d.id === r.source_document_id);
      const tgtDoc = demoDocs.find((d) => d.document_number === r.target_document_number || d.id === r.target_document_id);
      return {
        ...r,
        sourceDoc: srcDoc,
        targetDoc: tgtDoc,
        isConflictWithExisting: r.confidence < 0.75,
        existingConflictNote:
          r.confidence < 0.75
            ? 'Phát hiện quan hệ tương tự đã tồn tại trong Nghị định 123/2020 nhưng có điều khoản hiệu lực khác.'
            : undefined,
      };
    });

    // 3. Initialize Changesets
    const queueChanges = analyzer.getQueueChangesets();
    this.changesets = queueChanges.map((c, idx) => {
      return {
        ...c,
        articleLabel: `Điều ${idx + 1}`,
        clauseLabel: `Khoản ${(idx % 3) + 1}`,
        pointLabel: `Điểm ${String.fromCharCode(97 + (idx % 4))}`,
        isVerified: false,
      };
    });

    // 4. Initial Audit Logs
    this.auditLogs = [
      {
        id: 'audit-init-001',
        targetId: 'doc-seed-1',
        targetType: 'document',
        targetTitle: 'Nghị định 123/2020/NĐ-CP',
        action: 'verified',
        reviewer: 'Nguyễn Văn Long (Trưởng ban Pháp chế)',
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        beforeValue: { review_status: 'pending_review' },
        afterValue: { review_status: 'verified' },
        reason: 'Đã đối chiếu 100% bản scan gốc từ Công báo Chính phủ.',
        evidenceSource: 'Công báo số 123/2020',
        publishedStatus: 'verified',
      },
      {
        id: 'audit-init-002',
        targetId: 'rel-seed-1',
        targetType: 'relationship',
        targetTitle: 'Nghị định 123/2020/NĐ-CP ➔ Thông tư 78/2021/TT-BTC',
        action: 'verified',
        reviewer: 'Trần Thị Thu (Chuyên viên Thẩm định)',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        reason: 'Quan hệ hướng dẫn thi hành khớp Điều 59.',
        evidenceSource: 'Điều 59 Khoản 1 NĐ 123',
        publishedStatus: 'published',
      },
    ];
  }

  private buildVerificationRecord(doc: LegalDocument, allDocs: LegalDocument[]): DocumentVerificationRecord {
    const isDoc572 = doc.document_number === '572/TNG-QLDN2' || doc.title.includes('572/TNG');

    // Build fields with bounding boxes and conflict scenarios
    const fields: Record<string, VerificationField> = {
      document_type: {
        key: 'document_type',
        label: 'Loại văn bản',
        category: 'metadata',
        extractedValue: doc.document_type || 'cong_van',
        detectedScanValue: doc.document_type || 'cong_van',
        currentValue: doc.document_type || 'cong_van',
        confidence: 0.99,
        status: 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Trang 1, dòng 12',
        boundingBox: { x: 40, y: 18, width: 20, height: 4, page: 1, label: 'Loại văn bản' },
        ocrSnippet: 'CÔNG VĂN',
        isMandatory: true,
      },
      document_number: {
        key: 'document_number',
        label: 'Số hiệu văn bản',
        category: 'metadata',
        extractedValue: doc.document_number || (isDoc572 ? '572/TNG-QLDN2' : '110/2025/UBTVQH15'),
        detectedScanValue: doc.document_number || (isDoc572 ? '572/TNG-QLDN2' : '110/2025/UBTVQH15'),
        currentValue: doc.document_number || (isDoc572 ? '572/TNG-QLDN2' : '110/2025/UBTVQH15'),
        confidence: 0.91,
        status: 'unresolved',
        sourcePage: 1,
        sourceLocationText: 'Trang 1, góc trên bên trái',
        boundingBox: { x: 8, y: 8, width: 28, height: 4, page: 1, label: 'Số hiệu' },
        ocrSnippet: `Số: ${doc.document_number || '572/TNG-QLDN2'}`,
        isMandatory: true,
      },
      title: {
        key: 'title',
        label: 'Tên / Trích yếu văn bản',
        category: 'metadata',
        extractedValue: doc.title,
        detectedScanValue: doc.title,
        currentValue: doc.title,
        confidence: 0.96,
        status: 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Trang 1, tiêu đề chính',
        boundingBox: { x: 15, y: 22, width: 70, height: 8, page: 1, label: 'Trích yếu' },
        ocrSnippet: doc.title,
        isMandatory: true,
      },
      issuing_body: {
        key: 'issuing_body',
        label: 'Cơ quan ban hành',
        category: 'administrative',
        extractedValue: doc.issuing_body || (isDoc572 ? 'Cục Thuế tỉnh Thái Nguyên' : 'Bộ Tài chính'),
        detectedScanValue: doc.issuing_body || (isDoc572 ? 'Cục Thuế tỉnh Thái Nguyên' : 'Bộ Tài chính'),
        currentValue: doc.issuing_body || (isDoc572 ? 'Cục Thuế tỉnh Thái Nguyên' : 'Bộ Tài chính'),
        confidence: 0.98,
        status: 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Trang 1, góc trên bên trái (Letterhead)',
        boundingBox: { x: 6, y: 4, width: 34, height: 5, page: 1, label: 'Cơ quan ban hành' },
        ocrSnippet: doc.issuing_body || 'CỤC THUẾ TỈNH THÁI NGUYÊN',
        isMandatory: true,
      },
      signer: {
        key: 'signer',
        label: 'Người ký',
        category: 'administrative',
        extractedValue: doc.signer || (isDoc572 ? 'Phạm Đức Huỳnh' : 'Nguyễn Văn A'),
        detectedScanValue: doc.signer || (isDoc572 ? 'Phạm Đức Huỳnh' : 'Nguyễn Văn A'),
        currentValue: doc.signer || (isDoc572 ? 'Phạm Đức Huỳnh' : 'Nguyễn Văn A'),
        confidence: 0.94,
        status: 'confirmed',
        sourcePage: 2,
        sourceLocationText: 'Trang 2, góc dưới bên phải',
        boundingBox: { x: 65, y: 78, width: 28, height: 8, page: 2, label: 'Người ký' },
        ocrSnippet: `PHÓ CỤC TRƯỞNG\n${doc.signer || 'Phạm Đức Huỳnh'}`,
        isMandatory: false,
      },
      position: {
        key: 'position',
        label: 'Chức vụ người ký',
        category: 'administrative',
        extractedValue: isDoc572 ? 'Phó Cục trưởng' : 'Thứ trưởng',
        detectedScanValue: isDoc572 ? 'Phó Cục trưởng' : 'Thứ trưởng',
        currentValue: isDoc572 ? 'Phó Cục trưởng' : 'Thứ trưởng',
        confidence: 0.95,
        status: 'confirmed',
        sourcePage: 2,
        sourceLocationText: 'Trang 2, trên tên người ký',
        boundingBox: { x: 65, y: 72, width: 28, height: 5, page: 2, label: 'Chức vụ' },
        ocrSnippet: 'PHÓ CỤC TRƯỞNG',
        isMandatory: false,
      },
      issued_date: {
        key: 'issued_date',
        label: 'Ngày ban hành',
        category: 'metadata',
        extractedValue: isDoc572 ? '10/05/2025' : doc.issued_date || '2026-01-15',
        detectedScanValue: isDoc572 ? '26/01/2026' : doc.issued_date || '2026-01-15',
        currentValue: isDoc572 ? '10/05/2025' : doc.issued_date || '2026-01-15',
        confidence: isDoc572 ? 0.72 : 0.97,
        status: isDoc572 ? 'unresolved' : 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Trang 1, góc trên bên phải',
        boundingBox: { x: 55, y: 8, width: 40, height: 4, page: 1, label: 'Ngày ban hành' },
        ocrSnippet: isDoc572 ? 'Thái Nguyên, ngày 26 tháng 01 năm 2026' : 'Hà Nội, ngày 15 tháng 01 năm 2026',
        conflictReason: isDoc572
          ? 'Trích xuất: 10/05/2025. Phát hiện trên bản scan: 26/01/2026. Mâu thuẫn giữa metadata và nội dung'
          : undefined,
        severity: isDoc572 ? 'warning' : undefined,
        isMandatory: true,
      },
      effective_date: {
        key: 'effective_date',
        label: 'Ngày hiệu lực',
        category: 'metadata',
        extractedValue: doc.effective_date || null,
        detectedScanValue: null,
        currentValue: doc.effective_date || null,
        confidence: 0.65,
        status: doc.effective_date ? 'confirmed' : 'unresolved',
        sourcePage: 1,
        sourceLocationText: 'Không đề cập trực tiếp trong công văn',
        boundingBox: { x: 10, y: 35, width: 80, height: 5, page: 1, label: 'Hiệu lực' },
        ocrSnippet: 'Văn bản có hiệu lực kể từ ngày ký',
        isMandatory: false,
      },
      status: {
        key: 'status',
        label: 'Trạng thái hiệu lực',
        category: 'metadata',
        extractedValue: doc.status || 'hieu_luc',
        detectedScanValue: 'hieu_luc',
        currentValue: doc.status || 'hieu_luc',
        confidence: 0.98,
        status: 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Xác định theo hệ thống hiệu lực',
        isMandatory: true,
      },
      recipient: {
        key: 'recipient',
        label: 'Nơi nhận / Đối tượng trả lời',
        category: 'administrative',
        extractedValue: isDoc572 ? 'Công ty Cổ phần Đầu tư và Phát triển TNG; Cục Thuế tỉnh; Lưu VT, QLDN2' : 'Các Bộ, cơ quan ngang Bộ',
        detectedScanValue: isDoc572 ? 'Công ty Cổ phần Đầu tư và Phát triển TNG; Cục Thuế tỉnh; Lưu VT, QLDN2' : 'Các Bộ, cơ quan ngang Bộ',
        currentValue: isDoc572 ? 'Công ty Cổ phần Đầu tư và Phát triển TNG; Cục Thuế tỉnh; Lưu VT, QLDN2' : 'Các Bộ, cơ quan ngang Bộ',
        confidence: 0.92,
        status: 'confirmed',
        sourcePage: 2,
        sourceLocationText: 'Trang 2, góc dưới bên trái',
        boundingBox: { x: 8, y: 72, width: 35, height: 18, page: 2, label: 'Nơi nhận' },
        ocrSnippet: 'Nơi nhận:\n- Như trên;\n- Cục trưởng (để b/c);\n- Lưu: VT, QLDN2.',
        isMandatory: false,
      },
      source_file: {
        key: 'source_file',
        label: 'File gốc scan / PDF',
        category: 'source',
        extractedValue: doc.files?.[0]?.original_filename || (isDoc572 ? 'CV 572.TNG.QLDN2 - Chi tiền mặt trên 5 triệu không được trừ.pdf' : 'van-ban-goc.pdf'),
        currentValue: doc.files?.[0]?.file_url || (isDoc572 ? 'https://pfgxkybzwwuzkyquhpdc.supabase.co/storage/v1/object/public/documents/CV_20572.TNG.QLDN2_20-_20Chi_20ti_E1_BB_81n_20m_E1_BA_B7t_20tr_C3_AAn_205_20tri_E1_BB_87u_20kh_C3_B4ng_20_C4_91_C6_B0_E1_BB_A3c_20tr_E1_BB_AB.pdf' : null),
        confidence: 1.0,
        status: 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Supabase Storage Bucket',
        isMandatory: true,
      },
      ocr_content: {
        key: 'ocr_content',
        label: 'Nội dung OCR toàn văn',
        category: 'content',
        extractedValue: doc.html_content || '<p>Nội dung văn bản trích xuất...</p>',
        currentValue: doc.html_content || '<p>Nội dung văn bản trích xuất...</p>',
        confidence: 0.95,
        status: 'confirmed',
        sourcePage: 1,
        sourceLocationText: 'Toàn bộ các trang văn bản',
        isMandatory: true,
      },
    };

    // OCR Page blocks for synchronized view and bounding boxes
    const ocrPages = [
      {
        pageNumber: 1,
        pdfPage: 1,
        rawText: `CỤC THUẾ TỈNH THÁI NGUYÊN\nSố: ${doc.document_number || '572/TNG-QLDN2'}\n\nCỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\n${isDoc572 ? 'Thái Nguyên, ngày 26 tháng 01 năm 2026' : 'Hà Nội, ngày 15 tháng 01 năm 2026'}\n\nCÔNG VĂN\n${doc.title}\n\nKính gửi: ${isDoc572 ? 'Công ty Cổ phần Đầu tư và Phát triển TNG' : 'Các đơn vị trực thuộc'}\n\nCăn cứ Luật Quản lý thuế số 38/2019/QH14;\nCăn cứ Luật Thuế thu nhập doanh nghiệp số 14/2008/QH12 và các luật sửa đổi, bổ sung;\nCăn cứ Nghị định số 218/2013/NĐ-CP ngày 26/12/2013 của Chính phủ quy định chi tiết và hướng dẫn thi hành Luật Thuế thu nhập doanh nghiệp;\n\nCục Thuế tỉnh có ý kiến trả lời như sau:\n1. Về điều kiện thanh toán không dùng tiền mặt:\nTrường hợp doanh nghiệp mua hàng hóa, dịch vụ từng lần có giá trị từ 05 triệu đồng trở lên (đã bao gồm thuế GTGT) theo hóa đơn thì phải có chứng từ thanh toán không dùng tiền mặt để được tính vào chi phí được trừ khi xác định thu nhập chịu thuế TNDN.\n\n2. Chứng từ thanh toán hợp pháp:\nChứng từ thanh toán không dùng tiền mặt bao gồm chứng từ thanh toán qua ngân hàng, séc, ủy nhiệm chi và các hình thức thanh toán không dùng tiền mặt khác theo quy định của pháp luật.`,
        blocks: [
          {
            id: 'blk-1',
            page: 1,
            blockType: 'header' as const,
            text: doc.issuing_body || 'CỤC THUẾ TỈNH THÁI NGUYÊN',
            boundingBox: { x: 6, y: 4, width: 34, height: 5, page: 1, label: 'Cơ quan' },
            confidence: 0.98,
          },
          {
            id: 'blk-2',
            page: 1,
            blockType: 'number' as const,
            text: `Số: ${doc.document_number || '572/TNG-QLDN2'}`,
            boundingBox: { x: 8, y: 8, width: 28, height: 4, page: 1, label: 'Số hiệu' },
            confidence: 0.91,
          },
          {
            id: 'blk-3',
            page: 1,
            blockType: 'date' as const,
            text: isDoc572 ? 'Thái Nguyên, ngày 26 tháng 01 năm 2026' : 'Hà Nội, ngày 15 tháng 01 năm 2026',
            boundingBox: { x: 55, y: 8, width: 40, height: 4, page: 1, label: 'Ngày ban hành' },
            confidence: 0.72,
          },
          {
            id: 'blk-4',
            page: 1,
            blockType: 'title' as const,
            text: doc.title,
            boundingBox: { x: 15, y: 22, width: 70, height: 8, page: 1, label: 'Trích yếu' },
            confidence: 0.96,
          },
          {
            id: 'blk-5',
            page: 1,
            blockType: 'body' as const,
            text: 'Căn cứ các quy định pháp luật hiện hành về thuế thu nhập doanh nghiệp...',
            boundingBox: { x: 8, y: 35, width: 84, height: 55, page: 1, label: 'Nội dung trang 1' },
            confidence: 0.95,
          },
        ],
      },
      {
        pageNumber: 2,
        pdfPage: 2,
        rawText: `Trường hợp không có chứng từ thanh toán không dùng tiền mặt đối với các hóa đơn từng lần từ 05 triệu đồng trở lên thì toàn bộ giá trị khoản chi đó không được tính vào chi phí được trừ khi xác định thuế TNDN.\n\nCục Thuế tỉnh thông báo để Quý Công ty biết và thực hiện theo đúng quy định pháp luật./.\n\nNơi nhận:\n- Như trên;\n- Cục trưởng (để b/c);\n- Phòng KT-NB;\n- Lưu: VT, QLDN2.\n\nKT. CỤC TRƯỞNG\nPHÓ CỤC TRƯỞNG\n(Đã ký điện tử)\n${doc.signer || 'Phạm Đức Huỳnh'}`,
        blocks: [
          {
            id: 'blk-6',
            page: 2,
            blockType: 'body' as const,
            text: 'Trường hợp không có chứng từ thanh toán không dùng tiền mặt...',
            boundingBox: { x: 8, y: 10, width: 84, height: 35, page: 2, label: 'Nội dung trang 2' },
            confidence: 0.95,
          },
          {
            id: 'blk-7',
            page: 2,
            blockType: 'recipient' as const,
            text: 'Nơi nhận: Như trên, Lưu: VT, QLDN2',
            boundingBox: { x: 8, y: 65, width: 38, height: 25, page: 2, label: 'Nơi nhận' },
            confidence: 0.92,
          },
          {
            id: 'blk-8',
            page: 2,
            blockType: 'signature' as const,
            text: `KT. CỤC TRƯỞNG\nPHÓ CỤC TRƯỞNG\n${doc.signer || 'Phạm Đức Huỳnh'}`,
            boundingBox: { x: 55, y: 65, width: 38, height: 25, page: 2, label: 'Chữ ký' },
            confidence: 0.94,
          },
        ],
      },
    ];

    const conflicts = detectDocumentConflicts(doc, fields, allDocs);
    const overallConfidence = calculateOverallConfidence(fields, conflicts);

    return {
      id: doc.id,
      document: doc,
      overallConfidence,
      applicableLayoutRule: 'Nghị định 30/2020/NĐ-CP',
      fields,
      conflicts,
      ocrPages,
      reviewStatus: 'pending',
      autoPublishOnVerify: false,
      isDirty: false,
    };
  }

  // --- Document Operations ---

  public getDocuments(): DocumentVerificationRecord[] {
    return this.documents;
  }

  public getDocumentById(id: string): DocumentVerificationRecord | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public saveDocumentDraft(
    docId: string,
    updatedFields: Record<string, Partial<VerificationField>>,
    notes?: string
  ): DocumentVerificationRecord | null {
    const docIndex = this.documents.findIndex((d) => d.id === docId);
    if (docIndex === -1) return null;

    const doc = this.documents[docIndex];
    const previousDoc = JSON.parse(JSON.stringify(doc));

    // Update field values
    Object.entries(updatedFields).forEach(([key, patch]) => {
      if (doc.fields[key]) {
        const nextStatus = patch.status || 'edited';
        doc.fields[key] = {
          ...doc.fields[key],
          ...patch,
          status: nextStatus,
          ...(patch.currentValue !== undefined
            ? {
                confidence: 0.99,
                conflictReason: undefined,
                severity: undefined,
              }
            : {}),
          ...(nextStatus === 'confirmed'
            ? {
                conflictReason: undefined,
                severity: undefined,
              }
            : {}),
        };
      }
    });

    // Re-detect conflicts and recalculate confidence
    doc.conflicts = detectDocumentConflicts(
      {
        ...doc.document,
        document_number: doc.fields['document_number']?.currentValue || doc.document.document_number,
        title: doc.fields['title']?.currentValue || doc.document.title,
        issued_date: doc.fields['issued_date']?.currentValue || doc.document.issued_date,
        effective_date: doc.fields['effective_date']?.currentValue || doc.document.effective_date,
        issuing_body: doc.fields['issuing_body']?.currentValue || doc.document.issuing_body,
        signer: doc.fields['signer']?.currentValue || doc.document.signer,
      },
      doc.fields
    );

    // Sync field conflict notices with re-detected conflicts
    Object.keys(doc.fields).forEach((key) => {
      const activeConflict = doc.conflicts.find((c) => c.fieldKey === key && !c.isResolved);
      if (activeConflict) {
        doc.fields[key].conflictReason = activeConflict.message;
        doc.fields[key].severity = activeConflict.severity;
      } else {
        doc.fields[key].conflictReason = undefined;
        doc.fields[key].severity = undefined;
      }
    });

    doc.overallConfidence = calculateOverallConfidence(doc.fields, doc.conflicts);
    doc.isDirty = false;
    doc.lastSavedAt = new Date().toISOString();

    // Log audit entry
    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: doc.id,
      targetType: 'document',
      targetTitle: doc.document.document_number || doc.document.title,
      action: 'draft_saved',
      reviewer: 'Chuyên viên Kiểm toán & Pháp chế',
      timestamp: new Date().toISOString(),
      beforeValue: previousDoc.fields,
      afterValue: doc.fields,
      notes: notes || 'Lưu nháp các trường metadata đã chỉnh sửa.',
      publishedStatus: 'pending_review',
    };
    this.auditLogs.unshift(auditEntry);

    this.lastActionSnapshot = {
      type: 'document',
      recordId: doc.id,
      previousDoc,
      auditLogId: auditEntry.id,
    };

    return doc;
  }

  public verifyDocument(
    docId: string,
    autoPublish: boolean = false,
    reviewer: string = 'Chuyên viên Kiểm toán & Pháp chế',
    notes?: string
  ): { success: boolean; error?: string; doc?: DocumentVerificationRecord } {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return { success: false, error: 'Không tìm thấy tài liệu trong hàng đợi.' };

    // Check blocking errors
    const blockingErrors = doc.conflicts.filter((c) => c.severity === 'error' && !c.isResolved);
    if (blockingErrors.length > 0) {
      return {
        success: false,
        error: `Còn ${blockingErrors.length} lỗi bắt buộc phải xử lý trước khi xác nhận.`,
      };
    }

    const previousDoc = JSON.parse(JSON.stringify(doc));

    doc.reviewStatus = 'verified';
    doc.verifiedBy = reviewer;
    doc.verifiedAt = new Date().toISOString();
    doc.autoPublishOnVerify = autoPublish;

    // Update underlying document status without unwanted auto-publish
    doc.document.content_status = 'verified';
    doc.document.review_status = autoPublish ? 'published' : 'pending_review';

    // Mark all unresolved fields as confirmed
    Object.values(doc.fields).forEach((f) => {
      if (f.status === 'unresolved') f.status = 'confirmed';
    });

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: doc.id,
      targetType: 'document',
      targetTitle: doc.document.document_number || doc.document.title,
      action: 'verified',
      reviewer,
      timestamp: new Date().toISOString(),
      beforeValue: { reviewStatus: previousDoc.reviewStatus, content_status: previousDoc.document.content_status },
      afterValue: { reviewStatus: 'verified', content_status: 'verified', publishedStatus: doc.document.review_status },
      notes: notes || (autoPublish ? 'Đã xác nhận tài liệu và tự động xuất bản.' : 'Đã xác nhận tài liệu (Chờ bước xuất bản riêng).'),
      evidenceSource: 'Đối chiếu bản gốc PDF & OCR Inspector',
      publishedStatus: autoPublish ? 'published' : 'verified',
    };
    this.auditLogs.unshift(auditEntry);

    this.lastActionSnapshot = {
      type: 'document',
      recordId: doc.id,
      previousDoc,
      auditLogId: auditEntry.id,
    };

    return { success: true, doc };
  }

  public rejectDocument(
    docId: string,
    reason: string,
    notes: string,
    reviewer: string = 'Chuyên viên Kiểm toán & Pháp chế'
  ): { success: boolean; error?: string; doc?: DocumentVerificationRecord } {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Bắt buộc chọn hoặc nhập lý do từ chối.' };
    }

    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return { success: false, error: 'Không tìm thấy tài liệu trong hàng đợi.' };

    const previousDoc = JSON.parse(JSON.stringify(doc));

    doc.reviewStatus = 'rejected';
    doc.rejectionReason = reason;
    doc.rejectionNotes = notes;
    doc.verifiedBy = reviewer;
    doc.verifiedAt = new Date().toISOString();

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: doc.id,
      targetType: 'document',
      targetTitle: doc.document.document_number || doc.document.title,
      action: 'rejected',
      reviewer,
      timestamp: new Date().toISOString(),
      reason,
      notes,
      publishedStatus: 'draft',
    };
    this.auditLogs.unshift(auditEntry);

    this.lastActionSnapshot = {
      type: 'document',
      recordId: doc.id,
      previousDoc,
      auditLogId: auditEntry.id,
    };

    return { success: true, doc };
  }

  public requestRerunOcr(
    docId: string,
    reason: string,
    notes: string,
    reviewer: string = 'Chuyên viên Kiểm toán & Pháp chế'
  ): { success: boolean; error?: string; doc?: DocumentVerificationRecord } {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Bắt buộc chọn lý do yêu cầu chạy lại OCR.' };
    }

    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return { success: false, error: 'Không tìm thấy tài liệu trong hàng đợi.' };

    const previousDoc = JSON.parse(JSON.stringify(doc));

    doc.reviewStatus = 'needs_ocr';
    doc.ocrRequestReason = reason;

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: doc.id,
      targetType: 'document',
      targetTitle: doc.document.document_number || doc.document.title,
      action: 'ocr_requested',
      reviewer,
      timestamp: new Date().toISOString(),
      reason,
      notes,
      publishedStatus: 'pending_review',
    };
    this.auditLogs.unshift(auditEntry);

    this.lastActionSnapshot = {
      type: 'document',
      recordId: doc.id,
      previousDoc,
      auditLogId: auditEntry.id,
    };

    return { success: true, doc };
  }

  public markDuplicate(
    docId: string,
    notes: string,
    reviewer: string = 'Chuyên viên Kiểm toán & Pháp chế'
  ): { success: boolean; error?: string; doc?: DocumentVerificationRecord } {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return { success: false, error: 'Không tìm thấy tài liệu trong hàng đợi.' };

    const previousDoc = JSON.parse(JSON.stringify(doc));
    doc.reviewStatus = 'rejected';
    doc.rejectionReason = 'Trùng lặp với văn bản đã có';
    doc.rejectionNotes = notes;

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: doc.id,
      targetType: 'document',
      targetTitle: doc.document.document_number || doc.document.title,
      action: 'duplicate_marked',
      reviewer,
      timestamp: new Date().toISOString(),
      reason: 'Đánh dấu trùng lặp tài liệu',
      notes,
      publishedStatus: 'draft',
    };
    this.auditLogs.unshift(auditEntry);

    return { success: true, doc };
  }

  // --- Relationship Operations ---

  public getRelationships(filterStatus: string = 'all'): RelationshipVerificationItem[] {
    if (filterStatus === 'all') return this.relationships;
    return this.relationships.filter((r) => r.review_status === filterStatus);
  }

  public verifyRelationship(
    relId: string,
    reviewer: string = 'Chuyên viên Pháp chế',
    notes?: string,
    modifiedData?: Partial<LegalRelationship>
  ): RelationshipVerificationItem | null {
    const rel = this.relationships.find((r) => r.id === relId);
    if (!rel) return null;

    const previousRel = JSON.parse(JSON.stringify(rel));

    rel.review_status = 'verified';
    rel.reviewed_by = reviewer;
    rel.reviewed_at = new Date().toISOString();
    rel.notes = notes || rel.notes;

    if (modifiedData) {
      Object.assign(rel, modifiedData);
    }

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: rel.id,
      targetType: 'relationship',
      targetTitle: `${rel.source_document_number} ➔ ${rel.target_document_number}`,
      action: modifiedData ? 'metadata_modified' : 'verified',
      reviewer,
      timestamp: new Date().toISOString(),
      beforeValue: previousRel,
      afterValue: rel,
      notes: notes || 'Xác nhận quan hệ pháp lý hợp lệ.',
      evidenceSource: rel.evidence_text,
      publishedStatus: 'verified',
    };
    this.auditLogs.unshift(auditEntry);

    this.lastActionSnapshot = {
      type: 'relationship',
      recordId: rel.id,
      previousRel,
      auditLogId: auditEntry.id,
    };

    return rel;
  }

  public rejectRelationship(
    relId: string,
    reason: string,
    reviewer: string = 'Chuyên viên Pháp chế'
  ): RelationshipVerificationItem | null {
    const rel = this.relationships.find((r) => r.id === relId);
    if (!rel) return null;

    const previousRel = JSON.parse(JSON.stringify(rel));

    rel.review_status = 'rejected';
    rel.reviewed_by = reviewer;
    rel.reviewed_at = new Date().toISOString();
    rel.notes = reason;

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: rel.id,
      targetType: 'relationship',
      targetTitle: `${rel.source_document_number} ➔ ${rel.target_document_number}`,
      action: 'rejected',
      reviewer,
      timestamp: new Date().toISOString(),
      beforeValue: previousRel,
      afterValue: rel,
      reason,
      publishedStatus: 'draft',
    };
    this.auditLogs.unshift(auditEntry);

    return rel;
  }

  public swapRelationshipDirection(relId: string): RelationshipVerificationItem | null {
    const rel = this.relationships.find((r) => r.id === relId);
    if (!rel) return null;

    const tempId = rel.source_document_id;
    const tempNum = rel.source_document_number;
    const tempDoc = rel.sourceDoc;

    rel.source_document_id = rel.target_document_id;
    rel.source_document_number = rel.target_document_number || '';
    rel.sourceDoc = rel.targetDoc;

    rel.target_document_id = tempId;
    rel.target_document_number = tempNum;
    rel.targetDoc = tempDoc;
    rel.isDirty = true;

    return rel;
  }

  // --- Changeset Operations ---

  public getChangesets(): ChangesetDiffItem[] {
    return this.changesets;
  }

  public verifyChangeset(
    changesetId: string,
    reviewer: string = 'Chuyên viên Pháp chế',
    notes?: string
  ): ChangesetDiffItem | null {
    const item = this.changesets.find((c) => c.id === changesetId);
    if (!item) return null;

    item.isVerified = true;
    item.verificationNotes = notes;

    const auditEntry: VerificationAuditEntry = {
      id: `audit-${Date.now()}`,
      targetId: item.id,
      targetType: 'changeset',
      targetTitle: `Changeset ${item.operation} (${item.target_node_id})`,
      action: 'verified',
      reviewer,
      timestamp: new Date().toISOString(),
      notes: notes || 'Xác nhận phạm vi sửa đổi điều khoản.',
      publishedStatus: 'verified',
    };
    this.auditLogs.unshift(auditEntry);

    return item;
  }

  // --- Audit Logs ---

  public getAuditLogs(): VerificationAuditEntry[] {
    return this.auditLogs;
  }

  // --- Undo Support ---

  public canUndo(): boolean {
    return this.lastActionSnapshot !== null;
  }

  public undoLastAction(): { success: boolean; message?: string } {
    if (!this.lastActionSnapshot) return { success: false, message: 'Không có hành động nào để hoàn tác.' };

    const { type, recordId, previousDoc, previousRel, auditLogId } = this.lastActionSnapshot;

    if (type === 'document' && previousDoc) {
      const docIndex = this.documents.findIndex((d) => d.id === recordId);
      if (docIndex !== -1) {
        Object.assign(this.documents[docIndex], previousDoc);
      }
    } else if (type === 'relationship' && previousRel) {
      const relIndex = this.relationships.findIndex((r) => r.id === recordId);
      if (relIndex !== -1) {
        Object.assign(this.relationships[relIndex], previousRel);
      }
    }

    if (auditLogId) {
      this.auditLogs = this.auditLogs.filter((a) => a.id !== auditLogId);
    }

    this.lastActionSnapshot = null;
    return { success: true, message: 'Đã hoàn tác hành động gần nhất.' };
  }
  public resetWithDocuments(docs: LegalDocument[]) {
    this.initializeData(docs);
  }
}

export const verificationService = VerificationDataService.getInstance();
