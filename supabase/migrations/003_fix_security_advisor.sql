-- ====================================================================
-- FIX TRIỆT ĐỂ 9 CẢNH BÁO TRONG SUPABASE SECURITY ADVISOR
-- (Copy toàn bộ nội dung này dán vào Supabase SQL Editor và nhấn Run)
-- ====================================================================

-- 1. DI CHUYỂN EXTENSION pg_trgm TỪ 'public' SANG 'extensions' SCHEMA
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 2. ĐƯA TRIGGER FUNCTIONS VỀ SECURITY INVOKER (KHÔNG CẦN SECURITY DEFINER)
-- VÀ THIẾT LẬP CỐ ĐỊNH search_path = public
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.document_number, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.issuing_body, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.summary_main, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.summary_new_points, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(NEW.html_content, '')), 'D');
    RETURN NEW;
END;
$$;

-- 3. CỐ ĐỊNH search_path VÀ BẢO MẬT CHO CÁC HÀM SECURITY DEFINER
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
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. THU HỒI QUYỀN THỰC THI TỰ DO (REVOKE EXECUTE) TỪ PUBLIC & ANON
REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_search_vector() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;

-- Chỉ cấp quyền gọi get_user_role cho người dùng đã đăng nhập (authenticated)
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- 5. KÍCH HOẠT RLS & BẢO VỆ CÁC BẢNG MỚI (NẾU CÓ)
ALTER TABLE IF EXISTS public.document_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.legal_changesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.verification_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'document_nodes_select_policy') THEN
        CREATE POLICY "document_nodes_select_policy" ON public.document_nodes FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'legal_relationships_select_policy') THEN
        CREATE POLICY "legal_relationships_select_policy" ON public.legal_relationships FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'legal_changesets_select_policy') THEN
        CREATE POLICY "legal_changesets_select_policy" ON public.legal_changesets FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'verification_audit_logs_select_policy') THEN
        CREATE POLICY "verification_audit_logs_select_policy" ON public.verification_audit_logs FOR SELECT TO authenticated USING (true);
    END IF;
END $$;
