/**
 * article-chunker.ts
 *
 * Article-Level Semantic Chunking Engine for Legal Documents.
 * Conforms to Decree No. 30/2020/NĐ-CP on legal document structure.
 * Produces 1-to-1 mappings between vector embeddings and DOM anchor IDs (id="dieu-X").
 */

import { cleanHtmlToText } from '@/lib/sanitize';
import { extractStructuredArticles, type ExtractedArticle } from '@/lib/diff-engine';

export interface ArticleChunk {
  domId: string; // e.g. "dieu-14" matching Reader DOM
  articleNumber: string; // e.g. "Điều 14"
  articleTitle: string; // e.g. "Điều 14. Kiểm tra an toàn thông tin"
  content: string; // Plain text content of the article
  clauseCount: number; // Number of clauses inside
  chapterNum?: string; // e.g. "Chương II"
  chapterTitle?: string; // e.g. "Quy định chi tiết"
  tokenEstimate: number; // Approximate token count
  chunkIndex: number;
}

export interface DocumentChunkingResult {
  documentId?: string;
  documentNumber?: string;
  totalChunks: number;
  totalTokens: number;
  chunks: ArticleChunk[];
}

/**
 * Normalizes Vietnamese text for token estimation and indexing.
 */
function estimateTokens(text: string): number {
  // Vietnamese words average ~1.3 tokens per word
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.35);
}

/**
 * Parses legal HTML content into structured article-level chunks with chapter hierarchy.
 */
export function chunkLegalDocumentByArticle(
  htmlContent: string | null | undefined,
  metadata?: { documentId?: string; documentNumber?: string }
): DocumentChunkingResult {
  if (!htmlContent) {
    return {
      documentId: metadata?.documentId,
      documentNumber: metadata?.documentNumber,
      totalChunks: 0,
      totalTokens: 0,
      chunks: [],
    };
  }

  // 1. Extract chapters and their ranges
  const chapterRegex =
    /<(?:p|div|h[1-4])[^>]*>\s*(?:<strong>|<b>)?\s*(Chương\s+[IVXLCDM\d]+|Phần\s+[IVXLCDM\d]+|Mục\s+\d+|Phụ\s+lục\s*[\dIVX\-a-zA-Z\/]*)(?:<br\s*\/?>|\s*<\/strong><\/p>\s*<p[^>]*><strong>|\s*[-–—:]\s*|\s*\n\s*)([\s\S]*?)\s*(?:<\/strong>|<\/b>)?\s*<\/(?:p|div|h[1-4])>/gi;

  const chapters: Array<{ index: number; num: string; title: string }> = [];
  let chapMatch: RegExpExecArray | null;
  while ((chapMatch = chapterRegex.exec(htmlContent)) !== null) {
    chapters.push({
      index: chapMatch.index,
      num: chapMatch[1].replace(/<[^>]+>/g, '').trim(),
      title: chapMatch[2].replace(/<[^>]+>/g, '').trim(),
    });
  }

  // 2. Extract structured articles (Điều X)
  const articles: ExtractedArticle[] = extractStructuredArticles(htmlContent);
  const chunks: ArticleChunk[] = [];
  let totalTokens = 0;

  articles.forEach((art, idx) => {
    // Find enclosing chapter for this article
    let currentChapter: { num: string; title: string } | undefined;
    for (let c = chapters.length - 1; c >= 0; c--) {
      // Find chapter preceding this article
      currentChapter = chapters[c];
      break;
    }

    const numMatch = art.title.match(/^Điều\s+(\d+[a-z]?)/i);
    const numOnly = numMatch ? numMatch[1].toLowerCase() : `${idx + 1}`;
    const domId = `dieu-${numOnly}`;
    const articleNumber = numMatch ? `Điều ${numMatch[1]}` : art.label || `Điều ${idx + 1}`;
    const plainContent = cleanHtmlToText(art.body || art.title);

    // Count clauses (strip leading article title so its number is not counted as a clause)
    const bodyOnly = art.body && art.title && art.body.startsWith(art.title)
      ? art.body.slice(art.title.length).trim()
      : plainContent.replace(/^Điều\s+\d+[a-z]?[.:\s]*[^\n.]*[.:\n]?/i, '').trim();
    const clauseMatches = bodyOnly.match(/(?:^|\s)\d+\.\s+/g);
    const clauseCount = clauseMatches && clauseMatches.length > 0 ? clauseMatches.length : 1;
    const tokenCount = estimateTokens(`${art.title}\n${plainContent}`);
    totalTokens += tokenCount;

    chunks.push({
      domId,
      articleNumber,
      articleTitle: art.title,
      content: plainContent,
      clauseCount,
      chapterNum: currentChapter?.num,
      chapterTitle: currentChapter?.title,
      tokenEstimate: tokenCount,
      chunkIndex: idx,
    });
  });

  return {
    documentId: metadata?.documentId,
    documentNumber: metadata?.documentNumber,
    totalChunks: chunks.length,
    totalTokens,
    chunks,
  };
}

/**
 * Prepares OpenAI / Gemini / local batch embedding payload from chunks.
 */
export function generateEmbeddingsPayload(
  chunkingResult: DocumentChunkingResult,
  docMeta?: { documentNumber?: string; title?: string; issuingBody?: string }
): Array<{ domId: string; textToEmbed: string; metadata: Record<string, unknown> }> {
  return chunkingResult.chunks.map((chunk) => {
    const headerPrefix = [
      docMeta?.documentNumber ? `Văn bản: ${docMeta.documentNumber}` : '',
      docMeta?.issuingBody ? `Cơ quan: ${docMeta.issuingBody}` : '',
      chunk.chapterNum ? `${chunk.chapterNum} - ${chunk.chapterTitle || ''}` : '',
      `${chunk.articleTitle}`,
    ]
      .filter(Boolean)
      .join(' | ');

    const textToEmbed = `${headerPrefix}\n${chunk.content}`;

    return {
      domId: chunk.domId,
      textToEmbed,
      metadata: {
        articleNumber: chunk.articleNumber,
        articleTitle: chunk.articleTitle,
        chapterNum: chunk.chapterNum,
        clauseCount: chunk.clauseCount,
        tokenEstimate: chunk.tokenEstimate,
      },
    };
  });
}
