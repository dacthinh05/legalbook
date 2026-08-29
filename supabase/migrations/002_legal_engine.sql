-- ============================================================
-- MIGRATION 002: LEGAL ENGINE - STRUCTURE, RELATIONSHIPS & AUDIT
-- ============================================================

-- Types for legal engine
CREATE TYPE legal_node_type AS ENUM (
    'phan',
    'chuong',
    'muc',
    'tieu_muc',
    'dieu',
    'khoan',
    'diem',
    'tiet',
    'doan',
    'phu_luc',
    'bieu_mau'
);

CREATE TYPE legal_rel_type AS ENUM (
    'amends',
    'supplements',
    'replaces',
    'repeals',
    'suspends',
    'guides',
    'details',
    'consolidates',
    'corrects',
    'cites',
    'can_cu',
    'related'
);

CREATE TYPE detection_method_type AS ENUM (
    'rule',
    'metadata',
    'official-source',
    'ai',
    'manual'
);

CREATE TYPE review_status_type AS ENUM (
    'pending',
    'verified',
    'rejected',
    'needs-more-information'
);

CREATE TYPE change_operation_type AS ENUM (
    'replace_node',
    'replace_phrase',
    'insert_before',
    'insert_after',
    'append',
    'delete',
    'rename',
    'renumber',
    'suspend',
    'restore'
);

-- ------------------------------------------------------------
-- 1. Table: document_nodes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_nodes (
    id              TEXT            NOT NULL, -- e.g. doc_123_2020.art_19.cl_1.pt_b
    document_id     UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    node_type       legal_node_type NOT NULL,
    order_index     INT             NOT NULL DEFAULT 0,
    number_label    TEXT            NOT NULL,
    title           TEXT,
    content         TEXT            NOT NULL,
    parent_id       TEXT,
    content_hash    TEXT            NOT NULL,
    path            TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT document_nodes_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_doc_nodes_doc_id ON public.document_nodes(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_nodes_parent_id ON public.document_nodes(parent_id);

-- ------------------------------------------------------------
-- 2. Table: legal_relationships
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_relationships (
    id                      TEXT                    NOT NULL,
    source_document_id      UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    target_document_id      UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    relationship_type       legal_rel_type          NOT NULL,
    source_node_id          TEXT                    REFERENCES public.document_nodes(id) ON DELETE SET NULL,
    target_node_id          TEXT                    REFERENCES public.document_nodes(id) ON DELETE SET NULL,
    effective_from          DATE,
    effective_to            DATE,
    extracted_instruction  TEXT                    NOT NULL,
    evidence_text           TEXT                    NOT NULL,
    evidence_location       TEXT                    NOT NULL,
    detection_method        detection_method_type   NOT NULL DEFAULT 'rule',
    confidence              NUMERIC(3, 2)           NOT NULL DEFAULT 0.90,
    review_status           review_status_type      NOT NULL DEFAULT 'pending',
    reviewed_by             UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at             TIMESTAMPTZ,
    notes                   TEXT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT legal_relationships_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_legal_rel_source ON public.legal_relationships(source_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_rel_target ON public.legal_relationships(target_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_rel_status ON public.legal_relationships(review_status);

-- ------------------------------------------------------------
-- 3. Table: legal_changesets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.legal_changesets (
    id                      TEXT                    NOT NULL,
    relationship_id         TEXT                    REFERENCES public.legal_relationships(id) ON DELETE CASCADE,
    amending_document_id    UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    target_document_id      UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    target_node_id          TEXT                    REFERENCES public.document_nodes(id) ON DELETE SET NULL,
    operation               change_operation_type   NOT NULL,
    old_content             TEXT,
    new_content             TEXT,
    anchor_before           TEXT,
    anchor_after            TEXT,
    effective_from          DATE                    NOT NULL,
    effective_to            DATE,
    evidence_text           TEXT                    NOT NULL,
    evidence_location       TEXT                    NOT NULL,
    confidence              NUMERIC(3, 2)           NOT NULL DEFAULT 0.90,
    review_status           review_status_type      NOT NULL DEFAULT 'pending',
    reviewed_by             UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT legal_changesets_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 4. Table: verification_audit_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verification_audit_logs (
    id              UUID        NOT NULL DEFAULT uuid_generate_v4(),
    relationship_id TEXT        NOT NULL REFERENCES public.legal_relationships(id) ON DELETE CASCADE,
    action          TEXT        NOT NULL,
    reviewer_id     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_data        JSONB,
    new_data        JSONB,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT verification_audit_logs_pkey PRIMARY KEY (id)
);
