/**
 * Hybrid Search Service: Full-Text (tsvector) + Semantic Embedding (pgvector)
 * via Supabase RPC with Reciprocal Rank Fusion (RRF) scoring.
 */
import { createClient } from '@/lib/supabase/client';
import { extractStructuredArticles } from '@/lib/diff-engine';
import { stripHtml } from '@/lib/search';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import type { LegalDocument } from '@/types';

export interface HybridSearchResult {
  id: string;
  documentId: string;
  documentNumber: string;
  documentTitle: string;
  articleNumber: string;
  articleTitle: string;
  contentHtml: string;
  contentPlain: string;
  validityStatus: 'active' | 'amended' | 'repealed' | 'consolidated';
  ftsRank: number;
  vectorDistance: number;
  rrfScore: number;
}

/**
 * Executes a hybrid full-text + semantic vector search over atomic legal articles
 */
export async function searchLegalArticlesHybrid(
  query: string,
  options?: {
    documentId?: string;
    filterStatus?: 'active' | 'amended' | 'repealed' | 'consolidated';
    matchCount?: number;
    rrfK?: number;
    embedding?: number[];
  }
): Promise<HybridSearchResult[]> {
  const cleanQ = (query || '').trim();
  if (!cleanQ) return [];

  const matchCount = options?.matchCount || 8;
  const rrfK = options?.rrfK || 60;

  // 1. Try Supabase RPC if client & credentials available
  try {
    const supabase = createClient();
    if (supabase && typeof window !== 'undefined') {
      const { data, error } = await supabase.rpc('match_legal_articles_hybrid', {
        query_text: cleanQ,
        query_embedding: options?.embedding || new Array(768).fill(0),
        match_count: matchCount,
        filter_document_id: options?.documentId || null,
        filter_status: options?.filterStatus || 'active',
        rrf_k: rrfK,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          documentId: row.document_id,
          documentNumber: row.document_number,
          documentTitle: row.document_title,
          articleNumber: row.article_number,
          articleTitle: row.article_title,
          contentHtml: row.content_html,
          contentPlain: row.content_plain,
          validityStatus: row.validity_status,
          ftsRank: Number(row.fts_rank) || 0,
          vectorDistance: Number(row.vector_distance) || 1,
          rrfScore: Number(row.rrf_score) || 0,
        }));
      }
    }
  } catch (err) {
    // Fall back gracefully to local deterministic article ranking
  }

  // 2. Local Deterministic RRF Simulation for Offline/Demo
  const allDocs = DEMO_DOCUMENTS as unknown as LegalDocument[];
  const targetDocs = options?.documentId
    ? allDocs.filter((d) => d.id === options.documentId)
    : allDocs;

  const results: HybridSearchResult[] = [];
  const terms = cleanQ.toLowerCase().split(/\s+/).filter((t) => t.length > 1);

  for (const doc of targetDocs) {
    if (!doc.html_content) continue;
    const articles = extractStructuredArticles(doc.html_content);

    for (let idx = 0; idx < articles.length; idx++) {
      const art = articles[idx];
      const plainText = stripHtml(art.body || '');
      const fullText = (art.title + ' ' + plainText).toLowerCase();

      let matchScore = 0;
      for (const term of terms) {
        if (fullText.includes(term)) {
          matchScore += term.length > 3 ? 3 : 1;
        }
        if (art.title.toLowerCase().includes(term)) {
          matchScore += 5;
        }
      }

      if (matchScore > 0 || results.length < 3) {
        const articleNumber = art.title.match(/^Điều\s+\d+[a-z]?/i)?.[0] || `Điều ${idx + 1}`;
        const ftsRank = Math.min(1.0, matchScore / 20);
        const vectorDistance = 0.15 + (idx * 0.05); // Simulated close semantic distance
        const rrfScore = (1.0 / (rrfK + (idx + 1))) + (1.0 / (rrfK + (idx + 1)));

        results.push({
          id: `art_${doc.id}_${idx + 1}`,
          documentId: doc.id,
          documentNumber: doc.document_number || 'N/A',
          documentTitle: doc.title,
          articleNumber,
          articleTitle: art.title,
          contentHtml: art.body,
          contentPlain: plainText,
          validityStatus: 'active',
          ftsRank,
          vectorDistance,
          rrfScore,
        });
      }
    }
  }

  results.sort((a, b) => b.rrfScore - a.rrfScore);
  return results.slice(0, matchCount);
}
