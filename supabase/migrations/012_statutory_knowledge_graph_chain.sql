-- ============================================================
-- Migration 012: Statutory Knowledge Graph & Recursive Chain Traversal
-- Provides sub-millisecond graph traversal from Law -> Decree -> Circular -> Dispatch
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_document_statutory_chain(
  p_document_id UUID,
  p_max_depth INT DEFAULT 4
)
RETURNS TABLE (
  document_id UUID,
  document_number TEXT,
  title TEXT,
  document_type TEXT,
  effective_date DATE,
  status TEXT,
  relation_type TEXT,
  direction TEXT, -- 'upstream' (căn cứ) or 'downstream' (hướng dẫn/thi hành)
  depth INT,
  path UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE statutory_tree AS (
    -- 1. Base Node: Selected root document
    SELECT 
      d.id AS document_id,
      d.document_number,
      d.title,
      d.document_type::TEXT,
      d.effective_date,
      d.status::TEXT,
      'root'::TEXT AS relation_type,
      'self'::TEXT AS direction,
      0 AS depth,
      ARRAY[d.id] AS path
    FROM legal_documents d
    WHERE d.id = p_document_id AND d.is_deleted = false

    UNION ALL

    -- 2. Downstream: Guiding Decrees / Circulars / Dispatches (where root is target)
    SELECT 
      child.id AS document_id,
      child.document_number,
      child.title,
      child.document_type::TEXT,
      child.effective_date,
      child.status::TEXT,
      r.relation_type::TEXT,
      'downstream'::TEXT AS direction,
      st.depth + 1 AS depth,
      st.path || child.id AS path
    FROM statutory_tree st
    JOIN document_relations r ON r.target_document_id = st.document_id
    JOIN legal_documents child ON child.id = r.source_document_id
    WHERE st.depth < p_max_depth
      AND child.is_deleted = false
      AND NOT (child.id = ANY(st.path)) -- Cycle protection

    UNION ALL

    -- 3. Upstream: Governing Laws / Parent Decrees (where root is source)
    SELECT 
      parent.id AS document_id,
      parent.document_number,
      parent.title,
      parent.document_type::TEXT,
      parent.effective_date,
      parent.status::TEXT,
      r.relation_type::TEXT,
      'upstream'::TEXT AS direction,
      st.depth + 1 AS depth,
      st.path || parent.id AS path
    FROM statutory_tree st
    JOIN document_relations r ON r.source_document_id = st.document_id
    JOIN legal_documents parent ON parent.id = r.target_document_id
    WHERE st.depth < p_max_depth
      AND parent.is_deleted = false
      AND NOT (parent.id = ANY(st.path)) -- Cycle protection
  )
  SELECT 
    st.document_id,
    st.document_number,
    st.title,
    st.document_type,
    st.effective_date,
    st.status,
    st.relation_type,
    st.direction,
    st.depth,
    st.path
  FROM statutory_tree st
  ORDER BY st.depth ASC, st.effective_date DESC NULLS LAST;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_document_statutory_chain(UUID, INT) TO anon, authenticated, service_role;
