const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function rebuild() {
  console.log('🔄 Đang đồng bộ và tái cấu trúc src/lib/demo-data.ts từ Supabase Cloud...');

  // Fetch categories
  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .order('order_index', { ascending: true });

  if (catErr) throw catErr;

  // Fetch documents with files
  const { data: rawDocuments, error: docErr } = await supabase
    .from('legal_documents')
    .select(`
      *,
      document_files (*)
    `)
    .eq('is_deleted', false)
    .order('effective_date', { ascending: false });

  if (docErr) throw docErr;

  const documents = rawDocuments.map(doc => {
    const cleanDoc = { ...doc };
    delete cleanDoc.search_vector;
    cleanDoc.files = cleanDoc.document_files || [];
    delete cleanDoc.document_files;
    return cleanDoc;
  });

  // Fetch category links
  const { data: categoryLinks, error: linkErr } = await supabase
    .from('document_category_links')
    .select('*');

  if (linkErr) throw linkErr;

  // Fetch relations
  const { data: relations, error: relErr } = await supabase
    .from('document_relations')
    .select('*');

  if (relErr) throw relErr;

  console.log(`📊 Đã tải:`);
  console.log(`  - Danh mục: ${categories.length}`);
  console.log(`  - Văn bản pháp luật: ${documents.length}`);
  console.log(`  - Liên kết danh mục: ${categoryLinks.length}`);
  console.log(`  - Mối quan hệ phả hệ văn bản: ${relations.length}`);

  const frontendDataCode = `// 100% REAL LEGAL DATABASE - WITH EXPANDED 2025-2026 REPOSITORY
import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(categories, null, 2)};

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(documents, null, 2)};

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(categoryLinks, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(relations, null, 2)};

export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  categories.forEach(cat => map.set(cat.id, { ...cat, children: [] }));
  const roots: Category[] = [];
  map.forEach(cat => {
    if (cat.parent_id === null) {
      roots.push(cat);
    } else {
      const parent = map.get(cat.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(cat);
      }
    }
  });
  const sortChildren = (cats: Category[]) => {
    cats.sort((a, b) => a.order_index - b.order_index);
    cats.forEach(c => c.children && sortChildren(c.children));
  };
  sortChildren(roots);
  return roots;
}

export function getDescendantCategoryIds(categoryId: string, allCategories: Category[]): string[] {
  const ids: string[] = [categoryId];
  const children = allCategories.filter(c => c.parent_id === categoryId);
  children.forEach(child => {
    ids.push(...getDescendantCategoryIds(child.id, allCategories));
  });
  return ids;
}

export function getDocumentsForCategoryTree(categoryId: string): Partial<LegalDocument>[] {
  const descendantIds = getDescendantCategoryIds(categoryId, DEMO_CATEGORIES);
  const linkDocIds = new Set(
    DEMO_CATEGORY_LINKS
      .filter(link => descendantIds.includes(link.category_id))
      .map(link => link.document_id)
  );
  return DEMO_DOCUMENTS.filter(doc => linkDocIds.has(doc.id!));
}

export function getCategoryDocumentCount(categoryId: string): number {
  return getDocumentsForCategoryTree(categoryId).length;
}

export function getDocumentById(id: string): Partial<LegalDocument> | undefined {
  return DEMO_DOCUMENTS.find(doc => doc.id === id);
}

export function getDocumentRelations(documentId: string): {
  as_source: DocumentRelation[];
  as_target: DocumentRelation[];
} {
  return {
    as_source: DEMO_RELATIONS.filter(r => r.source_document_id === documentId),
    as_target: DEMO_RELATIONS.filter(r => r.target_document_id === documentId),
  };
}

export function searchDocuments(query: string): Partial<LegalDocument>[] {
  const q = query.toLowerCase();
  return DEMO_DOCUMENTS.filter(doc =>
    doc.title?.toLowerCase().includes(q) ||
    doc.document_number?.toLowerCase().includes(q) ||
    doc.issuing_body?.toLowerCase().includes(q) ||
    doc.html_content?.toLowerCase().includes(q) ||
    doc.summary_main?.toLowerCase().includes(q)
  );
}
`;

  const outputPath = path.join(__dirname, '../src/lib/demo-data.ts');
  fs.writeFileSync(outputPath, frontendDataCode);
  console.log('✅ ĐÃ ĐỒNG BỘ THÀNH CÔNG VÀO src/lib/demo-data.ts!');
}

rebuild().catch(console.error);
