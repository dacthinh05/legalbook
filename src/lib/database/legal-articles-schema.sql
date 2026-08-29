-- ============================================================================
-- Supabase Database Migration: Atomic Legal Articles & Hybrid Search RPC
-- Target: PostgreSQL 15+ with pgvector, unaccent, and tsvector
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Create Atomic Legal Articles Table (Điều / Khoản / Điểm)
CREATE TABLE IF NOT EXISTS public.legal_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
  document_number TEXT NOT NULL,
  document_title TEXT NOT NULL,
  article_number TEXT NOT NULL,          -- e.g. "Điều 15", "Khoản 2", "Điều 4a"
  article_title TEXT NOT NULL,           -- e.g. "Điều 15. Nghĩa vụ của người nộp thuế"
  chapter_title TEXT,                    -- e.g. "Chương II. KÊ KHAI VÀ NỘP THUẾ"
  content_html TEXT NOT NULL,            -- Clean HTML body of this specific article
  content_plain TEXT NOT NULL,           -- Plain text without tags for full-text search
  validity_status TEXT NOT NULL DEFAULT 'active' CHECK (validity_status IN ('active', 'amended', 'repealed', 'consolidated')),
  amended_by_doc_number TEXT,            -- e.g. "Sửa đổi bởi Luật 71/2014/QH13"
  order_index INTEGER NOT NULL DEFAULT 1,
  
  -- Vector embedding (768 dimensions for Google text-embedding-004 / Voyage-law)
  embedding vector(768),

  -- Full-Text Search tsvector (using unaccent for Vietnamese diacritics resilience)
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', unaccent(coalesce(document_number, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(article_number, ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(article_title, ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(content_plain, ''))), 'C')
  ) STORED,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_legal_articles_doc_id ON public.legal_articles(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_articles_doc_num ON public.legal_articles(document_number);
CREATE INDEX IF NOT EXISTS idx_legal_articles_validity ON public.legal_articles(validity_status);
CREATE INDEX IF NOT EXISTS idx_legal_articles_fts ON public.legal_articles USING GIN(fts);

-- Vector index with HNSW cosine distance
CREATE INDEX IF NOT EXISTS idx_legal_articles_embedding ON public.legal_articles 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Reciprocal Rank Fusion (RRF) Hybrid Search RPC Function
CREATE OR REPLACE FUNCTION public.match_legal_articles_hybrid(
  query_text TEXT,
  query_embedding vector(768),
  match_count INT DEFAULT 8,
  filter_document_id UUID DEFAULT NULL,
  filter_status TEXT DEFAULT 'active',
  rrf_k INT DEFAULT 60
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  document_number TEXT,
  document_title TEXT,
  article_number TEXT,
  article_title TEXT,
  content_html TEXT,
  content_plain TEXT,
  validity_status TEXT,
  fts_rank FLOAT,
  vector_distance FLOAT,
  rrf_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  clean_query TEXT := unaccent(trim(query_text));
BEGIN
  RETURN QUERY
  WITH fts_matches AS (
    SELECT
      la.id,
      ts_rank_cd(la.fts, plainto_tsquery('simple', clean_query)) AS fts_score,
      ROW_NUMBER() OVER (ORDER BY ts_rank_cd(la.fts, plainto_tsquery('simple', clean_query)) DESC) AS fts_rank_num
    FROM public.legal_articles la
    WHERE (filter_document_id IS NULL OR la.document_id = filter_document_id)
      AND (filter_status IS NULL OR la.validity_status = filter_status)
      AND la.fts @@ plainto_tsquery('simple', clean_query)
    LIMIT match_count * 2
  ),
  vector_matches AS (
    SELECT
      la.id,
      (la.embedding <=> query_embedding) AS distance,
      ROW_NUMBER() OVER (ORDER BY la.embedding <=> query_embedding ASC) AS vector_rank_num
    FROM public.legal_articles la
    WHERE (filter_document_id IS NULL OR la.document_id = filter_document_id)
      AND (filter_status IS NULL OR la.validity_status = filter_status)
      AND la.embedding IS NOT NULL
    LIMIT match_count * 2
  )
  SELECT
    la.id,
    la.document_id,
    la.document_number,
    la.document_title,
    la.article_number,
    la.article_title,
    la.content_html,
    la.content_plain,
    la.validity_status,
    COALESCE(fm.fts_score, 0)::FLOAT AS fts_rank,
    COALESCE(vm.distance, 1)::FLOAT AS vector_distance,
    (
      COALESCE(1.0 / (rrf_k + fm.fts_rank_num), 0.0) +
      COALESCE(1.0 / (rrf_k + vm.vector_rank_num), 0.0)
    )::FLOAT AS rrf_score
  FROM public.legal_articles la
  LEFT JOIN fts_matches fm ON la.id = fm.id
  LEFT JOIN vector_matches vm ON la.id = vm.id
  WHERE fm.id IS NOT NULL OR vm.id IS NOT NULL
  ORDER BY rrf_score DESC
  LIMIT match_count;
END;
$$;
