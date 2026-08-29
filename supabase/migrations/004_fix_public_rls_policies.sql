-- ====================================================================
-- FIX ROW LEVEL SECURITY (RLS) POLICIES FOR PUBLIC READ ACCESS
-- Cho phép người dùng vãng lai (anon) & đã đăng nhập (authenticated)
-- đọc danh mục và văn bản pháp luật đã xuất bản
-- (Dán vào Supabase Dashboard > SQL Editor và nhấn RUN)
-- ====================================================================

-- 1. BẢNG CATEGORIES (Danh mục)
DROP POLICY IF EXISTS "categories_select_authenticated" ON public.categories;
DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

-- 2. BẢNG LEGAL_DOCUMENTS (Văn bản pháp luật)
DROP POLICY IF EXISTS "legal_documents_select_published" ON public.legal_documents;
DROP POLICY IF EXISTS "legal_documents_select_public" ON public.legal_documents;
CREATE POLICY "legal_documents_select_public"
    ON public.legal_documents FOR SELECT
    TO anon, authenticated
    USING (is_published = TRUE AND is_deleted = FALSE);

-- 3. BẢNG DOCUMENT_CATEGORY_LINKS (Liên kết danh mục)
DROP POLICY IF EXISTS "document_category_links_select_authenticated" ON public.document_category_links;
DROP POLICY IF EXISTS "document_category_links_select_public" ON public.document_category_links;
CREATE POLICY "document_category_links_select_public"
    ON public.document_category_links FOR SELECT
    TO anon, authenticated
    USING (TRUE);

-- 4. BẢNG DOCUMENT_RELATIONS (Quan hệ văn bản)
DROP POLICY IF EXISTS "document_relations_select_authenticated" ON public.document_relations;
DROP POLICY IF EXISTS "document_relations_select_public" ON public.document_relations;
CREATE POLICY "document_relations_select_public"
    ON public.document_relations FOR SELECT
    TO anon, authenticated
    USING (TRUE);

-- 5. BẢNG DOCUMENT_FILES (Tệp đính kèm / PDF / Docx)
DROP POLICY IF EXISTS "document_files_select_authenticated" ON public.document_files;
DROP POLICY IF EXISTS "document_files_select_public" ON public.document_files;
CREATE POLICY "document_files_select_public"
    ON public.document_files FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.legal_documents ld
            WHERE ld.id = document_id
            AND (ld.is_published = TRUE AND ld.is_deleted = FALSE)
        )
    );

-- 6. BẢNG DOCUMENT_VERSIONS (Lịch sử phiên bản)
DROP POLICY IF EXISTS "document_versions_select_authenticated" ON public.document_versions;
DROP POLICY IF EXISTS "document_versions_select_public" ON public.document_versions;
CREATE POLICY "document_versions_select_public"
    ON public.document_versions FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.legal_documents ld
            WHERE ld.id = document_id
            AND (ld.is_published = TRUE AND ld.is_deleted = FALSE)
        )
    );

-- 7. CÁC BẢNG NÂNG CAO (Tree Nodes, Changesets, Relationships)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'document_nodes') THEN
        DROP POLICY IF EXISTS "document_nodes_select_policy" ON public.document_nodes;
        CREATE POLICY "document_nodes_select_policy" ON public.document_nodes FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'legal_relationships') THEN
        DROP POLICY IF EXISTS "legal_relationships_select_policy" ON public.legal_relationships;
        CREATE POLICY "legal_relationships_select_policy" ON public.legal_relationships FOR SELECT TO anon, authenticated USING (true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'legal_changesets') THEN
        DROP POLICY IF EXISTS "legal_changesets_select_policy" ON public.legal_changesets;
        CREATE POLICY "legal_changesets_select_policy" ON public.legal_changesets FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
