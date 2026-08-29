import type { LegalDocument, DocumentRelation } from '@/types';
import { DEMO_DOCUMENTS, DEMO_RELATIONS } from '@/lib/demo-data';
import type { DocumentSuggestion } from './types';

/**
 * Normalizes text for keyword and citation search.
 */
function cleanTextForSearch(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/**
 * Generates intelligent related document suggestions based on 8 prioritized signals.
 * Does NOT pretend AI suggestions are verified legal facts.
 */
export function getRelatedDocumentSuggestions(
  primaryDoc: LegalDocument,
  allDocs: LegalDocument[] = DEMO_DOCUMENTS as unknown as LegalDocument[],
  allRelations: DocumentRelation[] = DEMO_RELATIONS
): DocumentSuggestion[] {
  if (!primaryDoc) return [];

  const candidates: DocumentSuggestion[] = [];
  const addedDocIds = new Set<string>([primaryDoc.id]);

  const primaryCleanText = cleanTextForSearch(
    `${primaryDoc.title} ${primaryDoc.document_number || ''} ${primaryDoc.html_content?.slice(0, 50000) || ''}`
  );
  const primaryIssuedDate = primaryDoc.issued_date ? new Date(primaryDoc.issued_date) : null;

  // Find all relations involving primaryDoc
  const directRelations = allRelations.filter(
    (r) => r.source_document_id === primaryDoc.id || r.target_document_id === primaryDoc.id
  );

  // 1. SIGNAL 1: Directly cited document in text (Priority 1)
  for (const doc of allDocs) {
    if (addedDocIds.has(doc.id)) continue;
    if (!doc.document_number) continue;

    const docNumClean = cleanTextForSearch(doc.document_number);
    if (docNumClean.length >= 4 && primaryCleanText.includes(docNumClean)) {
      candidates.push({
        document: doc,
        reason: `Được văn bản chính viện dẫn trực tiếp (${doc.document_number})`,
        signalCategory: 'rule_detected',
        priority: 1,
        isVerified: false,
        matchedCitation: doc.document_number,
      });
      addedDocIds.add(doc.id);
    }
  }

  // 2. SIGNAL 2: Verified amending / replacing / repealed relation (Priority 2)
  for (const rel of directRelations) {
    const otherId = rel.source_document_id === primaryDoc.id ? rel.target_document_id : rel.source_document_id;
    if (addedDocIds.has(otherId)) continue;

    if (['sua_doi', 'thay_the', 'bai_bo_toan_bo', 'bai_bo_mot_phan'].includes(rel.relation_type)) {
      const otherDoc = allDocs.find((d) => d.id === otherId);
      if (otherDoc) {
        const typeLabel =
          rel.relation_type === 'sua_doi'
            ? 'Sửa đổi, bổ sung'
            : rel.relation_type === 'thay_the'
            ? 'Thay thế'
            : 'Bãi bỏ';
        candidates.push({
          document: otherDoc,
          reason: `Có quan hệ ${typeLabel} đã xác minh (${rel.notes || 'Hệ thống cơ sở dữ liệu pháp lý'})`,
          signalCategory: 'verified_relation',
          priority: 2,
          isVerified: true,
          relationType: rel.relation_type,
        });
        addedDocIds.add(otherId);
      }
    }
  }

  // 3. SIGNAL 3: Verified guiding relation (Priority 3)
  for (const rel of directRelations) {
    const otherId = rel.source_document_id === primaryDoc.id ? rel.target_document_id : rel.source_document_id;
    if (addedDocIds.has(otherId)) continue;

    if (rel.relation_type === 'huong_dan') {
      const otherDoc = allDocs.find((d) => d.id === otherId);
      if (otherDoc) {
        const isGuiding = rel.source_document_id === otherId;
        candidates.push({
          document: otherDoc,
          reason: isGuiding
            ? `Hướng dẫn thi hành cho ${primaryDoc.document_number || 'văn bản chính'}`
            : `Được hướng dẫn thi hành bởi ${otherDoc.document_number || 'văn bản này'}`,
          signalCategory: 'verified_relation',
          priority: 3,
          isVerified: true,
          relationType: 'huong_dan',
        });
        addedDocIds.add(otherId);
      }
    }
  }

  // 4. SIGNAL 4: Verified foundational / legal basis relation (Priority 4)
  for (const rel of directRelations) {
    const otherId = rel.source_document_id === primaryDoc.id ? rel.target_document_id : rel.source_document_id;
    if (addedDocIds.has(otherId)) continue;

    if (rel.relation_type === 'can_cu') {
      const otherDoc = allDocs.find((d) => d.id === otherId);
      if (otherDoc) {
        candidates.push({
          document: otherDoc,
          reason: `Căn cứ pháp lý nền tảng ban hành (${rel.notes || otherDoc.title})`,
          signalCategory: 'verified_relation',
          priority: 4,
          isVerified: true,
          relationType: 'can_cu',
        });
        addedDocIds.add(otherId);
      }
    }
  }

  // 5. SIGNAL 5: Same specific legal topic / norm provisions (Priority 5)
  const legalKeywords = [
    { key: 'khong dung tien mat', label: 'Cùng điều chỉnh điều kiện thanh toán không dùng tiền mặt' },
    { key: 'giam tru gia canh', label: 'Cùng điều chỉnh mức giảm trừ gia cảnh thuế TNCN' },
    { key: 'may tinh tien', label: 'Cùng điều chỉnh hóa đơn điện tử khởi tạo từ máy tính tiền' },
    { key: 'giao dich lien ket', label: 'Cùng quy định quản lý thuế giao dịch liên kết & trần lãi vay' },
    { key: 'hoan thue', label: 'Cùng điều chỉnh quy trình hoàn thuế và kiểm tra sau hoàn' },
    { key: 'chung tu dien tu', label: 'Cùng điều chỉnh tiêu chuẩn chứng từ kế toán điện tử' },
  ];

  for (const kw of legalKeywords) {
    if (primaryCleanText.includes(kw.key)) {
      for (const doc of allDocs) {
        if (addedDocIds.has(doc.id)) continue;
        const docText = cleanTextForSearch(`${doc.title} ${doc.html_content?.slice(0, 30000) || ''}`);
        if (docText.includes(kw.key)) {
          candidates.push({
            document: doc,
            reason: `${kw.label} · ${doc.document_number || doc.title}`,
            signalCategory: 'rule_detected',
            priority: 5,
            isVerified: false,
          });
          addedDocIds.add(doc.id);
          if (candidates.length >= 10) break;
        }
      }
    }
    if (candidates.length >= 10) break;
  }

  // 6. SIGNAL 6: Official Dispatch on the same practical situation (Priority 6)
  if (primaryDoc.document_type === 'cong_van' || primaryCleanText.includes('giai dap') || primaryCleanText.includes('vuong mac')) {
    for (const doc of allDocs) {
      if (addedDocIds.has(doc.id)) continue;
      if (doc.document_type === 'cong_van') {
        const docText = cleanTextForSearch(doc.title);
        // Shared high-signal keywords
        const sharedTopics = ['thue', 'hoa don', 'thanh toan', 'bhxh', 'ke toan'].filter(
          (t) => primaryCleanText.includes(t) && docText.includes(t)
        );
        if (sharedTopics.length >= 1) {
          candidates.push({
            document: doc,
            reason: `Công văn giải đáp cùng tình huống thực tế (${sharedTopics.join(', ')})`,
            signalCategory: 'rule_detected',
            priority: 6,
            isVerified: false,
          });
          addedDocIds.add(doc.id);
        }
      }
    }
  }

  // 7. SIGNAL 7: Newer document with potential impact on application (Priority 7)
  if (primaryIssuedDate) {
    for (const doc of allDocs) {
      if (addedDocIds.has(doc.id)) continue;
      if (doc.issued_date) {
        const dDate = new Date(doc.issued_date);
        if (dDate > primaryIssuedDate && (doc.document_type === 'luat' || doc.document_type === 'nghi_dinh' || doc.document_type === 'thong_tu')) {
          const docTitleClean = cleanTextForSearch(doc.title);
          // Overlap check with primary doc's topic
          const hasOverlap = ['thue', 'ke toan', 'doanh nghiep', 'lao dong', 'hoa don', 'kiem toan'].some(
            (term) => primaryCleanText.includes(term) && docTitleClean.includes(term)
          );
          if (hasOverlap) {
            candidates.push({
              document: doc,
              reason: `Ban hành sau (${doc.issued_date}), có khả năng thay đổi quy định áp dụng`,
              signalCategory: 'ai_suggested',
              priority: 7,
              isVerified: false,
            });
            addedDocIds.add(doc.id);
          }
        }
      }
    }
  }

  // 8. SIGNAL 8: Same semantic topic / category (Priority 8)
  for (const doc of allDocs) {
    if (addedDocIds.has(doc.id)) continue;
    // Check if both documents share categories
    const primaryCats = primaryDoc.categories?.map((c) => c.slug || c.id) || [];
    const docCats = doc.categories?.map((c) => c.slug || c.id) || [];
    const hasSharedCategory = primaryCats.some((c) => docCats.includes(c));

    if (hasSharedCategory) {
      candidates.push({
        document: doc,
        reason: `Cùng chuyên đề lĩnh vực pháp lý (AI gợi ý)`,
        signalCategory: 'ai_suggested',
        priority: 8,
        isVerified: false,
      });
      addedDocIds.add(doc.id);
    }
  }

  // Sort by priority ascending (1 highest to 8 lowest), then return top suggestions
  return candidates.sort((a, b) => a.priority - b.priority).slice(0, 10);
}
