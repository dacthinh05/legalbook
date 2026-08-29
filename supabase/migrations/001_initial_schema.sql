-- ============================================================
-- LegalBook - Vietnamese Legal Ebook App
-- Migration: 001_initial_schema.sql
-- Description: Initial database schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

-- User role enum
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'reader');

-- Document type enum (Vietnamese legal document types)
CREATE TYPE document_type AS ENUM (
    'luat',           -- Law
    'nghi_dinh',      -- Decree
    'thong_tu',       -- Circular
    'quyet_dinh',     -- Decision
    'cong_van',       -- Official Dispatch
    'chuan_muc',      -- Standard
    'huong_dan',      -- Guideline
    'khac'            -- Other
);

-- Document status enum
CREATE TYPE document_status AS ENUM (
    'hieu_luc',                 -- In effect
    'chua_hieu_luc',            -- Not yet in effect
    'het_hieu_luc_mot_phan',    -- Partially expired
    'het_hieu_luc_toan_bo',     -- Fully expired
    'chua_xac_dinh'             -- Undetermined
);

-- Document review status enum
CREATE TYPE review_status AS ENUM (
    'draft',
    'pending_review',
    'published'
);

-- Document file type enum
CREATE TYPE file_type AS ENUM ('pdf', 'docx', 'html');

-- Document relation type enum
CREATE TYPE relation_type AS ENUM (
    'can_cu',           -- Based on
    'huong_dan',        -- Guides
    'sua_doi',          -- Amends
    'thay_the',         -- Replaces
    'bai_bo_toan_bo',   -- Fully revokes
    'bai_bo_mot_phan',  -- Partially revokes
    'lien_quan'         -- Related to
);

-- User reading status enum
CREATE TYPE reading_status AS ENUM (
    'chua_doc',     -- Unread
    'dang_doc',     -- Reading
    'da_doc',       -- Read
    'can_xem_lai'   -- Needs review
);

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
    'new_document',
    'updated_document',
    'system'
);

-- ============================================================
-- SECTION 2: TABLES
-- ============================================================

-- ------------------------------------------------------------
-- Table: profiles
-- Extends Supabase auth.users with application-level data
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
    id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT,
    avatar_url  TEXT,
    role        user_role   NOT NULL DEFAULT 'reader',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: categories
-- Hierarchical category tree (self-referencing)
-- ------------------------------------------------------------
CREATE TABLE public.categories (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    parent_id   UUID        REFERENCES public.categories(id) ON DELETE SET NULL,
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL,
    description TEXT,
    order_index INT         NOT NULL DEFAULT 0,
    icon        TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_pkey PRIMARY KEY (id),
    CONSTRAINT categories_slug_unique UNIQUE (slug)
);

