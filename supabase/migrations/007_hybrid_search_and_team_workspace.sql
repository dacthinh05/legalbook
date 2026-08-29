-- ============================================================
-- LegalBook Migration: 007_hybrid_search_and_team_workspace.sql
-- Description: High-speed server-side Hybrid Search (tsvector + pg_trgm),
--              Organization Workspaces & Multi-tier Team Annotations.
-- ============================================================

-- ─── 1. Extensions ───────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ─── 2. Search Vector Generation Trigger ─────────────────────────────────────
-- Automatically compute weighted tsvector for legal documents
CREATE OR REPLACE FUNCTION public.compute_legal_document_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.document_number, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.issuing_body, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.signer, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.summary_main, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.summary_new_points, '')), 'C') ||
        setweight(to_tsvector('simple', substring(COALESCE(regexp_replace(NEW.html_content, '<[^>]+>', ' ', 'g'), '') from 1 for 50000)), 'D');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_documents_search_vector ON public.legal_documents;
CREATE TRIGGER trg_legal_documents_search_vector
    BEFORE INSERT OR UPDATE OF title, document_number, issuing_body, signer, summary_main, summary_new_points, html_content
    ON public.legal_documents
    FOR EACH ROW EXECUTE FUNCTION public.compute_legal_document_search_vector();

-- ─── 3. Trigram and GIN Indexes ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_legal_docs_search_vector
    ON public.legal_documents USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_legal_docs_trgm_title
    ON public.legal_documents USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_docs_trgm_doc_number
    ON public.legal_documents USING GIN (document_number gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_legal_docs_published_status
    ON public.legal_documents (is_published, is_deleted, status, document_type);

-- ─── 4. Stored Procedure for Hybrid Search ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.search_legal_documents_hybrid(
    query_text TEXT,
    filter_doc_type TEXT DEFAULT NULL,
    filter_status TEXT DEFAULT NULL,
    filter_category_id UUID DEFAULT NULL,
    limit_val INT DEFAULT 20,
    offset_val INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    document_number TEXT,
    document_type public.document_type,
    issuing_body TEXT,
    issued_date DATE,
    effective_date DATE,
    status public.document_status,
    summary_main TEXT,
    summary_new_points TEXT,
    official_source_url TEXT,
    total_count BIGINT,
    search_rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    WITH matched_docs AS (
        SELECT
            ld.id,
            ld.title,
            ld.document_number,
            ld.document_type,
            ld.issuing_body,
            ld.issued_date,
            ld.effective_date,
            ld.status,
            ld.summary_main,
            ld.summary_new_points,
            ld.official_source_url,
            ld.created_at,
            CASE
                WHEN clean_query IS NULL OR clean_query = '' THEN 1.0::REAL
                ELSE (
                    COALESCE(ts_rank(ld.search_vector, ts_query), 0.0) * 2.0 +
                    COALESCE(similarity(ld.title, clean_query), 0.0) * 1.5 +
                    COALESCE(similarity(ld.document_number, clean_query), 0.0) * 3.0
                )::REAL
            END AS calculated_rank
        FROM public.legal_documents ld
        LEFT JOIN public.document_category_links dcl ON dcl.document_id = ld.id
        WHERE ld.is_published = TRUE
          AND ld.is_deleted = FALSE
          AND (filter_doc_type IS NULL OR ld.document_type::TEXT = filter_doc_type)
          AND (filter_status IS NULL OR ld.status::TEXT = filter_status)
          AND (filter_category_id IS NULL OR dcl.category_id = filter_category_id)
          AND (
              clean_query IS NULL OR clean_query = '' OR
              ld.search_vector @@ ts_query OR
              ld.title ILIKE '%' || clean_query || '%' OR
              ld.document_number ILIKE '%' || clean_query || '%'
          )
        GROUP BY ld.id
    ),
    counted_docs AS (
        SELECT COUNT(*) AS total FROM matched_docs
    )
    SELECT
        m.id,
        m.title,
        m.document_number,
        m.document_type,
        m.issuing_body,
        m.issued_date,
        m.effective_date,
        m.status,
        m.summary_main,
        m.summary_new_points,
        m.official_source_url,
        c.total AS total_count,
        m.calculated_rank AS search_rank
    FROM matched_docs m
    CROSS JOIN counted_docs c
    ORDER BY m.calculated_rank DESC, m.issued_date DESC NULLS LAST, m.created_at DESC
    LIMIT limit_val
    OFFSET offset_val;
END;
$$;

-- ─── 5. Organizations & Team Workspace Collaboration ─────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL UNIQUE,
    description TEXT,
    created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id              UUID        NOT NULL DEFAULT uuid_generate_v4(),
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'lawyer', 'member')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organization_members_pkey PRIMARY KEY (id),
    CONSTRAINT org_members_unique UNIQUE (organization_id, user_id)
);

-- Add organization_id to document_annotations for team sharing
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'document_annotations' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE public.document_annotations ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ─── 6. Update Annotation RLS for Team Sharing ───────────────────────────────
DROP POLICY IF EXISTS "annotations_select" ON public.document_annotations;
CREATE POLICY "annotations_select"
    ON public.document_annotations
    FOR SELECT
    TO authenticated
    USING (
        -- 1. Private note: only owner can read
        user_id = auth.uid()
        OR
        -- 2. Team note: visible to members of the same organization
        (
            visibility IN ('team', 'organization')
            AND anchor_status != 'deleted'
            AND (
                organization_id IS NULL OR
                EXISTS (
                    SELECT 1 FROM public.organization_members om
                    WHERE om.organization_id = document_annotations.organization_id
                      AND om.user_id = auth.uid()
                )
            )
        )
    );
