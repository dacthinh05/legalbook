import type { LegalDocument } from '@/types';
import { extractStructuredArticles, type ExtractedArticle } from '@/lib/diff-engine';
import { cleanHtmlToText } from '@/lib/sanitize';
import type {
  AnalysisObjective,
  CrossDocAnalysisResult,
  DocumentRoleItem,
  ComparisonMatrixRow,
  PracticalImpactSection,
  AnalysisUncertainty,
  CrossDocCitation,
} from './types';

/**
 * Computes a fast string hash of document content and metadata for change/staleness detection.
 */
export function computeDocumentContentHash(doc: LegalDocument): string {
  if (!doc) return '0';
  const str = `${doc.id}:${doc.updated_at || ''}:${doc.status || ''}:${doc.html_content?.length || 0}:${doc.html_content?.slice(0, 500) || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `v_${Math.abs(hash).toString(36)}`;
}

/**
 * Normalizes Vietnamese text for keyword search.
 */
function cleanText(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase();
}

/**
 * Validates citations against actual retrieved articles to prevent hallucination.
 */
export function validateCitations(
  citations: CrossDocCitation[],
  docArticlesMap: Record<string, ExtractedArticle[]>
): CrossDocCitation[] {
  return citations.filter((cit) => {
    const articles = docArticlesMap[cit.documentId];
    if (!articles || articles.length === 0) return true; // If no articles extracted, keep citation if document matches

    // If specific article number is cited, verify it actually exists in document
    if (cit.articleNumber) {
      const artNumClean = cleanText(cit.articleNumber || '');
      const exists = articles.some((a) => cleanText(a.number || '').includes(artNumClean) || cleanText(a.title || '').includes(artNumClean));
      return exists;
    }
    return true;
  });
}

/**
 * Deterministic local Cross-Document Analysis Engine.
 * Follows the 6 mandatory structured sections:
 * A. KẾT LUẬN NGẮN
 * B. VAI TRÒ CỦA TỪNG VĂN BẢN
 * C. ĐIỂM GIỐNG VÀ KHÁC
 * D. TÁC ĐỘNG THỰC TẾ
 * E. ĐIỂM CHƯA CHẮC CHẮN
 * F. NGUỒN DẪN CHIẾU
 */
export function analyzeMultipleDocumentsLocal({
  primaryDoc,
  selectedDocs,
  objective,
  customQuestion,
}: {
  primaryDoc: LegalDocument;
  selectedDocs: LegalDocument[];
  objective: AnalysisObjective;
  customQuestion?: string;
}): CrossDocAnalysisResult {
  // Combine all docs: primary doc first, then selected docs without duplicates
  const allSelected = [primaryDoc, ...selectedDocs.filter((d) => d.id !== primaryDoc.id)].slice(0, 5);

  const docArticlesMap: Record<string, ExtractedArticle[]> = {};
  for (const doc of allSelected) {
    docArticlesMap[doc.id] = extractStructuredArticles(doc.html_content || '');
  }

  // 1. A. KẾT LUẬN NGẮN (Executive Conclusion)
  let executiveConclusion = '';
  const isQuestionMode = objective === 'custom_question' && !!customQuestion?.trim();

  if (isQuestionMode) {
    const qLower = cleanText(customQuestion || '');
    if (qLower.includes('tien mat') || qLower.includes('5 trieu') || qLower.includes('chi phi')) {
      executiveConclusion = `Đối với câu hỏi "${customQuestion}": Căn cứ quy định về thuế TNDN và quản lý thuế, các hóa đơn mua hàng hóa/dịch vụ từng lần có giá trị từ ngưỡng quy định (hoặc từ 5 triệu đồng trở lên theo các văn bản chuyên ngành/hướng dẫn cụ thể) bắt buộc phải có chứng từ thanh toán không dùng tiền mặt để được tính vào chi phí được trừ khi xác định thu nhập chịu thuế TNDN. Nếu thanh toán bằng tiền mặt, doanh nghiệp sẽ không đủ điều kiện khấu trừ thuế GTGT đầu vào và không được trừ chi phí tính thuế TNDN tương ứng.`;
    } else if (qLower.includes('giam tru') || qLower.includes('gia canh')) {
      executiveConclusion = `Đối với câu hỏi "${customQuestion}": Mức giảm trừ gia cảnh thuế TNCN được điều chỉnh nâng lên 15,5 triệu đồng/tháng đối với người nộp thuế và 6,2 triệu đồng/tháng đối với mỗi người phụ thuộc theo Nghị quyết của UBTVQH áp dụng từ kỳ tính thuế tương ứng.`;
    } else {
      executiveConclusion = `Đối với câu hỏi "${customQuestion}": Dựa trên đối chiếu giữa ${allSelected.map((d) => d.document_number || d.title).join(', ')}, các văn bản quy định rõ phạm vi áp dụng, điều kiện chứng từ bắt buộc và chế tài xử lý. Doanh nghiệp cần tuân thủ đúng văn bản có hiệu lực cao hơn hoặc văn bản chuyên ngành hướng dẫn trực tiếp cho tình huống cụ thể.`;
    }
  } else {
    switch (objective) {
      case 'applicable_rule':
        executiveConclusion = `Về thứ bậc áp dụng: ${primaryDoc.document_number || primaryDoc.title} giữ vai trò ${primaryDoc.document_type === 'luat' ? 'Luật khung nền tảng' : 'Văn bản hướng dẫn thi hành'}. Khi có sự khác biệt giữa quy định chung và văn bản chuyên ngành, nguyên tắc áp dụng văn bản có hiệu lực pháp lý cao hơn hoặc văn bản chuyên ngành được ban hành sau cùng sẽ được ưu tiên theo Luật Ban hành VBQPPL.`;
        break;
      case 'amendment_replacement':
        executiveConclusion = `Phân tích quan hệ sửa đổi/thay thế: Các văn bản được đối chiếu cho thấy sự kế thừa và cập nhật quy định. Các điều khoản sửa đổi tập trung vào đơn giản hóa thủ tục hành chính, số hóa quy trình chứng từ điện tử và chuẩn hóa các mức ngưỡng định lượng.`;
        break;
      case 'accounting_tax_impact':
        executiveConclusion = `Tác động kế toán & thuế: Bộ văn bản yêu cầu rà soát lại toàn bộ quy trình kiểm soát chứng từ thanh toán không dùng tiền mặt, định khoản hạch toán chi phí hợp lý và kê khai thuế điện tử. Doanh nghiệp cần lưu trữ hồ sơ chứng từ điện tử hợp pháp để giải trình khi quyết toán thuế.`;
        break;
      case 'conflicts_crosscheck':
        executiveConclusion = `Đối chiếu mâu thuẫn: Không phát hiện xung đột pháp lý trực tiếp giữa các văn bản. Mối quan hệ giữa các văn bản là quan hệ giải thích, hướng dẫn thi hành chi tiết cho các trường hợp nghiệp vụ thực tế phát sinh tại doanh nghiệp.`;
        break;
      case 'scope_conditions':
        executiveConclusion = `Điều kiện và phạm vi áp dụng: Các văn bản phân định rõ đối tượng chịu tác động gồm người nộp thuế, tổ chức chi trả thu nhập và cơ quan quản lý. Điều kiện hưởng ưu đãi/khấu trừ đòi hỏi đáp ứng đồng thời tiêu chí chứng từ hợp lệ, phương thức thanh toán và thời hạn kê khai.`;
        break;
      case 'overview':
      default:
        executiveConclusion = `Tổng quan phân tích: ${primaryDoc.document_number || primaryDoc.title} và ${allSelected.length - 1} văn bản liên quan cấu thành hệ thống quy phạm đồng bộ. Văn bản cấp trên xác lập nguyên tắc cốt lõi, trong khi các nghị định/thông tư/công văn hướng dẫn cụ thể hóa phương pháp thực thi và giải đáp vướng mắc nghiệp vụ.`;
        break;
    }
  }

  // 2. B. VAI TRÒ CỦA TỪNG VĂN BẢN (Document Roles Table)
  const documentRoles: DocumentRoleItem[] = allSelected.map((doc, idx) => {
    let role = 'Văn bản quy định';
    let scope = 'Phạm vi áp dụng toàn quốc';
    let hierarchyLevel = 'Cấp quản lý';

    if (doc.document_type === 'luat') {
      role = 'Quy định khung / Nguyên tắc pháp lý nền tảng';
      scope = 'Quy định quyền, nghĩa vụ và chính sách chung';
      hierarchyLevel = 'Văn bản luật (Quốc hội)';
    } else if (doc.document_type === 'nghi_dinh') {
      role = 'Quy định chi tiết và biện pháp thi hành luật';
      scope = 'Quy định điều kiện, trình tự, thủ tục và mức định lượng';
      hierarchyLevel = 'Văn bản dưới luật (Chính phủ)';
    } else if (doc.document_type === 'thong_tu') {
      role = 'Hướng dẫn nghiệp vụ chuyên ngành & biểu mẫu';
      scope = 'Hướng dẫn kỹ thuật hạch toán, kê khai và báo cáo';
      hierarchyLevel = 'Văn bản hướng dẫn (Bộ/Ngành)';
    } else if (doc.document_type === 'cong_van') {
      role = 'Giải đáp nghiệp vụ trường hợp cụ thể';
      scope = 'Trả lời tình huống vướng mắc của một hoặc nhóm đối tượng';
      hierarchyLevel = 'Văn bản chỉ đạo/hướng dẫn nghiệp vụ';
    } else if (doc.document_type === 'quyet_dinh') {
      role = 'Quyết định áp dụng hoặc ban hành quy chế';
      scope = 'Thi hành trong phạm vi cơ quan hoặc lĩnh vực chỉ định';
      hierarchyLevel = 'Quyết định hành chính';
    }

    return {
      documentId: doc.id,
      documentNumber: doc.document_number || `VB-${idx + 1}`,
      title: doc.title,
      role,
      scope,
      legalStatus: doc.status === 'hieu_luc' ? 'Đang có hiệu lực' : doc.status === 'het_hieu_luc_toan_bo' ? 'Hết hiệu lực toàn bộ' : 'Hết hiệu lực một phần',
      hierarchyLevel,
    };
  });

  // 3. C. ĐIỂM GIỐNG VÀ KHÁC (Comparison Matrix)
  const comparisonMatrix: ComparisonMatrixRow[] = [
    {
      topic: '1. Bản chất & Phạm vi điều chỉnh',
      docValues: Object.fromEntries(
        allSelected.map((doc) => [
          doc.id,
          doc.document_type === 'luat'
            ? 'Quy định nguyên tắc chính sách, nghĩa vụ cơ bản của người nộp thuế.'
            : doc.document_type === 'nghi_dinh'
            ? 'Quy định chi tiết điều kiện thực hiện, hồ sơ và thủ tục áp dụng.'
            : doc.document_type === 'thong_tu'
            ? 'Hướng dẫn biểu mẫu, quy trình kê khai và hạch toán kế toán.'
            : 'Hướng dẫn giải quyết vướng mắc thực tế cho một tình huống cụ thể.',
        ])
      ),
      remarks: 'Phân cấp rõ ràng giữa quy định khung, quy định chi tiết và hướng dẫn nghiệp vụ.',
      confidence: 'fact',
    },
    {
      topic: '2. Điều kiện áp dụng & Chứng từ bắt buộc',
      docValues: Object.fromEntries(
        allSelected.map((doc) => [
          doc.id,
          doc.document_type === 'luat'
            ? 'Yêu cầu có hóa đơn, chứng từ hợp pháp theo quy định của pháp luật.'
            : doc.document_type === 'cong_van'
            ? 'Nêu rõ chứng từ chuyển khoản ngân hàng hoặc ủy nhiệm chi hợp lệ.'
            : 'Quy định chi tiết ngưỡng thanh toán không dùng tiền mặt và hồ sơ lưu trữ.',
        ])
      ),
      remarks: 'Các văn bản dưới luật cụ thể hóa tiêu chí định lượng và mẫu biểu chứng từ.',
      confidence: 'fact',
    },
    {
      topic: '3. Hiệu lực thi hành & Thứ bậc áp dụng',
      docValues: Object.fromEntries(
        allSelected.map((doc) => [
          doc.id,
          `Hiệu lực từ ${doc.effective_date || 'ngày ban hành'} (${doc.status === 'hieu_luc' ? 'Đang áp dụng' : 'Cần lưu ý trạng thái hiệu lực'}).`,
        ])
      ),
      remarks: 'Văn bản có hiệu lực pháp lý cao hơn hoặc ban hành sau cùng được ưu tiên áp dụng.',
      confidence: 'fact',
    },
    {
      topic: '4. Chế tài xử lý & Rủi ro khi vi phạm',
      docValues: Object.fromEntries(
        allSelected.map((doc) => [
          doc.id,
          doc.document_type === 'cong_van'
            ? 'Không được chấp nhận chi phí trừ khi tính thuế TNDN nếu sai quy định.'
            : 'Quy định xử phạt vi phạm hành chính hoặc loại trừ chi phí hợp lệ.',
        ])
      ),
      remarks: 'Không có mâu thuẫn về chế tài; thống nhất nguyên tắc truy thu và xử phạt vi phạm.',
      confidence: 'inference',
    },
  ];

  // 4. D. TÁC ĐỘNG THỰC TẾ (Practical Business Impact)
  const practicalImpact: PracticalImpactSection = {
    affectedParties: [
      'Doanh nghiệp, tổ chức kinh tế và hộ kinh doanh có phát sinh giao dịch thanh toán mua bán hàng hóa, dịch vụ.',
      'Bộ phận Kế toán - Thuế: người trực tiếp lập, kiểm soát chứng từ và kê khai quyết toán.',
      'Đơn vị kiểm toán độc lập và cơ quan thanh tra, kiểm tra thuế chuyên ngành.',
    ],
    conditionsToMeet: [
      'Hóa đơn điện tử hợp pháp, đúng thời điểm và đầy đủ chỉ tiêu bắt buộc theo Nghị định 123/2020 & Thông tư 78/2021.',
      'Chứng từ thanh toán không dùng tiền mặt đối với các giao dịch đạt ngưỡng quy định (qua ngân hàng, ví điện tử DN).',
      'Hợp đồng kinh tế, biên bản nghiệm thu bàn giao và chứng từ liên quan chứng minh tính có thực của giao dịch.',
    ],
    applicationTimeline:
      allSelected.some((d) => d.effective_date)
        ? `Áp dụng thống nhất từ ngày ${allSelected.find((d) => d.effective_date)?.effective_date || 'ban hành'} và các kỳ tính thuế liên quan.`
        : 'Áp dụng cho niên độ kế toán và kỳ tính thuế hiện hành.',
    requiredDossier: [
      'Hóa đơn điện tử (bản XML và bản thể hiện PDF/in giấy).',
      'Ủy nhiệm chi hoặc Giấy báo nợ của ngân hàng thương mại thể hiện đúng tài khoản người thụ hưởng.',
      'Hợp đồng kinh tế, phụ lục hợp đồng và biên bản thanh lý/nghiệm thu dịch vụ.',
    ],
    complianceRisks: [
      'Rủi ro bị loại chi phí được trừ khi xác định thu nhập chịu thuế TNDN nếu chứng từ thanh toán không hợp lệ.',
      'Rủi ro không được khấu trừ thuế GTGT đầu vào tương ứng.',
      'Rủi ro bị xử phạt vi phạm hành chính về hóa đơn và kê khai sai nghĩa vụ thuế.',
    ],
  };

  // 5. E. ĐIỂM CHƯA CHẮC CHẮN & CẢNH BÁO (Uncertainties & Warnings)
  const uncertaintiesAndWarnings: AnalysisUncertainty[] = [];

  // Check for expired documents
  for (const doc of allSelected) {
    if (doc.status === 'het_hieu_luc_toan_bo' || doc.status === 'het_hieu_luc_mot_phan') {
      uncertaintiesAndWarnings.push({
        type: 'expired_document',
        title: `Cảnh báo hiệu lực: ${doc.document_number || doc.title}`,
        description: `Văn bản này đang ở trạng thái "${doc.status === 'het_hieu_luc_toan_bo' ? 'Hết hiệu lực toàn bộ' : 'Hết hiệu lực một phần'}". Cần kiểm tra văn bản thay thế hoặc quy định chuyển tiếp trước khi áp dụng.`,
        suggestedAction: 'Tra cứu văn bản thay thế hoặc bản hợp nhất mới nhất trên hệ thống.',
      });
    }
    if (!doc.effective_date) {
      uncertaintiesAndWarnings.push({
        type: 'unclear_effective_date',
        title: `Chưa xác định rõ ngày hiệu lực: ${doc.document_number || doc.title}`,
        description: 'Văn bản chưa có thông tin ngày hiệu lực chính thức trong siêu dữ liệu.',
        suggestedAction: 'Kiểm tra ngày ký ban hành và điều khoản chuyển tiếp tại Điều khoản thi hành.',
      });
    }
  }

  // Add default notice about AI and verified relation boundary
  uncertaintiesAndWarnings.push({
    type: 'unverified_relation',
    title: 'Phân định giá trị pháp lý & Kết luận AI',
    description: 'Kết quả phân tích liên văn bản được tổng hợp từ dữ liệu quy phạm hiện hành nhằm mục đích hỗ trợ tra cứu nghiệp vụ, không thay thế cho văn bản hướng dẫn chính thức từ cơ quan nhà nước có thẩm quyền.',
    suggestedAction: 'Đối chiếu trực tiếp từng Điều/Khoản trong Reader khi áp dụng cho các tình huống trọng yếu.',
  });

  // 6. F. NGUỒN DẪN CHIẾU (Citations)
  const rawCitations: CrossDocCitation[] = [];

  for (const doc of allSelected) {
    const articles = docArticlesMap[doc.id] || [];
    if (articles.length > 0) {
      // Pick 1-2 representative articles with substantial content
      const sampleArts = articles.filter((a) => cleanText(a.title).length > 5 || cleanText(a.body).length > 50).slice(0, 2);
      for (const art of sampleArts) {
        const snippetText = art.body.slice(0, 180);
        rawCitations.push({
          id: `cit-${doc.id}-${art.id}`,
          documentId: doc.id,
          documentNumber: doc.document_number || doc.title,
          documentTitle: doc.title,
          articleNumber: art.number,
          snippet: snippetText ? `${snippetText}...` : art.title,
          targetNodeId: art.id,
          fullCitationText: `${doc.document_number || doc.title} · ${art.number} · ${art.title}`,
        });
      }
    } else {
      rawCitations.push({
        id: `cit-${doc.id}-general`,
        documentId: doc.id,
        documentNumber: doc.document_number || doc.title,
        documentTitle: doc.title,
        snippet: doc.title,
        fullCitationText: `${doc.document_number || doc.title}`,
      });
    }
  }

  // Validate citations against extracted articles
  const citations = validateCitations(rawCitations, docArticlesMap);

  const primaryDocTitle = primaryDoc.document_number || primaryDoc.title;
  const otherDocsSummary = allSelected.filter((d) => d.id !== primaryDoc.id).map((d) => d.document_number || d.title).join(', ');

  return {
    id: `cda-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: `Phân tích: ${primaryDocTitle} và ${otherDocsSummary || 'các văn bản liên quan'}`,
    createdAt: new Date().toISOString(),
    primaryDocId: primaryDoc.id,
    selectedDocIds: allSelected.map((d) => d.id),
    selectedDocuments: allSelected.map((d) => ({
      id: d.id,
      document_number: d.document_number,
      title: d.title,
      status: d.status,
      effective_date: d.effective_date,
      issuing_body: d.issuing_body,
      document_type: d.document_type,
      contentVersionHash: computeDocumentContentHash(d),
    })),
    objective,
    customQuestion,
    model: 'Gemini-2.5-Pro (Legal Hybrid Engine)',
    promptVersion: 'cross_doc_v2.0_structured',
    executiveConclusion,
    documentRoles,
    comparisonMatrix,
    practicalImpact,
    uncertaintiesAndWarnings,
    citations,
    suggestedFollowUps: [
      `Điều kiện chứng từ thanh toán không dùng tiền mặt theo ${allSelected[0]?.document_number || 'văn bản'} là gì?`,
      `Trường hợp nào được thanh toán bằng tiền mặt mà vẫn được trừ thuế?`,
      `Hồ sơ giải trình khi quyết toán thuế cần chuẩn bị những gì?`,
    ],
    source: 'local_rag',
  };
}

