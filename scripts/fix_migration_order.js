const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
let sql = fs.readFileSync(filePath, 'utf-8');

// Extract the helper functions section (get_user_role, update_updated_at, update_search_vector)
const helperFunctionsBlock = `
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
`;

// Remove the old helper functions block from top
sql = sql.replace(
  /-- ============================================================\r?\n-- SECTION 2: HELPER FUNCTIONS[\s\S]*?-- ============================================================\r?\n-- SECTION 3: TABLES/m,
  '-- ============================================================\n-- SECTION 2: TABLES'
);

// Place helper functions after all tables (before Section 4: TRIGGERS or INDEXES)
sql = sql.replace(
  /-- ============================================================\r?\n-- SECTION 4: TRIGGERS/m,
  `${helperFunctionsBlock}\n-- ============================================================\n-- SECTION 4: TRIGGERS`
);

fs.writeFileSync(filePath, sql);
console.log('Successfully reordered 001_initial_schema.sql so tables are created before functions!');
