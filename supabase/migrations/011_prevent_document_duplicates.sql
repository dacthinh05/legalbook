-- ============================================================
-- LegalBook Migration: 011_prevent_document_duplicates.sql
-- Description: Database-level Anti-Duplication Engine:
--   1. Unique constraint on active document_number (case & space insensitive)
--   2. Unique constraint on document_files (document_id, original_filename)
--   3. Unique constraint on document_category_links (document_id, category_id)
--   4. Function check_document_duplicate for live pre-insert resolution
-- ============================================================

-- ─── 1. Unique Index on Document Number ──────────────────────────────────────
-- Prevents creating multiple active records with the same official document number
CREATE UNIQUE INDEX IF NOT EXISTS idx_legal_documents_unique_doc_number
ON public.legal_documents (lower(trim(document_number)))
WHERE is_deleted = FALSE AND document_number IS NOT NULL AND trim(document_number) <> '';

-- ─── 2. Unique Index on Document Files ────────────────────────────────────────
-- Prevents attaching the same physical filename to the same document twice
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_files_unique_doc_file
ON public.document_files (document_id, original_filename);

-- ─── 3. Unique Index on Document Category Links ──────────────────────────────
-- Prevents duplicate many-to-many category assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_doc_cat_links_unique
ON public.document_category_links (document_id, category_id);

-- ─── 4. Live Duplicate Preflight Lookup Function ──────────────────────────────
CREATE OR REPLACE FUNCTION public.check_document_duplicate(
    lookup_number TEXT,
    lookup_title TEXT DEFAULT NULL,
    exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_number TEXT,
    title TEXT,
    document_type public.document_type,
    status public.document_status,
    issued_date DATE,
    match_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    clean_num TEXT := lower(trim(COALESCE(lookup_number, '')));
    clean_title TEXT := lower(trim(COALESCE(lookup_title, '')));
BEGIN
    RETURN QUERY
    SELECT
        ld.id,
        ld.document_number,
        ld.title,
        ld.document_type,
        ld.status,
        ld.issued_date,
        CASE
            WHEN clean_num <> '' AND lower(trim(COALESCE(ld.document_number, ''))) = clean_num THEN 'exact_number'
            WHEN clean_title <> '' AND lower(trim(ld.title)) = clean_title THEN 'exact_title'
            ELSE 'similar'
        END AS match_type
    FROM public.legal_documents ld
    WHERE ld.is_deleted = FALSE
      AND (exclude_id IS NULL OR ld.id <> exclude_id)
      AND (
          (clean_num <> '' AND lower(trim(COALESCE(ld.document_number, ''))) = clean_num)
          OR (clean_title <> '' AND lower(trim(ld.title)) = clean_title)
      )
    LIMIT 5;
END;
$$;