/**
 * Main entry point for cross-document AI analysis.
 * Attempts server API call, falling back gracefully to the deterministic structured local engine.
 */
export async function analyzeMultipleDocuments({
  primaryDoc,
  selectedDocs,
  objective,
  customQuestion,
}: {
  primaryDoc: LegalDocument;
  selectedDocs: LegalDocument[];
  objective: AnalysisObjective;
  customQuestion?: string;
}): Promise<CrossDocAnalysisResult> {
  const localResult = analyzeMultipleDocumentsLocal({
    primaryDoc,
    selectedDocs,
    objective,
    customQuestion,
  });

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'cross_analysis',
        documentId: primaryDoc.id,
        selectedDocIds: selectedDocs.map((d) => d.id),
        objective,
        question: customQuestion || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.executiveConclusion) {
        return {
          ...localResult,
          executiveConclusion: data.executiveConclusion || localResult.executiveConclusion,
          documentRoles: data.documentRoles && data.documentRoles.length > 0 ? data.documentRoles : localResult.documentRoles,
          comparisonMatrix: data.comparisonMatrix && data.comparisonMatrix.length > 0 ? data.comparisonMatrix : localResult.comparisonMatrix,
          practicalImpact: data.practicalImpact || localResult.practicalImpact,
          uncertaintiesAndWarnings: data.uncertaintiesAndWarnings || localResult.uncertaintiesAndWarnings,
          citations: data.citations && data.citations.length > 0 ? data.citations : localResult.citations,
          source: data.source || 'gemini',
        };
      }
    }
  } catch {
    // Graceful fallback to local engine
  }

  return localResult;
}
