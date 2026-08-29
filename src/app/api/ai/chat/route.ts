import { NextRequest, NextResponse } from 'next/server';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import { queryLegalAssistant, generateLocalDocumentSummary, type LegalCitation, type LegalAiResponse } from '@/lib/ai/legal-rag';
import { cleanHtmlToText } from '@/lib/sanitize.server';
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

/**
 * Calls Google Gemini REST API with automated key rotation (Primary -> Backup).
 */
async function callGeminiApi(
  prompt: string,
  systemInstruction: string
): Promise<{ text: string; keyUsed: string } | null> {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_BACKUP_KEY,
  ].filter(Boolean) as string[];

  if (keys.length === 0) return null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    try {
      // Using gemini-2.5-flash
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
            temperature: 0.2, // Low temperature for legal accuracy
            maxOutputTokens: 2048,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          return { text: generatedText, keyUsed: `key-${i + 1}` };
        }
      } else {
        const errText = await res.text();
        console.warn(`Gemini API key-${i + 1} error (${res.status}):`, errText);
      }
    } catch (err) {
      console.warn(`Gemini API key-${i + 1} network exception:`, err);
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const { question, documentId, docAId, docBId, mode = 'ask' } = body;

    const allDocs = DEMO_DOCUMENTS as unknown as LegalDocument[];

    // 1. Resolve Document Context
    const targetDoc = documentId ? allDocs.find((d) => d.id === documentId) : null;
    const docA = docAId ? allDocs.find((d) => d.id === docAId) : null;
    const docB = docBId ? allDocs.find((d) => d.id === docBId) : null;

    // Build RAG System Instruction
    const systemInstruction = `Bạn là Trợ lý Pháp lý & Thuế Kế toán AI cao cấp của LegalBook.
Nhiệm vụ của bạn:
1. Trả lời câu hỏi nghiệp vụ một cách chính xác, trung thực, mạch lạc, dễ hiểu cho kế toán, kiểm toán và chuyên viên pháp chế.
2. BẮT BUỘC TRÍCH DẪN RÕ RÀNG: Mọi khẳng định, hướng dẫn, mức thuế, thời hạn đều phải ghi rõ [Căn cứ Điều X, Khoản Y số hiệu văn bản ...].
3. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT (ZERO-HALLUCINATION): Chỉ trả lời dựa trên 100% nội dung pháp lý được cung cấp trong phần [VĂN BẢN QUY PHẠM]. Nếu trong văn bản không quy định nội dung người dùng hỏi, hãy nói rõ: "Văn bản này không có quy định về nội dung bạn hỏi. Bạn vui lòng tra cứu thêm tại các văn bản liên quan khác."
4. Trình bày định dạng Markdown sạch đẹp, có các gạch đầu dòng rõ ràng, bảng số liệu (nếu có).`;
    // ── Mode: CROSS_ANALYSIS (Phân tích liên văn bản AI đa văn bản) ───────────
    if (mode === 'cross_analysis' && (targetDoc || (body.selectedDocIds && body.selectedDocIds.length > 0))) {
      const primary = targetDoc || allDocs.find((d) => d.id === body.selectedDocIds?.[0]);
      const otherIds = (body.selectedDocIds || []).filter((id) => id !== primary?.id);
      const otherDocs = allDocs.filter((d) => otherIds.includes(d.id)).slice(0, 4);
      const docsToAnalyze = primary ? [primary, ...otherDocs] : otherDocs.slice(0, 5);

      const docSectionsText = docsToAnalyze.map((d, idx) => {
        const text = d.html_content ? cleanHtmlToText(d.html_content).slice(0, 10000) : '';
        return `[VĂN BẢN ${idx + 1}]: ${d.document_number || '---'} | ${d.title} | Cơ quan: ${d.issuing_body || 'N/A'} | Hiệu lực: ${d.effective_date || 'N/A'} | Trạng thái: ${d.status}\nNội dung trích đoạn:\n${text}\n`;
      }).join('\n');

      const crossPrompt = `Hãy thực hiện phân tích liên văn bản chuyên sâu cho ${docsToAnalyze.length} văn bản pháp luật sau:

${docSectionsText}

MỤC TIÊU PHÂN TÍCH: ${body.objective || 'Tổng quan điểm giống và khác'}
CÂU HỎI CỤ THỂ / YÊU CẦU: ${question || 'Hãy đối chiếu và phân tích toàn diện mối quan hệ, vai trò và tác động thực tế của các văn bản trên.'}

BẮT BUỘC TRẢ LỜI CÓ CẤU TRÚC JSON HOẶC MARKDOWN RÕ RÀNG VỚI 6 PHẦN:
1. KẾT LUẬN NGẮN (Trả lời trực diện câu hỏi hoặc tóm tắt bản chất quan hệ)
2. VAI TRÒ CỦA TỪNG VĂN BẢN (Phân cấp thứ bậc, phạm vi)
3. ĐIỂM GIỐNG VÀ KHÁC (So sánh chi tiết các tiêu chí)
4. TÁC ĐỘNG THỰC TẾ (Đối tượng, điều kiện, hồ sơ, rủi ro)
5. ĐIỂM CHƯA CHẮC CHẮN & CẢNH BÁO (Quan hệ chưa xác minh, văn bản hết hiệu lực)
6. NGUỒN DẪN CHIẾU (Số hiệu, Điều, Khoản cụ thể)`;

      const aiResult = await callGeminiApi(crossPrompt, systemInstruction);
      if (aiResult) {
        return NextResponse.json({
          success: true,
          source: 'gemini',
          keyUsed: aiResult.keyUsed,
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

    // ── Mode: IN-DOCUMENT ASK / SUMMARY ─────────────────────────────────────
    const docText = targetDoc?.html_content ? cleanHtmlToText(targetDoc.html_content).slice(0, 30000) : '';
    const docMeta = targetDoc
      ? `Số hiệu: ${targetDoc.document_number} | Tên: ${targetDoc.title} | Cơ quan: ${targetDoc.issuing_body} | Hiệu lực: ${targetDoc.effective_date}`
      : 'Thư viện pháp luật chung';
    const askPrompt = `[VĂN BẢN QUY PHẠM PHÁP LUẬT ĐANG ĐỌC]
${docMeta}
Nội dung toàn văn:
${docText}

[CÂU HỎI CỦA NGƯỜI DÙNG]
${question || 'Hãy tóm tắt ngắn gọn 3 điểm cốt lõi của văn bản này.'}`;

    const aiResult = await callGeminiApi(askPrompt, systemInstruction);

    if (aiResult) {
      // Extract rough citations from markdown brackets
      const citations: LegalCitation[] = [];
      const articleMatches = aiResult.text.matchAll(/\[(?:Căn cứ\s+)?(Điều\s+\d+[a-z]?(?:,\s*Khoản\s+\d+)?)[^\]]*\]/gi);
      for (const m of articleMatches) {
        citations.push({
          documentId: targetDoc?.id || 'doc-current',
          documentNumber: targetDoc?.document_number || 'Văn bản',
          documentTitle: targetDoc?.title || '',
          documentType: targetDoc?.document_type || 'van_ban',
          articleNumber: m[1],
          articleTitle: m[1],
          exactQuote: m[0],
          confidence: 0.98,
        });
      }

      return NextResponse.json({
        success: true,
        source: 'gemini',
        keyUsed: aiResult.keyUsed,
        answer: aiResult.text,
        citations,
        suggestedFollowUps: [
          `Trách nhiệm và nghĩa vụ của doanh nghiệp theo văn bản này?`,
          `Mức xử phạt và chế tài nếu vi phạm?`,
          `Điều kiện khấu trừ hoặc miễn giảm thuế?`,
        ],
      });
    }

    // ── Local Fallback when no API keys or network offline ───────────────────
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
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
