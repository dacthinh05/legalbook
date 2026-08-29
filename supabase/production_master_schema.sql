-- ============================================================
-- LegalBook - Master Production Database Schema
-- Description: Complete consolidated DDL, PostgreSQL extensions,
--              tables, full-text search triggers, RLS policies,
--              and storage buckets for Supabase Cloud production.
-- ============================================================

-- ─── 1. EXTENSIONS ──────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- Optional: Enable pgvector for semantic vector embeddings if available
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pgvector extension not supported in this Postgres instance, skipping.';
END $$;

-- ─── 2. ENUM TYPES ──────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'editor', 'reader');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM (
        'luat', 'nghi_dinh', 'thong_tu', 'quyet_dinh',
        'cong_van', 'chuan_muc', 'huong_dan', 'khac'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE document_status AS ENUM (
        'hieu_luc', 'chua_hieu_luc', 'het_hieu_luc_mot_phan',
        'het_hieu_luc_toan_bo', 'chua_xac_dinh'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('draft', 'pending_review', 'published');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE file_type AS ENUM ('pdf', 'docx', 'doc', 'html');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE relation_type AS ENUM (
        'can_cu', 'huong_dan', 'sua_doi', 'thay_the',
        'bai_bo_toan_bo', 'bai_bo_mot_phan', 'lien_quan'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE legal_effect_category AS ENUM (
        'substantive_change', 'application_support'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE legal_effect_type AS ENUM (
        'amends', 'supplements', 'replaces', 'repeals',
        'partially_repeals', 'suspends', 'extends', 'corrects',
        'guides', 'implements', 'references'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ─── 3. CORE TABLES ─────────────────────────────────────────

-- Profiles (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name       TEXT,
    avatar_url      TEXT,
    role            user_role       NOT NULL DEFAULT 'reader',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Categories (Legal Taxonomy Tree)
CREATE TABLE IF NOT EXISTS public.categories (
    id              TEXT            PRIMARY KEY,
    parent_id       TEXT            REFERENCES public.categories(id) ON DELETE SET NULL,
    name            TEXT            NOT NULL,
    slug            TEXT            NOT NULL UNIQUE,
    description     TEXT,
    order_index     INT             NOT NULL DEFAULT 0,
    icon            TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Legal Documents
CREATE TABLE IF NOT EXISTS public.documents (
    id                          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                       TEXT            NOT NULL,
    document_number             TEXT,
    document_type               document_type   NOT NULL,
    issuing_body                TEXT,
    signer                      TEXT,
    issued_date                 DATE,
    effective_date              DATE,
    expiry_date                 DATE,
    status                      document_status NOT NULL DEFAULT 'hieu_luc',
    html_content                TEXT,
    raw_source_content          TEXT,
    extracted_content           TEXT,
    normalized_content          TEXT,
    content_status              TEXT            DEFAULT 'verified',
    source_type                 TEXT            DEFAULT 'official',
    source_file_hash            TEXT,
    extraction_method           TEXT,
    extraction_confidence       NUMERIC(4,2),
    quality_score               NUMERIC(4,2)    DEFAULT 1.0,
    quality_status              TEXT            DEFAULT 'complete',
    quality_warnings            TEXT[]          DEFAULT '{}',
    summary_main                TEXT,
    summary_new_points          TEXT,
    summary_affected_parties    TEXT,
    summary_accounting_impact   TEXT,
    summary_audit_impact        TEXT,
    summary_actions_needed      TEXT,
    summary_is_ai_generated     BOOLEAN         DEFAULT FALSE,
    official_source_url         TEXT,
    is_deleted                  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_published                BOOLEAN         NOT NULL DEFAULT TRUE,
    review_status               review_status   NOT NULL DEFAULT 'published',
    view_count                  INT             NOT NULL DEFAULT 0,
    search_vector               TSVECTOR,
    created_by                  UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Document Category Links
CREATE TABLE IF NOT EXISTS public.document_category_links (
    id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    category_id     TEXT            NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    is_primary      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT doc_cat_unique UNIQUE (document_id, category_id)
);

-- Document Relations (Network Graph)
CREATE TABLE IF NOT EXISTS public.document_relations (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_document_id  UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    target_document_id  UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    relation_type       relation_type   NOT NULL,
    description         TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT doc_rel_unique UNIQUE (source_document_id, target_document_id, relation_type)
);

-- Document Files & Attachments (.docx, .pdf, .doc)
CREATE TABLE IF NOT EXISTS public.document_files (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    file_type           file_type       NOT NULL,
    file_url            TEXT            NOT NULL,
    original_filename   TEXT            NOT NULL,
    file_size           BIGINT          NOT NULL DEFAULT 0,
    version             INT             NOT NULL DEFAULT 1,
    uploaded_by         UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Document Provisions (Stable Semantic Article / Clause Decompositions)
CREATE TABLE IF NOT EXISTS public.document_provisions (
    id                  TEXT            PRIMARY KEY,
    document_id         UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    parent_provision_id TEXT            REFERENCES public.document_provisions(id) ON DELETE SET NULL,
    provision_type      TEXT            NOT NULL,
    number_label        TEXT            NOT NULL,
    heading_title       TEXT,
    normalized_path     TEXT            NOT NULL,
    stable_key          TEXT            NOT NULL,
    order_index         INT             NOT NULL DEFAULT 0,
    content_text        TEXT            NOT NULL,
    content_hash        TEXT            NOT NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT doc_provision_stable_key UNIQUE (document_id, stable_key)
);

-- Legal Effects (Amendment / Guidance Timeline Overlays)
CREATE TABLE IF NOT EXISTS public.legal_effects (
    id                          TEXT                    PRIMARY KEY,
    category                    legal_effect_category   NOT NULL,
    effect_type                 legal_effect_type       NOT NULL,
    source_document_id          UUID                    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    source_document_number      TEXT,
    source_document_title       TEXT,
    target_document_id          UUID                    NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    target_document_number      TEXT,
    target_provision_id         TEXT,
    target_provision_label      TEXT,
    clause_label                TEXT,
    point_label                 TEXT,
    effective_from              DATE                    NOT NULL,
    effective_to                DATE,
    impact_scope                TEXT                    NOT NULL DEFAULT 'text_range',
    legal_citation              TEXT                    NOT NULL,
    source_provision_citation   TEXT,
    source_excerpt              TEXT                    NOT NULL,
    explanation_summary         TEXT,
    source_url                  TEXT,
    previous_content            TEXT,
    replacement_content         TEXT,
    review_status               TEXT                    NOT NULL DEFAULT 'verified',
    confidence                  NUMERIC(3, 2)           NOT NULL DEFAULT 0.90,
    created_at                  TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

-- Document Annotations & User Highlights
CREATE TABLE IF NOT EXISTS public.document_annotations (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id         UUID            NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id     TEXT,
    node_id             TEXT,
    anchor_exact        TEXT            NOT NULL,
    anchor_prefix       TEXT,
    anchor_suffix       TEXT,
    anchor_start_offset INT,
    anchor_end_offset   INT,
    content_version     TEXT            NOT NULL,
    content_hash        TEXT,
    type                TEXT            NOT NULL DEFAULT 'highlight',
    color               TEXT            DEFAULT 'yellow',
    note_content        TEXT,
    visibility          TEXT            NOT NULL DEFAULT 'private',
    anchor_status       TEXT            NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Verification Audit Logs (Immutable Review History)
CREATE TABLE IF NOT EXISTS public.verification_audit_logs (
    id                  TEXT            PRIMARY KEY,
    target_id           TEXT            NOT NULL,
    target_type         TEXT            NOT NULL,
    target_title        TEXT            NOT NULL,
    action              TEXT            NOT NULL,
    reviewer            TEXT            NOT NULL,
    timestamp           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    before_value        JSONB,
    after_value         JSONB,
    reason              TEXT,
    notes               TEXT,
    evidence_source     TEXT,
    published_status    TEXT            NOT NULL DEFAULT 'verified'
);

-- ─── 4. FULL-TEXT SEARCH & TRIGGERS ──────────────────────────

CREATE OR REPLACE FUNCTION public.compute_document_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.document_number, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.issuing_body, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.signer, '')), 'C') ||
        setweight(to_tsvector('simple', substring(COALESCE(NEW.html_content, '') from 1 for 100000)), 'D');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_document_search_vector ON public.documents;
CREATE TRIGGER trg_document_search_vector
    BEFORE INSERT OR UPDATE OF document_number, title, issuing_body, signer, html_content
    ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.compute_document_search_vector();

-- ─── 5. INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON public.documents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON public.documents USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_doc_number ON public.documents (document_number);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents (status, review_status);
CREATE INDEX IF NOT EXISTS idx_documents_issued_date ON public.documents (issued_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_effective_date ON public.documents (effective_date DESC);

CREATE INDEX IF NOT EXISTS idx_doc_cat_doc_id ON public.document_category_links (document_id);
CREATE INDEX IF NOT EXISTS idx_doc_cat_cat_id ON public.document_category_links (category_id);

CREATE INDEX IF NOT EXISTS idx_doc_rel_src ON public.document_relations (source_document_id);
CREATE INDEX IF NOT EXISTS idx_doc_rel_tgt ON public.document_relations (target_document_id);

CREATE INDEX IF NOT EXISTS idx_legal_effects_target ON public.legal_effects (target_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_effects_source ON public.legal_effects (source_document_id);

-- ─── 6. STORAGE BUCKETS ──────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('documents', 'documents', true),
    ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ─── 7. ROW LEVEL SECURITY (RLS) POLICIES ────────────────────

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_logs ENABLE ROW LEVEL SECURITY;

-- Categories: Public read, Admin write
DROP POLICY IF EXISTS "Public Read Categories" ON public.categories;
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin Manage Categories" ON public.categories;
CREATE POLICY "Admin Manage Categories" ON public.categories FOR ALL USING (auth.role() = 'authenticated');

-- Documents: Public read published, Admin manage all
DROP POLICY IF EXISTS "Public Read Documents" ON public.documents;
CREATE POLICY "Public Read Documents" ON public.documents FOR SELECT USING (is_deleted = false AND is_published = true);
DROP POLICY IF EXISTS "Admin Manage Documents" ON public.documents;
CREATE POLICY "Admin Manage Documents" ON public.documents FOR ALL USING (auth.role() = 'authenticated');

-- Links & Relations: Public read
DROP POLICY IF EXISTS "Public Read Category Links" ON public.document_category_links;
CREATE POLICY "Public Read Category Links" ON public.document_category_links FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Relations" ON public.document_relations;
CREATE POLICY "Public Read Relations" ON public.document_relations FOR SELECT USING (true);

-- Files & Storage: Public read
DROP POLICY IF EXISTS "Public Read Document Files" ON public.document_files;
CREATE POLICY "Public Read Document Files" ON public.document_files FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Storage Access" ON storage.objects;
CREATE POLICY "Public Storage Access" ON storage.objects FOR SELECT USING (bucket_id = 'documents' OR bucket_id = 'avatars');

-- Legal Effects & Provisions: Public read
DROP POLICY IF EXISTS "Public Read Legal Effects" ON public.legal_effects;
CREATE POLICY "Public Read Legal Effects" ON public.legal_effects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Read Provisions" ON public.document_provisions;
CREATE POLICY "Public Read Provisions" ON public.document_provisions FOR SELECT USING (true);

-- Annotations: User owns private, org shares team
DROP POLICY IF EXISTS "User Annotations Policy" ON public.document_annotations;
CREATE POLICY "User Annotations Policy" ON public.document_annotations FOR ALL USING (auth.uid() = user_id);

-- Audit Logs: Admin/Authenticated view
DROP POLICY IF EXISTS "Admin View Audit Logs" ON public.verification_audit_logs;
CREATE POLICY "Admin View Audit Logs" ON public.verification_audit_logs FOR SELECT USING (true);
