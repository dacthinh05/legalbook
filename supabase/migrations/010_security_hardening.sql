-- ============================================================
-- LegalBook Migration: 010_security_hardening.sql
-- Description: Bản vá bảo mật toàn diện theo audit 2026-08-29:
--   (C2) Chặn user tự nâng role trên profiles (BEFORE UPDATE trigger)
--   (H3) ENABLE RLS + policies tối thiểu cho 3 bảng đang hở:
--        data_quality_audit_history, organizations, organization_members
--   (M)  SECURITY DEFINER + SET search_path cho 2 hàm hybrid search
--   (L)  Sửa tautology `document_id = document_id` trong policy
--        annotations_update (migration 006)
-- ============================================================

-- ─── 1. C2: Chặn tự nâng quyền qua profiles.role ─────────────────────────────
-- Policy `profiles_update_own` (001) cho phép mọi authenticated user UPDATE
-- row của chính mình, bao gồm cả cột `role` -> tự nâng lên admin được.
-- Trigger dưới đây chặn mọi thay đổi role trừ khi người thực thi đã là admin.

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

-- ─── 2. M: Hardening SECURITY DEFINER với SET search_path ────────────────────
-- Cả 2 hàm hybrid search đều là SECURITY DEFINER nhưng không pin search_path
-- (lỗ hổng search_path hijacking). Tạo lại nguyên bản, chỉ thêm SET search_path.

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
SET search_path = public, pg_temp
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
    query_embedding VECTOR(1536) DEFAULT NULL,
    match_count INT DEFAULT 15,
    filter_doc_ids UUID[] DEFAULT NULL,
    rrf_k INT DEFAULT 60
)
RETURNS TABLE (
    id UUID,
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
SET search_path = public, pg_temp
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
            dp.id AS provision_id,
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
            dp.id AS provision_id,
            1.0 - (dp.embedding <=> query_embedding) AS cos_similarity,
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
        dp.id,
        dp.document_id,
        ld.document_number,
        ld.title AS document_title,
        ld.document_type,
        ld.issuing_body,
        ld.effective_date,
        ld.status,
        dp.dom_id,
        dp.article_number,
        dp.article_title,
        substring(dp.content from 1 for 350) AS content_snippet,
        cs.similarity,
        cs.score_rrf AS rrf_score
    FROM combined_scores cs
    JOIN public.document_provisions dp ON dp.id = cs.provision_id
    JOIN public.legal_documents ld ON ld.id = dp.document_id
    ORDER BY cs.score_rrf DESC, ld.effective_date DESC NULLS LAST
    LIMIT match_count;
END;
$$;

-- ─── 3. H3: RLS cho data_quality_audit_history (migration 005) ──────────────
-- Bảng lịch sử audit nội bộ: chỉ admin/editor đọc được; mọi thao tác ghi
-- đều đi qua service role (bypass RLS mặc định của Supabase).

ALTER TABLE public.data_quality_audit_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_history_admin_read" ON public.data_quality_audit_history;
CREATE POLICY "audit_history_admin_read"
    ON public.data_quality_audit_history
    FOR SELECT
    TO authenticated
    USING (public.get_user_role() IN ('admin', 'editor'));

-- ─── 4. H3: RLS cho organizations (migration 007) ────────────────────────────
-- Thành viên đọc được org của mình; owner/admin của org quản lý được.

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

-- Cho phép user đã đăng nhập tự tạo org mới (created_by = chính họ).
DROP POLICY IF EXISTS "orgs_create_own" ON public.organizations;
CREATE POLICY "orgs_create_own"
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

-- ─── 5. H3: RLS cho organization_members (migration 007) ─────────────────────
-- Người dùng đọc được các membership của org mà mình thuộc về;
-- owner/admin của org thêm/sửa/xoá thành viên; user tự xem membership của mình.

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Helper: kiểm tra user hiện tại có phải owner/admin của org cho trước không.
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

-- ─── 6. L: Sửa tautology trong policy annotations_update (migration 006) ─────
-- WITH CHECK cũ có `document_id = document_id` (luôn TRUE) — câu chú thích
-- "không cho chuyển annotation sang document khác" không bao giờ có hiệu lực.
-- WITH CHECK chỉ thấy row MỚI nên cách đúng là chặn đổi document_id/user_id
-- bằng trigger BEFORE UPDATE.

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
