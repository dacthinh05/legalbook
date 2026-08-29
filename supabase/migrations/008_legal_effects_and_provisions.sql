-- ============================================================
-- MIGRATION 008: LEGAL EFFECTS, PROVISIONS & ANCHORS
-- ============================================================

-- 1. Enum types
DO $$ BEGIN
    CREATE TYPE legal_effect_category AS ENUM (
        'substantive_change',
        'application_support'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE legal_effect_type AS ENUM (
        'amends',
        'supplements',
        'replaces',
        'repeals',
        'partially_repeals',
        'suspends',
        'extends',
        'corrects',
        'guides',
        'implements',
        'references'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Document Provisions (Stable Semantic Tree)
CREATE TABLE IF NOT EXISTS public.document_provisions (
    id                      TEXT            NOT NULL,
    document_id             UUID            NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    parent_provision_id     TEXT            REFERENCES public.document_provisions(id) ON DELETE SET NULL,
    provision_type          TEXT            NOT NULL, -- 'chapter' | 'section' | 'article' | 'clause' | 'point' | 'appendix'
    number_label            TEXT            NOT NULL,
    heading_title           TEXT,
    normalized_path         TEXT            NOT NULL,
    stable_key              TEXT            NOT NULL,
    order_index             INT             NOT NULL DEFAULT 0,
    content_text            TEXT            NOT NULL,
    content_hash            TEXT            NOT NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT document_provisions_pkey PRIMARY KEY (id),
    CONSTRAINT doc_provision_stable_key UNIQUE (document_id, stable_key)
);

CREATE INDEX IF NOT EXISTS idx_doc_provisions_doc_id ON public.document_provisions(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_provisions_stable_key ON public.document_provisions(stable_key);

-- 3. Legal Effects Core
CREATE TABLE IF NOT EXISTS public.legal_effects (
    id                      TEXT                    NOT NULL,
    category                legal_effect_category   NOT NULL,
    effect_type             legal_effect_type       NOT NULL,
    source_document_id      UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    source_provision_id     TEXT                    REFERENCES public.document_provisions(id) ON DELETE SET NULL,
    target_document_id      UUID                    NOT NULL REFERENCES public.legal_documents(id) ON DELETE CASCADE,
    target_provision_id     TEXT                    REFERENCES public.document_provisions(id) ON DELETE SET NULL,
    effective_from          DATE                    NOT NULL,
    effective_to            DATE,
    impact_scope            TEXT                    NOT NULL DEFAULT 'text_range',
    legal_citation          TEXT                    NOT NULL,
    source_excerpt          TEXT                    NOT NULL,
    source_url              TEXT,
    review_status           TEXT                    NOT NULL DEFAULT 'pending',
    confidence              NUMERIC(3, 2)           NOT NULL DEFAULT 0.90,
    reviewed_by             UUID                    REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at             TIMESTAMPTZ,
    admin_notes             TEXT,
    created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW(),

    CONSTRAINT legal_effects_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_legal_effects_target ON public.legal_effects(target_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_effects_source ON public.legal_effects(source_document_id);
CREATE INDEX IF NOT EXISTS idx_legal_effects_target_prov ON public.legal_effects(target_provision_id);
CREATE INDEX IF NOT EXISTS idx_legal_effects_status ON public.legal_effects(review_status);

-- 4. Provision Anchors
CREATE TABLE IF NOT EXISTS public.provision_anchors (
    id                      TEXT            NOT NULL,
    legal_effect_id         TEXT            NOT NULL REFERENCES public.legal_effects(id) ON DELETE CASCADE,
    target_provision_id     TEXT            NOT NULL REFERENCES public.document_provisions(id) ON DELETE CASCADE,
    exact_text              TEXT            NOT NULL,
    prefix_text             TEXT,
    suffix_text             TEXT,
    normalized_start_offset INT,
    normalized_end_offset   INT,
    content_hash            TEXT            NOT NULL,
    resolution_status       TEXT            NOT NULL DEFAULT 'resolved',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT provision_anchors_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_provision_anchors_effect ON public.provision_anchors(legal_effect_id);
CREATE INDEX IF NOT EXISTS idx_provision_anchors_target ON public.provision_anchors(target_provision_id);

-- Enable RLS
ALTER TABLE public.document_provisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provision_anchors ENABLE ROW LEVEL SECURITY;

-- Read policies for public/authenticated
CREATE POLICY "Public read for document_provisions" ON public.document_provisions FOR SELECT USING (true);
CREATE POLICY "Public read for verified legal_effects" ON public.legal_effects FOR SELECT USING (true);
CREATE POLICY "Public read for provision_anchors" ON public.provision_anchors FOR SELECT USING (true);
