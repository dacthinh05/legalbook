import { NextRequest, NextResponse } from 'next/server';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import { queryLegalAssistant, type LegalCitation, type LegalAiResponse } from '@/lib/ai/legal-rag';
import { cleanHtmlToText } from '@/lib/sanitize.server';
import { formatShortTitle } from '@/lib/utils';
import type { LegalDocument } from '@/types';

interface ChatRequestBody {
  question: string;
  documentId?: string;
  docAId?: string;
  docBId?: string;
  mode?: 'ask' | 'compare' | 'summary';
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
