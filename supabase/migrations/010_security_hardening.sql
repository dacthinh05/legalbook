-- ============================================================
-- LegalBook Migration: 010_security_hardening.sql
-- Description: Bản vá bảo mật toàn diện:
--   (C2) Chặn user tự nâng role trên profiles (BEFORE UPDATE trigger)
--   (H3) Tạo bảng & ENABLE RLS + policies cho các bảng:
--        organizations, organization_members, data_quality_audit_history
--   (M)  SECURITY DEFINER + SET search_path cho 2 hàm hybrid search
--   (L)  Sửa policy annotations_update (migration 006)
-- ============================================================

-- ─── 0. Đảm bảo Extensions ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA extensions;

-- ─── 1. Khởi tạo Bảng (Dependency Order) ──────────────────────────────────────

-- 1.1 Table: data_quality_audit_history
CREATE TABLE IF NOT EXISTS public.data_quality_audit_history (
    id                  UUID        NOT NULL DEFAULT uuid_generate_v4(),
    document_id         UUID        NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    previous_status     TEXT,
    new_status          TEXT,
    quality_score       NUMERIC(5,2),
    reasons             TEXT[],
    audited_by          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    audited_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    audit_mode          TEXT        DEFAULT 'automated',

    CONSTRAINT data_quality_audit_history_pkey PRIMARY KEY (id)
);

-- 1.2 Table: organizations
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

-- 1.3 Table: organization_members
CREATE TABLE IF NOT EXISTS public.organization_members (
    id              UUID        NOT NULL DEFAULT uuid_generate_v4(),
    organization_id UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'lawyer', 'member')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT organization_members_pkey PRIMARY KEY (id),
    CONSTRAINT org_members_unique UNIQUE (organization_id, user_id)
);

-- 1.4 Enum types & Table: document_annotations
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_type') THEN
        CREATE TYPE annotation_type AS ENUM ('highlight', 'note');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_color') THEN
        CREATE TYPE annotation_color AS ENUM ('yellow', 'green', 'pink');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_visibility') THEN
        CREATE TYPE annotation_visibility AS ENUM ('private', 'team', 'organization');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_anchor_status') THEN
        CREATE TYPE annotation_anchor_status AS ENUM ('active', 'reanchored', 'orphaned', 'deleted');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.document_annotations (
    id                  UUID            NOT NULL DEFAULT uuid_generate_v4(),
    document_id         UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id     UUID            REFERENCES public.organizations(id) ON DELETE SET NULL,
    node_id             TEXT,
    anchor_exact        TEXT            NOT NULL,
    anchor_prefix       TEXT,
    anchor_suffix       TEXT,
    anchor_start_offset INT,
    anchor_end_offset   INT,
    content_version     TEXT            NOT NULL,
    content_hash        TEXT,
    type                annotation_type NOT NULL DEFAULT 'highlight',
    color               annotation_color NOT NULL DEFAULT 'yellow',
    note_content        TEXT,
    visibility          annotation_visibility NOT NULL DEFAULT 'private',
    anchor_status       annotation_anchor_status NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT document_annotations_pkey PRIMARY KEY (id)
);

-- ─── 2. C2: Chặn tự nâng quyền qua profiles.role ─────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_role_self_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND public.get_user_role() <> 'admin' THEN
        RAISE EXCEPTION 'Khong duoc phep tu thay doi role (chi admin moi co quyen nay)';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_elevation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_elevation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_elevation();

-- ─── 3. M: Hardening SECURITY DEFINER với SET search_path ────────────────────
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

-- ─── 4. RLS Policies & Triggers ──────────────────────────────────────────────

-- 4.1 RLS: data_quality_audit_history
ALTER TABLE public.data_quality_audit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_history_admin_read" ON public.data_quality_audit_history;
CREATE POLICY "audit_history_admin_read"
    ON public.data_quality_audit_history
    FOR SELECT
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'editor'));

-- 4.2 RLS: organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orgs_member_read" ON public.organizations;
CREATE POLICY "orgs_member_read"
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organizations.id
              AND om.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

DROP POLICY IF EXISTS "orgs_admin_manage" ON public.organizations;
CREATE POLICY "orgs_admin_manage"
    ON public.organizations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organizations.id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
        OR created_by = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organizations.id
              AND om.user_id = auth.uid()
              AND om.role IN ('owner', 'admin')
        )
        OR created_by = auth.uid()
    );

DROP POLICY IF EXISTS "orgs_create_own" ON public.organizations;
CREATE POLICY "orgs_create_own"
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- 4.3 RLS: organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_org_manager(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = org_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
    );
$$;

DROP POLICY IF EXISTS "org_members_read" ON public.organization_members;
CREATE POLICY "org_members_read"
    ON public.organization_members
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.organization_members peer
            WHERE peer.organization_id = organization_members.organization_id
              AND peer.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "org_members_insert" ON public.organization_members;
CREATE POLICY "org_members_insert"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS "org_members_update" ON public.organization_members;
CREATE POLICY "org_members_update"
    ON public.organization_members
    FOR UPDATE
    TO authenticated
    USING (public.is_org_manager(organization_id))
    WITH CHECK (public.is_org_manager(organization_id));

DROP POLICY IF EXISTS "org_members_delete" ON public.organization_members;
CREATE POLICY "org_members_delete"
    ON public.organization_members
    FOR DELETE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_org_manager(organization_id)
    );

-- 4.4 RLS: document_annotations
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.prevent_annotation_retarget()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.document_id IS DISTINCT FROM OLD.document_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Khong duoc phep doi document_id hoac user_id cua annotation';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_annotation_retarget ON public.document_annotations;
CREATE TRIGGER trg_prevent_annotation_retarget
    BEFORE UPDATE ON public.document_annotations
    FOR EACH ROW EXECUTE FUNCTION public.prevent_annotation_retarget();

DROP POLICY IF EXISTS "annotations_update" ON public.document_annotations;
CREATE POLICY "annotations_update"
    ON public.document_annotations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
