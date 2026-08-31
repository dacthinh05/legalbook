import { NextRequest, NextResponse } from 'next/server';
import { getDocumentById, getDocuments, isEmbeddedDataPermitted } from '@/lib/data-service';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import { queryLegalAssistant, generateLocalDocumentSummary, type LegalCitation } from '@/lib/ai/legal-rag';
import { cleanHtmlToText } from '@/lib/sanitize.server';
import { executeSearch } from '@/lib/search';
import { getCandidateDocNumbersForSituation } from '@/lib/search/audit-situation-dictionary';
import { extractStructuredArticles } from '@/lib/diff-engine';
import type { LegalDocument } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatRequestBody {
  question: string;
  documentId?: string;
  docAId?: string;
  docBId?: string;
  selectedDocIds?: string[];
  objective?: string;
  mode?: 'ask' | 'compare' | 'summary' | 'cross_analysis';
}

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-pro',
  'gemini-pro-latest',
];

/**
 * Calls Google Gemini REST API with automated model & key rotation.
 */
async function callGeminiApi(
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; keyUsed: string; modelUsed: string } | null> {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_BACKUP_KEY,
  ].filter(Boolean) as string[];

  if (keys.length === 0) return null;

  for (let k = 0; k < keys.length; k++) {
    const apiKey = keys[k];
    for (const model of CANDIDATE_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            generationConfig: {
              temperature: 0.2, // Low temperature for high legal grounding
              maxOutputTokens: 2500,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText && generatedText.trim().length > 0) {
            return {
              text: generatedText,
              keyUsed: `key-${k + 1}`,
              modelUsed: model,
            };
          }
        } else {
          const errText = await res.text();
          console.warn(`Gemini API key-${k + 1} (${model}) status ${res.status}:`, errText.slice(0, 150));
        }
      } catch (err) {
        console.warn(`Gemini API key-${k + 1} (${model}) network exception:`, err);
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const { question, documentId, docAId, docBId, mode = 'ask' } = body;

    // 1. Resolve Document Context
    let targetDoc: LegalDocument | null = null;
    let docA: LegalDocument | null = null;
    let docB: LegalDocument | null = null;

    if (documentId) {
      const res = await getDocumentById(documentId);
      targetDoc = res.data;
    }
    if (docAId) {
      const res = await getDocumentById(docAId);
      docA = res.data;
    }
    if (docBId) {
      const res = await getDocumentById(docBId);
      docB = res.data;
    }

    // Load full corpus for multi-doc search / Whole Library RAG
    const allDocsRes = await getDocuments(null);
    let allDocs: LegalDocument[] = allDocsRes.data || [];
    if (allDocs.length === 0 && isEmbeddedDataPermitted()) {
      allDocs = DEMO_DOCUMENTS as unknown as LegalDocument[];
    }

    const systemInstruction = `Bạn là Trợ lý Pháp lý & Kế toán - Thuế AI chuyên nghiệp của LegalBook (chuẩn xác, trung thực, có căn cứ điều khoản).
Quy tắc trả lời:
1. TRẢ LỜI RÕ RÀNG, TRỰC DIỆN: Đưa ra câu trả lời dứt khoát, dễ hiểu cho Kế toán, Kiểm toán viên và Doanh nghiệp.
2. BẮT BUỘC TRÍCH DẪN ĐIỀU KHOẢN: Mọi khẳng định về tỷ lệ thuế, thời hạn, điều kiện, hồ sơ phải ghi rõ căn cứ [Điều X, Khoản Y số hiệu văn bản].
3. DỰA TRÊN VĂN BẢN ĐƯỢC CUNG CẤP: Sử dụng tri thức từ các văn bản pháp luật được cung cấp dưới đây. Nếu văn bản không quy định, hãy nêu rõ phạm vi chưa quy định và hướng dẫn tìm kiếm thêm.
4. Trình bày định dạng Markdown mạch lạc, có gạch đầu dòng và phân mục rõ ràng.`;

    // ── Mode: CROSS_ANALYSIS (Phân tích liên văn bản đa văn bản) ───────────
    if (mode === 'cross_analysis' && (targetDoc || (body.selectedDocIds && body.selectedDocIds.length > 0))) {
      const primary = targetDoc || allDocs.find((d) => d.id === body.selectedDocIds?.[0]);
      const otherIds = (body.selectedDocIds || []).filter((id) => id !== primary?.id);
      const otherDocs = allDocs.filter((d) => otherIds.includes(d.id)).slice(0, 4);
      const docsToAnalyze = primary ? [primary, ...otherDocs] : otherDocs.slice(0, 5);

      const docSectionsText = docsToAnalyze
        .map((d, idx) => {
          const text = d.html_content ? cleanHtmlToText(d.html_content).slice(0, 10000) : '';
          return `[VĂN BẢN ${idx + 1}]: ${d.document_number || '---'} | ${d.title} | Cơ quan: ${d.issuing_body || 'N/A'} | Hiệu lực: ${d.effective_date || 'N/A'} | Trạng thái: ${d.status}\nNội dung trích đoạn:\n${text}\n`;
        })
        .join('\n');

      const crossPrompt = `Hãy thực hiện phân tích liên văn bản chuyên sâu cho ${docsToAnalyze.length} văn bản pháp luật sau:

${docSectionsText}

MỤC TIÊU PHÂN TÍCH: ${body.objective || 'Tổng quan điểm giống và khác'}
CÂU HỎI CỤ THỂ / YÊU CẦU: ${question || 'Hãy đối chiếu và phân tích toàn diện mối quan hệ, vai trò và tác động thực tế của các văn bản trên.'}

BẮT BUỘC TRẢ LỜI CÓ CẤU TRÚC MARKDOWN RÕ RÀNG VỚI 6 PHẦN:
1. KẾT LUẬN NGẮN (Trả lời trực diện câu hỏi)
2. VAI TRÒ CỦA TỪNG VĂN BẢN (Phân cấp thứ bậc, phạm vi)
3. ĐIỂM GIỐNG VÀ KHÁC (So sánh chi tiết các tiêu chí)
4. TÁC ĐỘNG THỰC TẾ (Đối tượng, điều kiện, hồ sơ, rủi ro)
5. CẢNH BÁO PHÁP LÝ (Văn bản hết hiệu lực hoặc sửa đổi)
6. NGUỒN DẪN CHIẾU (Số hiệu, Điều, Khoản cụ thể)`;

      const aiResult = await callGeminiApi(crossPrompt, systemInstruction);
      if (aiResult) {
        return NextResponse.json({
          success: true,
          source: 'gemini',
          keyUsed: aiResult.keyUsed,
          modelUsed: aiResult.modelUsed,
          answer: aiResult.text,
          executiveConclusion: aiResult.text.slice(0, 500),
          citations: docsToAnalyze.map((d) => ({
            id: `cit-${d.id}`,
            documentId: d.id,
            documentNumber: d.document_number || d.title,
            documentTitle: d.title,
            snippet: d.title,
            fullCitationText: `${d.document_number || d.title}`,
          })),
        });
      }
    }

    // ── Mode: COMPARE (So sánh 2 văn bản) ───────────────────────────────────
    if (mode === 'compare' && (docA || docB)) {
      const primaryA = docA || targetDoc;
      const primaryB = docB;

      const textA = primaryA?.html_content ? cleanHtmlToText(primaryA.html_content).slice(0, 15000) : '';
      const textB = primaryB?.html_content ? cleanHtmlToText(primaryB.html_content).slice(0, 25000) : '';

      const comparePrompt = `Hãy phân tích, tóm tắt và đối chiếu sự khác biệt/mối quan hệ giữa 2 văn bản pháp luật sau:

VĂN BẢN 1: ${primaryA?.document_number || ''} — ${primaryA?.title || ''}
Nội dung tóm lược:
${textA}

VĂN BẢN 2: ${primaryB?.document_number || ''} — ${primaryB?.title || ''}
Nội dung tóm lược:
${textB}

CÂU HỎI / YÊU CẦU:
${question || 'Hãy tóm tắt 4 điểm khác biệt hoặc quy định chi tiết cốt lõi giữa 2 văn bản này dành cho kế toán & doanh nghiệp.'}`;

      const aiResult = await callGeminiApi(comparePrompt, systemInstruction);

      if (aiResult) {
        return NextResponse.json({
          success: true,
          source: 'gemini',
          keyUsed: aiResult.keyUsed,
          modelUsed: aiResult.modelUsed,
          answer: aiResult.text,
          citations: [
            primaryA ? { documentId: primaryA.id, documentNumber: primaryA.document_number, documentTitle: primaryA.title, exactQuote: 'Toàn văn văn bản 1', confidence: 0.95 } : null,
            primaryB ? { documentId: primaryB.id, documentNumber: primaryB.document_number, documentTitle: primaryB.title, exactQuote: 'Toàn văn văn bản 2', confidence: 0.95 } : null,
          ].filter(Boolean),
          suggestedFollowUps: [
            `Điểm mới nổi bật của ${primaryB?.document_number || 'văn bản hướng dẫn'}?`,
            `Nghĩa vụ kê khai và thời hạn nộp thuế?`,
            `Hồ sơ và chứng từ cần chuẩn bị?`,
          ],
        });
      }
    }

    // ── Mode: SUMMARY (Tóm tắt văn bản chuyên sâu) ──────────────────────────
    if (mode === 'summary' && targetDoc) {
      const docText = targetDoc.html_content ? cleanHtmlToText(targetDoc.html_content).slice(0, 35000) : '';
      const docMeta = `Số hiệu: ${targetDoc.document_number}
Tiêu đề: ${targetDoc.title}
Cơ quan ban hành: ${targetDoc.issuing_body || 'Chưa cập nhật'}
Loại văn bản: ${targetDoc.document_type || 'Văn bản quy phạm'}
Ngày ban hành: ${targetDoc.issued_date || 'N/A'}
Ngày có hiệu lực: ${targetDoc.effective_date || 'N/A'}
Người ký: ${targetDoc.signer || 'N/A'}`;

      const summaryPrompt = `Bạn là Chuyên gia Cao cấp về Pháp luật & Thuế - Kế toán Việt Nam.
Hãy phân tích toàn văn văn bản pháp luật sau và tạo một bản TỔNG QUAN PHÁP LÝ chuẩn nghiệp vụ dành cho Doanh nghiệp, Kế toán và Luật sư (đọc nhanh trong 1-3 phút, trung tính, chính xác, có dẫn chiếu).

[THÔNG TIN VĂN BẢN]
${docMeta}

[TOÀN VĂN VĂN BẢN]
${docText}

[YÊU CẦU TRÌNH BÀY]:
Trình bày định dạng Markdown chuyên nghiệp, rõ ràng theo đúng 5 phần sau (KHÔNG dùng từ ngữ phóng đại, KHÔNG tự khẳng định "điểm mới" nếu chưa có văn bản so sánh):

### 1. Văn bản quy định gì?
- Tóm tắt 3-5 câu (khoảng 100-140 từ): nêu phạm vi điều chỉnh, đối tượng áp dụng, nội dung chính và thời điểm áp dụng. Diễn đạt trung tính, khách quan.

### 2. Nội dung đáng chú ý
- Nêu 3-6 nội dung quy định trọng yếu nhất (mỗi ý 2-3 dòng).
- BẮT BUỘC ghi rõ căn cứ [Điều X, Khoản Y] ngay cạnh mỗi nội dung.

### 3. Đối tượng chịu tác động
- Liệt kê các nhóm đối tượng chịu tác động trực tiếp và gián tiếp có căn cứ trong văn bản.

### 4. Việc cần lưu ý
- Phân biệt rõ 2 nhóm:
  + [Quy định trong văn bản]: Các nghĩa vụ, hồ sơ, thời hạn bắt buộc theo luật (kèm căn cứ [Điều X]).
  + [Gợi ý rà soát]: Khuyến nghị chuyên môn nghiệp vụ để doanh nghiệp chuẩn bị tuân thủ (ghi rõ là gợi ý tham khảo).

### 5. Căn cứ chính
- Liệt kê danh sách các Điều/Khoản cốt lõi trong văn bản.`;

      const aiResult = await callGeminiApi(summaryPrompt, systemInstruction);

      if (aiResult) {
        const citations: LegalCitation[] = [];
        const articleMatches = aiResult.text.matchAll(/\[(?:Căn cứ\s+)?(Điều\s+\d+[a-z]?(?:,\s*Khoản\s+\d+)?)[^\]]*\]/gi);
        for (const m of articleMatches) {
          citations.push({
            documentId: targetDoc.id,
            documentNumber: targetDoc.document_number || 'Văn bản',
            documentTitle: targetDoc.title || '',
            documentType: targetDoc.document_type || 'van_ban',
            articleNumber: m[1],
            articleTitle: m[1],
            exactQuote: m[0],
            confidence: 0.99,
          });
        }

        return NextResponse.json({
          success: true,
          source: 'gemini',
          keyUsed: aiResult.keyUsed,
          modelUsed: aiResult.modelUsed,
          answer: aiResult.text,
          citations,
          suggestedFollowUps: [
            `Đối tượng nào được miễn hoặc ưu đãi theo ${targetDoc.document_number}?`,
            `Mức xử phạt và rủi ro hành chính cần lưu ý?`,
            `Hồ sơ, biểu mẫu và thủ tục nộp theo quy định mới?`,
          ],
        });
      }

      // Local fallback for summary mode
      const localSummary = generateLocalDocumentSummary(targetDoc);
      return NextResponse.json({
        success: true,
        source: 'local_rag',
        answer: localSummary.fullMarkdown,
        summaryPoints: localSummary.newPoints,
        citations: localSummary.keyArticles.map((a) => ({
          documentId: targetDoc.id,
          documentNumber: targetDoc.document_number || '',
          documentTitle: targetDoc.title,
          documentType: targetDoc.document_type || 'Văn bản',
          articleNumber: a.articleNumber,
          articleTitle: a.articleTitle,
          exactQuote: a.summary,
          confidence: 0.95,
        })),
        suggestedFollowUps: [
          `Thời hạn hiệu lực của ${targetDoc.document_number}?`,
          `Các văn bản liên quan hoặc hướng dẫn thi hành?`,
        ],
      });
    }

    // ── Mode: ASK (In-Document OR Whole-Library RAG) ─────────────────────────
    let ragContextText = '';
    const relevantDocs: LegalDocument[] = [];

    if (targetDoc) {
      // In-document Q&A: provide targeted articles
      const fullText = cleanHtmlToText(targetDoc.html_content || '');
      if (fullText.length <= 35000) {
        ragContextText = `[VĂN BẢN ĐANG ĐỌC]: ${targetDoc.document_number} — ${targetDoc.title}
Cơ quan ban hành: ${targetDoc.issuing_body || 'N/A'} | Hiệu lực: ${targetDoc.effective_date || 'N/A'} | Trạng thái: ${targetDoc.status}
Toàn văn nội dung:
${fullText}`;
      } else {
        // Large document: extract structured articles and find keyword matches
        const articles = extractStructuredArticles(targetDoc.html_content || '');
        const qLower = (question || '').toLowerCase();
        const matchedArticles = articles.filter(
          (a) =>
            a.title.toLowerCase().includes(qLower) ||
            a.body.toLowerCase().includes(qLower) ||
            qLower.includes(a.title.toLowerCase().slice(0, 15))
        );

        const prioritized = matchedArticles.length > 0 ? matchedArticles.slice(0, 12) : articles.slice(0, 10);
        const articlesText = prioritized.map((a) => `${a.title}\n${a.body}`).join('\n\n');

        ragContextText = `[VĂN BẢN ĐANG ĐỌC]: ${targetDoc.document_number} — ${targetDoc.title}
Cơ quan ban hành: ${targetDoc.issuing_body || 'N/A'} | Hiệu lực: ${targetDoc.effective_date || 'N/A'}
Các điều khoản trọng yếu liên quan câu hỏi:
${articlesText}`;
      }
      relevantDocs.push(targetDoc);
    } else {
      // Whole-library search: retrieve top candidate documents
      const candidateNumbers = getCandidateDocNumbersForSituation(question || '');
      const searchResults = executeSearch(allDocs, question || '');

      const foundDocsMap = new Map<string, LegalDocument>();

      // 1. Add docs matched by situation dictionary
      candidateNumbers.forEach((num) => {
        const found = allDocs.find((d) => d.document_number?.toUpperCase().includes(num.toUpperCase()));
        if (found) foundDocsMap.set(found.id, found);
      });

      // 2. Add top search results
      searchResults.slice(0, 5).forEach((res) => {
        const found = allDocs.find((d) => d.id === res.documentId);
        if (found) foundDocsMap.set(found.id, found);
      });

      // 3. If still empty, include core tax & legal framework docs
      if (foundDocsMap.size === 0) {
        allDocs.slice(0, 4).forEach((d) => foundDocsMap.set(d.id, d));
      }

      const topMatchedDocs = Array.from(foundDocsMap.values()).slice(0, 5);
      relevantDocs.push(...topMatchedDocs);

      const multiDocExcerpts = topMatchedDocs
        .map((d, idx) => {
          const text = d.html_content ? cleanHtmlToText(d.html_content).slice(0, 6000) : (d.summary_main || '');
          return `[VĂN BẢN ${idx + 1}]: ${d.document_number} — ${d.title} (Hiệu lực: ${d.effective_date || 'N/A'}, Cơ quan: ${d.issuing_body})
Nội dung quy định:
${text}`;
        })
        .join('\n\n---\n\n');

      ragContextText = `[CÁC VĂN BẢN QUY PHẠM PHÁP LUẬT LIÊN QUAN TRONG THƯ VIỆN]:
${multiDocExcerpts}`;
    }

    const askPrompt = `${ragContextText}

[CÂU HỎI CỦA NGƯỜI DÙNG]
${question || 'Hãy tóm tắt ngắn gọn các quy định cốt lõi.'}

Hãy trả lời câu hỏi trên một cách chi tiết, chính xác, có dẫn chứng [Điều X, Khoản Y, Số hiệu văn bản].`;

    const aiResult = await callGeminiApi(askPrompt, systemInstruction);

    if (aiResult) {
      // Parse citations from markdown text
      const citations: LegalCitation[] = [];
      const articleMatches = aiResult.text.matchAll(/\[(?:Căn cứ\s+)?(Điều\s+\d+[a-z]?(?:,\s*Khoản\s+\d+)?)(?:[,\s]+(?:của\s+)?(?:Nghị định|Thông tư|Luật|Quyết định|Công văn)?\s*([0-9\/\w-]+))?[^\]]*\]/gi);

      for (const m of articleMatches) {
        const artNum = m[1];
        const docNumMatch = m[2];
        const matchedDoc = docNumMatch
          ? allDocs.find((d) => d.document_number?.toUpperCase().includes(docNumMatch.toUpperCase()))
          : relevantDocs[0];

        citations.push({
          documentId: matchedDoc?.id || relevantDocs[0]?.id || 'doc-ref',
          documentNumber: matchedDoc?.document_number || relevantDocs[0]?.document_number || 'Văn bản',
          documentTitle: matchedDoc?.title || relevantDocs[0]?.title || '',
          documentType: matchedDoc?.document_type || 'van_ban',
          articleNumber: artNum,
          articleTitle: artNum,
          exactQuote: m[0],
          confidence: 0.98,
        });
      }

      // If no bracketed citations were extracted, add relevant doc citations
      if (citations.length === 0 && relevantDocs.length > 0) {
        relevantDocs.slice(0, 3).forEach((d) => {
          citations.push({
            documentId: d.id,
            documentNumber: d.document_number || d.title,
            documentTitle: d.title,
            documentType: d.document_type || 'van_ban',
            articleNumber: 'Căn cứ áp dụng',
            articleTitle: d.title,
            exactQuote: d.title,
            confidence: 0.95,
          });
        });
      }

      return NextResponse.json({
        success: true,
        source: 'gemini',
        keyUsed: aiResult.keyUsed,
        modelUsed: aiResult.modelUsed,
        answer: aiResult.text,
        citations,
        suggestedFollowUps: [
          `Trách nhiệm và nghĩa vụ của doanh nghiệp theo quy định này?`,
          `Mức xử phạt và rủi ro nếu áp dụng sai?`,
          `Hồ sơ và chứng từ cần chuẩn bị để quyết toán thuế?`,
        ],
      });
    }

    // ── Local Fallback when API keys are exhausted ───────────────────────────
    const localRes = await queryLegalAssistant(question || 'Tóm tắt nội dung', targetDoc, allDocs);

    return NextResponse.json({
      success: true,
      source: 'local_rag',
      answer: localRes.answer,
      summaryPoints: localRes.summaryPoints,
      citations: localRes.citations,
      suggestedFollowUps: localRes.suggestedFollowUps,
    });
  } catch (err: unknown) {
    console.error('Error in /api/ai/chat endpoint:', err);
    try {
      const localRes = await queryLegalAssistant('Tóm tắt nội dung', null);
      return NextResponse.json({
        success: true,
        source: 'local_rag',
        answer: localRes.answer || 'Hệ thống đang hoạt động ở chế độ ngoại tuyến. Vui lòng tra cứu trực tiếp trong mục lục điều khoản.',
        summaryPoints: localRes.summaryPoints || [],
        citations: localRes.citations || [],
        suggestedFollowUps: localRes.suggestedFollowUps || [],
      });
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: err instanceof Error ? err.message : String(err),
        },
        { status: 200 }
      );
    }
  }
}
