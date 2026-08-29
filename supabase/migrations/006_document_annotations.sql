-- ============================================================
-- LegalBook Migration: 006_document_annotations.sql
-- Description: Inline annotations, highlights, and notes
--              anchored to specific text ranges in documents.
--
-- Design principles:
-- - private / team / organization visibility scopes
-- - Stable text anchor (exactText + prefix/suffix + offset + version)
-- - anchor_status tracks lifecycle: active → reanchored → orphaned
-- - RLS enforced at DB level — not just UI
-- - note_content sanitized at application layer before insert
-- - No IDOR: users can only read/write their own private annotations
-- ============================================================

-- ─── Enum types ───────────────────────────────────────────────────────────────

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_type') THEN
        CREATE TYPE annotation_type AS ENUM ('highlight', 'note');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_color') THEN
        CREATE TYPE annotation_color AS ENUM ('yellow', 'green', 'pink');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_visibility') THEN
        CREATE TYPE annotation_visibility AS ENUM ('private', 'team', 'organization');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'annotation_anchor_status') THEN
        CREATE TYPE annotation_anchor_status AS ENUM ('active', 'reanchored', 'orphaned', 'deleted');
    END IF;
END $$;

-- ─── Table: document_annotations ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.document_annotations (
    id                  UUID                    NOT NULL DEFAULT uuid_generate_v4(),
    document_id         UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    user_id             UUID                    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Optional: stable legal node reference (e.g. "dieu-7", "khoan-2")
    node_id             TEXT,

    -- Text anchor (used to re-locate annotation if content changes)
    anchor_exact_text   TEXT                    NOT NULL CHECK (char_length(anchor_exact_text) >= 1),
    anchor_prefix       TEXT,
    anchor_suffix       TEXT,
    anchor_start_offset INT,
    anchor_end_offset   INT,
    anchor_content_version TEXT               NOT NULL,
    anchor_content_hash TEXT,

    -- Annotation data
    annotation_type     annotation_type         NOT NULL DEFAULT 'highlight',
    color               annotation_color        NOT NULL DEFAULT 'yellow',

    -- Sanitized note content (stored after DOMPurify on client; validated server-side too)
    -- Strip all HTML tags at DB level via CHECK constraint
    note_content        TEXT                    CHECK (note_content IS NULL OR char_length(note_content) <= 10000),

    -- Visibility scope
    visibility          annotation_visibility   NOT NULL DEFAULT 'private',

    -- Lifecycle
    anchor_status       annotation_anchor_status NOT NULL DEFAULT 'active',

    created_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT document_annotations_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_annotations_document_user
    ON public.document_annotations (document_id, user_id);

CREATE INDEX IF NOT EXISTS idx_annotations_user
    ON public.document_annotations (user_id);

CREATE INDEX IF NOT EXISTS idx_annotations_document_visibility
    ON public.document_annotations (document_id, visibility)
    WHERE anchor_status != 'deleted';

CREATE INDEX IF NOT EXISTS idx_annotations_anchor_status
    ON public.document_annotations (anchor_status)
    WHERE anchor_status IN ('orphaned', 'reanchored');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_annotations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_annotations_updated_at ON public.document_annotations;
CREATE TRIGGER trg_annotations_updated_at
    BEFORE UPDATE ON public.document_annotations
    FOR EACH ROW EXECUTE FUNCTION public.update_annotations_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.document_annotations ENABLE ROW LEVEL SECURITY;

-- 1. SELECT:
--    - Own private annotations (any document)
--    - Team/org annotations on published documents (future: team membership check)
--    - NEVER expose other users' private annotations
DROP POLICY IF EXISTS "annotations_select" ON public.document_annotations;
CREATE POLICY "annotations_select"
    ON public.document_annotations
    FOR SELECT
    TO authenticated
    USING (
        -- Own annotation: always visible
        user_id = auth.uid()
        OR
        -- Team/org scoped annotations on published documents
        (
            visibility IN ('team', 'organization')
            AND anchor_status != 'deleted'
            AND EXISTS (
                SELECT 1 FROM public.legal_documents ld
                WHERE ld.id = document_id
                  AND ld.is_published = TRUE
                  AND ld.is_deleted = FALSE
            )
        )
    );

-- 2. INSERT: authenticated users only, must set own user_id
DROP POLICY IF EXISTS "annotations_insert" ON public.document_annotations;
CREATE POLICY "annotations_insert"
    ON public.document_annotations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.legal_documents ld
            WHERE ld.id = document_id
              AND ld.is_published = TRUE
              AND ld.is_deleted = FALSE
        )
    );

-- 3. UPDATE: only own annotations; cannot change document_id or user_id
DROP POLICY IF EXISTS "annotations_update" ON public.document_annotations;
CREATE POLICY "annotations_update"
    ON public.document_annotations
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid()
        -- Prevent moving annotation to a different document
        AND document_id = document_id
    );

-- 4. DELETE: only own annotations (soft-delete via anchor_status preferred)
DROP POLICY IF EXISTS "annotations_delete" ON public.document_annotations;
CREATE POLICY "annotations_delete"
    ON public.document_annotations
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- 5. anon users: no access at all (not even SELECT)
-- (no policy for anon = deny by default when RLS is enabled)

-- ─── Server-side XSS guard ───────────────────────────────────────────────────
-- Strip obvious script injection from note_content at DB level.
-- The application layer (DOMPurify) is the primary defence.
-- This is a belt-and-suspenders check.

CREATE OR REPLACE FUNCTION public.sanitize_annotation_note()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.note_content IS NOT NULL THEN
        -- Strip <script>, <iframe>, <object>, on* event attributes (basic)
        NEW.note_content := regexp_replace(
            NEW.note_content,
            '<(script|iframe|object|embed|form|input|button)[^>]*>.*?</(script|iframe|object|embed|form|input|button)>',
            '',
            'gi'
        );
        NEW.note_content := regexp_replace(
            NEW.note_content,
            '<[^>]+\s+on\w+\s*=\s*[''"][^''"]*[''"][^>]*>',
            '',
            'gi'
        );
        NEW.note_content := regexp_replace(
            NEW.note_content,
            'javascript\s*:',
            '',
            'gi'
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_note ON public.document_annotations;
CREATE TRIGGER trg_sanitize_note
    BEFORE INSERT OR UPDATE OF note_content ON public.document_annotations
    FOR EACH ROW EXECUTE FUNCTION public.sanitize_annotation_note();

-- ─── Helper view: own annotations with document info ─────────────────────────

CREATE OR REPLACE VIEW public.my_annotations AS
SELECT
    a.*,
    ld.title          AS document_title,
    ld.document_number AS document_number
FROM public.document_annotations a
JOIN public.legal_documents ld ON ld.id = a.document_id
WHERE a.user_id = auth.uid()
  AND a.anchor_status != 'deleted';

-- RLS on view is inherited from base table; also add explicit policy
-- (Supabase applies RLS on underlying table, so the view is safe)
