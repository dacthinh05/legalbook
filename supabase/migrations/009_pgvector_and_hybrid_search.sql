-- ============================================================
-- LegalBook Migration: 009_pgvector_and_hybrid_search.sql
-- Description: Article-Level Chunking Storage, pgvector Embeddings,
--              and Server-side Reciprocal Rank Fusion (RRF) Hybrid Search.
-- ============================================================

-- ─── 1. Extensions ───────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA extensions;

-- Ensure extensions schema is in search path
SET search_path = public, extensions;

-- ─── 2. Document Provisions (Article-Level Chunks) ───────────────────────────
CREATE TABLE IF NOT EXISTS public.document_provisions (
    id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    document_id     UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    article_number  TEXT,                                   -- e.g. "Điều 14"
    article_title   TEXT,                                   -- e.g. "Điều 14. Kiểm tra an toàn thông tin"
    content         TEXT,                                   -- Complete plain text of the article
    clause_count    INT             NOT NULL DEFAULT 1,
    chapter_num     TEXT,                                   -- e.g. "Chương II"
    chapter_title   TEXT,                                   -- e.g. "Quy định chi tiết"
    dom_id          TEXT,                                   -- e.g. "dieu-14" matching Reader DOM
    search_vector   TSVECTOR,
    embedding       extensions.VECTOR(1536),                -- text-embedding-3-small (1536 dim)
    quality_score   NUMERIC(5,2)    NOT NULL DEFAULT 1.0,
    is_verified     BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT document_provisions_pkey PRIMARY KEY (id)
);

-- Schema alignment: If document_provisions was already created by migration 008
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'article_number') THEN
        ALTER TABLE public.document_provisions ADD COLUMN article_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'article_title') THEN
        ALTER TABLE public.document_provisions ADD COLUMN article_title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'content') THEN
        ALTER TABLE public.document_provisions ADD COLUMN content TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'clause_count') THEN
        ALTER TABLE public.document_provisions ADD COLUMN clause_count INT NOT NULL DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'chapter_num') THEN
        ALTER TABLE public.document_provisions ADD COLUMN chapter_num TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'chapter_title') THEN
        ALTER TABLE public.document_provisions ADD COLUMN chapter_title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'dom_id') THEN
        ALTER TABLE public.document_provisions ADD COLUMN dom_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'search_vector') THEN
        ALTER TABLE public.document_provisions ADD COLUMN search_vector TSVECTOR;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'embedding') THEN
        ALTER TABLE public.document_provisions ADD COLUMN embedding extensions.VECTOR(1536);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'quality_score') THEN
        ALTER TABLE public.document_provisions ADD COLUMN quality_score NUMERIC(5,2) NOT NULL DEFAULT 1.0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'is_verified') THEN
        ALTER TABLE public.document_provisions ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_provisions' AND column_name = 'updated_at') THEN
        ALTER TABLE public.document_provisions ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- ─── 3. Search Vector Generation for Provisions ──────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_provision_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.article_number, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.article_title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.chapter_title, '')), 'B') ||
        setweight(to_tsvector('simple', substring(COALESCE(NEW.content, '') from 1 for 10000)), 'C');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_search_vector ON public.document_provisions;
CREATE TRIGGER trg_provision_search_vector
    BEFORE INSERT OR UPDATE OF article_number, article_title, chapter_title, content
    ON public.document_provisions
    FOR EACH ROW EXECUTE FUNCTION public.compute_provision_search_vector();

-- ─── 4. Indexes ──────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_doc_provisions_doc_id
    ON public.document_provisions (document_id);

CREATE INDEX IF NOT EXISTS idx_doc_provisions_dom_id
    ON public.document_provisions (dom_id);

CREATE INDEX IF NOT EXISTS idx_doc_provisions_search_vector
    ON public.document_provisions USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_doc_provisions_trgm_title
    ON public.document_provisions USING GIN (article_title extensions.gin_trgm_ops);

