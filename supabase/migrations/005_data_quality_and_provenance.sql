-- ============================================================
-- MIGRATION 005: DATA QUALITY, PROVENANCE & CONTENT INTEGRITY
-- ============================================================

-- Create Enum for content status
DO $$ BEGIN
    CREATE TYPE content_status_type AS ENUM (
        'not-fetched',
        'fetching',
        'downloaded',
        'extracting',
        'extracted',
        'partial',
        'failed',
        'needs-ocr',
        'needs-review',
        'verified'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Enum for source type
DO $$ BEGIN
    CREATE TYPE legal_source_type AS ENUM (
        'official-html',
        'official-pdf',
        'official-docx',
        'uploaded-file',
        'secondary-source',
        'manual',
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add data quality and provenance columns to legal_documents
ALTER TABLE public.legal_documents
    ADD COLUMN IF NOT EXISTS raw_source_content TEXT,
    ADD COLUMN IF NOT EXISTS extracted_content TEXT,
    ADD COLUMN IF NOT EXISTS normalized_content TEXT,
    ADD COLUMN IF NOT EXISTS content_status content_status_type DEFAULT 'not-fetched',
    ADD COLUMN IF NOT EXISTS source_type legal_source_type DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS source_file_hash TEXT,
    ADD COLUMN IF NOT EXISTS extraction_method TEXT,
    ADD COLUMN IF NOT EXISTS extraction_confidence NUMERIC(4, 3),
    ADD COLUMN IF NOT EXISTS quality_score NUMERIC(5, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS quality_warnings TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Indices for rapid quality filtering & dashboards
CREATE INDEX IF NOT EXISTS idx_legal_docs_content_status ON public.legal_documents(content_status);
CREATE INDEX IF NOT EXISTS idx_legal_docs_quality_status ON public.legal_documents(quality_status);
CREATE INDEX IF NOT EXISTS idx_legal_docs_source_type ON public.legal_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_quality_score ON public.legal_documents(quality_score);

-- Table: data_quality_audit_history
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

CREATE INDEX IF NOT EXISTS idx_quality_audit_doc_id ON public.data_quality_audit_history(document_id);