-- ------------------------------------------------------------
-- Table: legal_documents
-- Main table storing all legal documents and their metadata
-- ------------------------------------------------------------
CREATE TABLE public.legal_documents (
    id                          UUID            NOT NULL DEFAULT uuid_generate_v4(),
    title                       TEXT            NOT NULL,
    document_number             TEXT,
    document_type               document_type,
    issuing_body                TEXT,
    signer                      TEXT,
    issued_date                 DATE,
    effective_date              DATE,
    expiry_date                 DATE,
    status                      document_status,
    html_content                TEXT,
    -- AI-generated summaries
    summary_main                TEXT,
    summary_new_points          TEXT,
    summary_affected_parties    TEXT,
    summary_accounting_impact   TEXT,
    summary_audit_impact        TEXT,
    summary_actions_needed      TEXT,
    summary_is_ai_generated     BOOLEAN         NOT NULL DEFAULT FALSE,
    -- Source and publishing
    official_source_url         TEXT,
    is_deleted                  BOOLEAN         NOT NULL DEFAULT FALSE,
    is_published                BOOLEAN         NOT NULL DEFAULT FALSE,
    review_status               review_status   NOT NULL DEFAULT 'draft',
    view_count                  INT             NOT NULL DEFAULT 0,
    -- Audit fields
    created_by                  UUID            REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Full-text search vector
    search_vector               TSVECTOR,

    CONSTRAINT legal_documents_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: document_versions
-- Stores version history for legal documents
-- ------------------------------------------------------------
CREATE TABLE public.document_versions (
    id                  UUID        NOT NULL DEFAULT uuid_generate_v4(),
    document_id         UUID        NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    version_number      INT         NOT NULL,
    change_description  TEXT,
    changed_by          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_versions_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: document_files
-- Stores uploaded files associated with legal documents
-- ------------------------------------------------------------
CREATE TABLE public.document_files (
    id                  UUID        NOT NULL DEFAULT uuid_generate_v4(),
    document_id         UUID        NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    file_type           file_type   NOT NULL,
    file_url            TEXT        NOT NULL,
    file_size           BIGINT,
    original_filename   TEXT,
    is_primary          BOOLEAN     NOT NULL DEFAULT FALSE,
    version             INT         NOT NULL DEFAULT 1,
    uploaded_by         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_files_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: document_category_links
-- Many-to-many relationship between documents and categories
-- ------------------------------------------------------------
CREATE TABLE public.document_category_links (
    id              UUID    NOT NULL DEFAULT uuid_generate_v4(),
    document_id     UUID    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    category_id     UUID    NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT document_category_links_pkey PRIMARY KEY (id),
    CONSTRAINT document_category_links_unique UNIQUE (document_id, category_id)
);

-- ------------------------------------------------------------
-- Table: document_relations
-- Stores semantic relationships between legal documents
-- ------------------------------------------------------------
CREATE TABLE public.document_relations (
    id                  UUID            NOT NULL DEFAULT uuid_generate_v4(),
    source_document_id  UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    target_document_id  UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    relation_type       relation_type   NOT NULL,
    notes               TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT document_relations_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: user_reading_status
-- Tracks per-user reading progress for each document
-- ------------------------------------------------------------
CREATE TABLE public.user_reading_status (
    id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id     UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    status          reading_status  NOT NULL DEFAULT 'chua_doc',
    last_read_at    TIMESTAMPTZ,
    last_page       INT,
    read_percentage INT             CHECK (read_percentage >= 0 AND read_percentage <= 100),
    marked_read_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT user_reading_status_pkey PRIMARY KEY (id),
    CONSTRAINT user_reading_status_unique UNIQUE (user_id, document_id)
);

-- ------------------------------------------------------------
-- Table: bookmarks
-- Allows users to pin/bookmark documents for quick access
-- ------------------------------------------------------------
CREATE TABLE public.bookmarks (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID        NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bookmarks_pkey PRIMARY KEY (id),
    CONSTRAINT bookmarks_unique UNIQUE (user_id, document_id)
);

-- ------------------------------------------------------------
-- Table: notes
-- User-authored notes attached to a document (optionally per page)
-- ------------------------------------------------------------
CREATE TABLE public.notes (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID        NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    page_number INT,
    is_shared   BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT notes_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: tags
-- User-defined tags for organizing documents
-- ------------------------------------------------------------
CREATE TABLE public.tags (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    color       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tags_pkey PRIMARY KEY (id),
    CONSTRAINT tags_user_name_unique UNIQUE (user_id, name)
);

-- ------------------------------------------------------------
-- Table: document_tag_links
-- Many-to-many relationship between documents and tags, scoped per user
-- ------------------------------------------------------------
CREATE TABLE public.document_tag_links (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID        NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    tag_id      UUID        NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT document_tag_links_pkey PRIMARY KEY (id),
    CONSTRAINT document_tag_links_unique UNIQUE (user_id, document_id, tag_id)
);

-- ------------------------------------------------------------
-- Table: notifications
-- In-app notifications for users
-- ------------------------------------------------------------
CREATE TABLE public.notifications (
    id          UUID                NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID                NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title       TEXT                NOT NULL,
    message     TEXT                NOT NULL,
    type        notification_type   NOT NULL,
    document_id UUID                REFERENCES public.legal_documents(id) ON DELETE SET NULL,
    is_read     BOOLEAN             NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: audit_logs
-- Immutable audit trail for all significant actions
-- ------------------------------------------------------------
CREATE TABLE public.audit_logs (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL,
    entity_id   UUID,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- Table: pinned_categories
-- Allows users to pin categories for quick navigation
-- ------------------------------------------------------------
CREATE TABLE public.pinned_categories (
    id          UUID        NOT NULL DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID        NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    order_index INT         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pinned_categories_pkey PRIMARY KEY (id),
    CONSTRAINT pinned_categories_unique UNIQUE (user_id, category_id)
);


-- ============================================================
-- SECTION: HELPER FUNCTIONS & TRIGGERS
-- ============================================================

-- Function: get_user_role()
-- Returns the role of the currently authenticated user
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid();
$$;

-- Function: update_updated_at()
-- Generic trigger function to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function: update_search_vector()
-- Trigger function to maintain the full-text search tsvector on legal_documents
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.search_vector = to_tsvector(
        'simple',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.document_number, '') || ' ' ||
        COALESCE(NEW.issuing_body, '') || ' ' ||
        COALESCE(NEW.html_content, '')
    );
    RETURN NEW;
END;
$$;

-- ============================================================
-- SECTION 4: TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_legal_documents_updated_at
    BEFORE UPDATE ON public.legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_reading_status_updated_at
    BEFORE UPDATE ON public.user_reading_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_notes_updated_at
    BEFORE UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------------------------
-- search_vector trigger on legal_documents
-- ------------------------------------------------------------

CREATE TRIGGER trg_legal_documents_search_vector
    BEFORE INSERT OR UPDATE ON public.legal_documents
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- ============================================================
-- SECTION 5: INDEXES
-- ============================================================

-- ------------------------------------------------------------
-- GIN index for full-text search on legal_documents
-- ------------------------------------------------------------
CREATE INDEX idx_legal_documents_search_vector
    ON public.legal_documents USING GIN (search_vector);

-- ------------------------------------------------------------
-- GIN trigram indexes for ILIKE / fuzzy search
-- ------------------------------------------------------------
CREATE INDEX idx_legal_documents_title_trgm
    ON public.legal_documents USING GIN (title gin_trgm_ops);

CREATE INDEX idx_legal_documents_document_number_trgm
    ON public.legal_documents USING GIN (document_number gin_trgm_ops);

-- ------------------------------------------------------------
-- B-tree indexes on common query/filter fields
-- ------------------------------------------------------------

-- legal_documents
CREATE INDEX idx_legal_documents_document_type
    ON public.legal_documents (document_type);

CREATE INDEX idx_legal_documents_status
    ON public.legal_documents (status);

CREATE INDEX idx_legal_documents_issued_date
    ON public.legal_documents (issued_date);

CREATE INDEX idx_legal_documents_effective_date
    ON public.legal_documents (effective_date);

CREATE INDEX idx_legal_documents_review_status
    ON public.legal_documents (review_status);

CREATE INDEX idx_legal_documents_is_published
    ON public.legal_documents (is_published);

CREATE INDEX idx_legal_documents_is_deleted
    ON public.legal_documents (is_deleted);

CREATE INDEX idx_legal_documents_created_by
    ON public.legal_documents (created_by);

-- document_category_links
CREATE INDEX idx_document_category_links_category_id
    ON public.document_category_links (category_id);

CREATE INDEX idx_document_category_links_document_id
    ON public.document_category_links (document_id);

-- document_versions
CREATE INDEX idx_document_versions_document_id
    ON public.document_versions (document_id);

-- document_files
CREATE INDEX idx_document_files_document_id
    ON public.document_files (document_id);

-- document_relations
CREATE INDEX idx_document_relations_source
    ON public.document_relations (source_document_id);

CREATE INDEX idx_document_relations_target
    ON public.document_relations (target_document_id);

-- user_reading_status
CREATE INDEX idx_user_reading_status_user_id
    ON public.user_reading_status (user_id);

CREATE INDEX idx_user_reading_status_document_id
    ON public.user_reading_status (document_id);

-- bookmarks
CREATE INDEX idx_bookmarks_user_id
    ON public.bookmarks (user_id);

-- notes
CREATE INDEX idx_notes_user_id
    ON public.notes (user_id);

CREATE INDEX idx_notes_document_id
    ON public.notes (document_id);

-- tags
CREATE INDEX idx_tags_user_id
    ON public.tags (user_id);

-- document_tag_links
CREATE INDEX idx_document_tag_links_user_id
    ON public.document_tag_links (user_id);

CREATE INDEX idx_document_tag_links_document_id
    ON public.document_tag_links (document_id);

CREATE INDEX idx_document_tag_links_tag_id
    ON public.document_tag_links (tag_id);

-- notifications
CREATE INDEX idx_notifications_user_id
    ON public.notifications (user_id);

CREATE INDEX idx_notifications_is_read
    ON public.notifications (user_id, is_read);

-- audit_logs
CREATE INDEX idx_audit_logs_user_id
    ON public.audit_logs (user_id);

CREATE INDEX idx_audit_logs_entity
    ON public.audit_logs (entity_type, entity_id);

CREATE INDEX idx_audit_logs_created_at
    ON public.audit_logs (created_at);

-- pinned_categories
CREATE INDEX idx_pinned_categories_user_id
    ON public.pinned_categories (user_id);

-- categories
CREATE INDEX idx_categories_parent_id
    ON public.categories (parent_id);

CREATE INDEX idx_categories_slug
    ON public.categories (slug);

-- ============================================================
-- SECTION 6: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_files       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_relations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_status  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_tag_links   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_categories    ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- RLS Policies: profiles
-- ------------------------------------------------------------

-- All authenticated users can read all profiles
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (TRUE);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert their own profile (used by auth trigger)
CREATE POLICY "profiles_insert_own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Only admins can delete profiles
CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: categories
-- ------------------------------------------------------------

-- All authenticated users can read active categories
CREATE POLICY "categories_select_authenticated"
    ON public.categories FOR SELECT
    TO authenticated
    USING (TRUE);

-- Admins and editors can insert categories
CREATE POLICY "categories_insert_admin_editor"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Admins and editors can update categories
CREATE POLICY "categories_update_admin_editor"
    ON public.categories FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'))
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Only admins can delete categories
CREATE POLICY "categories_delete_admin"
    ON public.categories FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: legal_documents
-- ------------------------------------------------------------

-- Anyone authenticated can read published, non-deleted documents
CREATE POLICY "legal_documents_select_published"
    ON public.legal_documents FOR SELECT
    TO authenticated
    USING (is_published = TRUE AND is_deleted = FALSE);

-- Admins and editors can read all documents (including drafts)
CREATE POLICY "legal_documents_select_admin_editor"
    ON public.legal_documents FOR SELECT
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'));

-- Admins and editors can insert documents
CREATE POLICY "legal_documents_insert_admin_editor"
    ON public.legal_documents FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Admins and editors can update documents
CREATE POLICY "legal_documents_update_admin_editor"
    ON public.legal_documents FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'))
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Only admins can hard delete documents
CREATE POLICY "legal_documents_delete_admin"
    ON public.legal_documents FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: document_versions
-- ------------------------------------------------------------

-- Authenticated users can read versions of documents they can see
CREATE POLICY "document_versions_select_authenticated"
    ON public.document_versions FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.legal_documents ld
            WHERE ld.id = document_id
            AND (ld.is_published = TRUE AND ld.is_deleted = FALSE
                 OR get_user_role() IN ('admin', 'editor'))
        )
    );

-- Admins and editors can insert versions
CREATE POLICY "document_versions_insert_admin_editor"
    ON public.document_versions FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Only admins can delete versions
CREATE POLICY "document_versions_delete_admin"
    ON public.document_versions FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: document_files
-- ------------------------------------------------------------

-- Authenticated users can read files for documents they can see
CREATE POLICY "document_files_select_authenticated"
    ON public.document_files FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.legal_documents ld
            WHERE ld.id = document_id
            AND (ld.is_published = TRUE AND ld.is_deleted = FALSE
                 OR get_user_role() IN ('admin', 'editor'))
        )
    );

-- Admins and editors can upload files
CREATE POLICY "document_files_insert_admin_editor"
    ON public.document_files FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Admins and editors can update file metadata
CREATE POLICY "document_files_update_admin_editor"
    ON public.document_files FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'))
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

-- Only admins can delete files
CREATE POLICY "document_files_delete_admin"
    ON public.document_files FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: document_category_links
-- ------------------------------------------------------------

-- All authenticated users can read category links
CREATE POLICY "document_category_links_select_authenticated"
    ON public.document_category_links FOR SELECT
    TO authenticated
    USING (TRUE);

-- Admins and editors can manage category links
CREATE POLICY "document_category_links_insert_admin_editor"
    ON public.document_category_links FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

CREATE POLICY "document_category_links_update_admin_editor"
    ON public.document_category_links FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'))
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

CREATE POLICY "document_category_links_delete_admin_editor"
    ON public.document_category_links FOR DELETE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'));

-- ------------------------------------------------------------
-- RLS Policies: document_relations
-- ------------------------------------------------------------

-- All authenticated users can read document relations
CREATE POLICY "document_relations_select_authenticated"
    ON public.document_relations FOR SELECT
    TO authenticated
    USING (TRUE);

-- Admins and editors can manage document relations
CREATE POLICY "document_relations_insert_admin_editor"
    ON public.document_relations FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

CREATE POLICY "document_relations_update_admin_editor"
    ON public.document_relations FOR UPDATE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'))
    WITH CHECK (get_user_role() IN ('admin', 'editor'));

CREATE POLICY "document_relations_delete_admin_editor"
    ON public.document_relations FOR DELETE
    TO authenticated
    USING (get_user_role() IN ('admin', 'editor'));

-- ------------------------------------------------------------
-- RLS Policies: user_reading_status
-- ------------------------------------------------------------

-- Users can only see their own reading status
CREATE POLICY "user_reading_status_select_own"
    ON public.user_reading_status FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only insert their own reading status
CREATE POLICY "user_reading_status_insert_own"
    ON public.user_reading_status FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own reading status
CREATE POLICY "user_reading_status_update_own"
    ON public.user_reading_status FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own reading status
CREATE POLICY "user_reading_status_delete_own"
    ON public.user_reading_status FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- RLS Policies: bookmarks
-- ------------------------------------------------------------

-- Users can only see their own bookmarks
CREATE POLICY "bookmarks_select_own"
    ON public.bookmarks FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only create their own bookmarks
CREATE POLICY "bookmarks_insert_own"
    ON public.bookmarks FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own bookmarks
CREATE POLICY "bookmarks_delete_own"
    ON public.bookmarks FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- RLS Policies: notes
-- ------------------------------------------------------------

-- Users can only see their own notes (or shared notes)
CREATE POLICY "notes_select_own_or_shared"
    ON public.notes FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_shared = TRUE);

-- Users can only create their own notes
CREATE POLICY "notes_insert_own"
    ON public.notes FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own notes
CREATE POLICY "notes_update_own"
    ON public.notes FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own notes
CREATE POLICY "notes_delete_own"
    ON public.notes FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- RLS Policies: tags
-- ------------------------------------------------------------

-- Users can only see their own tags
CREATE POLICY "tags_select_own"
    ON public.tags FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only create their own tags
CREATE POLICY "tags_insert_own"
    ON public.tags FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own tags
CREATE POLICY "tags_update_own"
    ON public.tags FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own tags
CREATE POLICY "tags_delete_own"
    ON public.tags FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- RLS Policies: document_tag_links
-- ------------------------------------------------------------

-- Users can only see their own tag links
CREATE POLICY "document_tag_links_select_own"
    ON public.document_tag_links FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only create their own tag links
CREATE POLICY "document_tag_links_insert_own"
    ON public.document_tag_links FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own tag links
CREATE POLICY "document_tag_links_delete_own"
    ON public.document_tag_links FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- RLS Policies: notifications
-- ------------------------------------------------------------

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can update their own notifications (e.g., mark as read)
CREATE POLICY "notifications_update_own"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Only admins can insert notifications (or use service_role from backend)
CREATE POLICY "notifications_insert_admin"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

-- Only admins can delete notifications
CREATE POLICY "notifications_delete_admin"
    ON public.notifications FOR DELETE
    TO authenticated
    USING (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: audit_logs
-- ------------------------------------------------------------

-- Only admins can read audit logs
CREATE POLICY "audit_logs_select_admin"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (get_user_role() = 'admin');

-- Insert is handled by service_role (backend/triggers), no authenticated insert policy
-- This allows the service_role to bypass RLS for inserts
-- If needed from authenticated context (e.g., edge functions), add:
CREATE POLICY "audit_logs_insert_admin"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (get_user_role() = 'admin');

-- ------------------------------------------------------------
-- RLS Policies: pinned_categories
-- ------------------------------------------------------------

-- Users can only see their own pinned categories
CREATE POLICY "pinned_categories_select_own"
    ON public.pinned_categories FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can only pin their own categories
CREATE POLICY "pinned_categories_insert_own"
    ON public.pinned_categories FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own pinned categories (e.g., reorder)
CREATE POLICY "pinned_categories_update_own"
    ON public.pinned_categories FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own pinned categories
CREATE POLICY "pinned_categories_delete_own"
    ON public.pinned_categories FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- SECTION 7: AUTO-CREATE PROFILE ON SIGN-UP
-- ============================================================

-- Function: handle_new_user()
-- Automatically creates a profile row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url',
        'reader'
    );
    RETURN NEW;
END;
$$;

-- Trigger on auth.users to fire handle_new_user after each new signup
CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- END OF MIGRATION: 001_initial_schema.sql
-- ============================================================