-- HNSW Cosine similarity index for vector search (if vector extension is enabled)
DO $$ BEGIN
    CREATE INDEX IF NOT EXISTS idx_doc_provisions_embedding_hnsw
        ON public.document_provisions USING hnsw (embedding extensions.vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'HNSW vector index could not be created directly, skipping.';
END $$;

-- ─── 5. Reciprocal Rank Fusion (RRF) Hybrid Search Stored Procedure ──────────
CREATE OR REPLACE FUNCTION public.search_provisions_hybrid(
    query_text TEXT,
    query_embedding extensions.VECTOR(1536) DEFAULT NULL,
    match_count INT DEFAULT 15,
    filter_doc_ids UUID[] DEFAULT NULL,
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    id TEXT,
    document_id UUID,
    document_number TEXT,
    document_title TEXT,
    document_type public.document_type,
    issuing_body TEXT,
    effective_date DATE,
    status public.document_status,
    dom_id TEXT,
    article_number TEXT,
    article_title TEXT,
    content_snippet TEXT,
    similarity REAL,
    rrf_score REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    clean_query TEXT := trim(query_text);
    ts_query tsquery;
BEGIN
    IF clean_query IS NOT NULL AND clean_query <> '' THEN
        ts_query := plainto_tsquery('simple', clean_query);
    ELSE
        ts_query := NULL;
    END IF;

    RETURN QUERY
    WITH fulltext_matches AS (
        SELECT
            dp.id::TEXT AS provision_id,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(dp.search_vector, ts_query) DESC) AS rank_ft
        FROM public.document_provisions dp
        JOIN public.legal_documents ld ON ld.id = dp.document_id
        WHERE ld.is_published = TRUE AND ld.is_deleted = FALSE
          AND (filter_doc_ids IS NULL OR dp.document_id = ANY(filter_doc_ids))
          AND (ts_query IS NOT NULL AND dp.search_vector @@ ts_query)
        LIMIT 50
    ),
    vector_matches AS (
        SELECT
            dp.id::TEXT AS provision_id,
            (1.0 - (dp.embedding <=> query_embedding))::REAL AS cos_similarity,
            ROW_NUMBER() OVER (ORDER BY dp.embedding <=> query_embedding) AS rank_vec
        FROM public.document_provisions dp
        JOIN public.legal_documents ld ON ld.id = dp.document_id
        WHERE ld.is_published = TRUE AND ld.is_deleted = FALSE
          AND (filter_doc_ids IS NULL OR dp.document_id = ANY(filter_doc_ids))
          AND (query_embedding IS NOT NULL AND dp.embedding IS NOT NULL)
        LIMIT 50
    ),
    combined_scores AS (
        SELECT
            COALESCE(ft.provision_id, vm.provision_id) AS provision_id,
            COALESCE(vm.cos_similarity, 0.0)::REAL AS similarity,
            (
                COALESCE(1.0 / (rrf_k + ft.rank_ft), 0.0) +
                COALESCE(1.0 / (rrf_k + vm.rank_vec), 0.0)
            )::REAL AS score_rrf
        FROM fulltext_matches ft
        FULL OUTER JOIN vector_matches vm ON ft.provision_id = vm.provision_id
    )
    SELECT
        dp.id::TEXT,
        dp.document_id,
        ld.document_number,
        ld.title AS document_title,
        ld.document_type,
        ld.issuing_body,
        ld.effective_date,
        ld.status,
        dp.dom_id,
        COALESCE(dp.article_number, dp.number_label),
        COALESCE(dp.article_title, dp.heading_title),
        substring(COALESCE(dp.content, dp.content_text) from 1 for 350) AS content_snippet,
        cs.similarity,
        cs.score_rrf AS rrf_score
    FROM combined_scores cs
    JOIN public.document_provisions dp ON dp.id::TEXT = cs.provision_id
    JOIN public.legal_documents ld ON ld.id = dp.document_id
    ORDER BY cs.score_rrf DESC, ld.effective_date DESC NULLS LAST
    LIMIT match_count;
END;
$$;

-- ─── 6. Row Level Security (RLS) ──────────────────────────────────────────────
ALTER TABLE public.document_provisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provisions_public_read" ON public.document_provisions;
CREATE POLICY "provisions_public_read"
    ON public.document_provisions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.legal_documents ld
            WHERE ld.id = document_provisions.document_id
              AND ld.is_published = TRUE
              AND ld.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS "provisions_admin_all" ON public.document_provisions;
CREATE POLICY "provisions_admin_all"
    ON public.document_provisions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'editor')
        )
    );
