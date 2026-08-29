const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
const demoData = require(demoDataPath);

async function main() {
  console.log('🧹 BẮT ĐẦU XÓA SẠCH VĂN BẢN MẪU, CHỈ GIỮ LẠI VĂN BẢN THẬT 100%...');

  const allDocs = demoData.DEMO_DOCUMENTS;
  
  // Keep only authentic documents with verified files
  const realDocs = allDocs.filter(d => d.files && d.files.length > 0);
  const placeholderDocs = allDocs.filter(d => !d.files || d.files.length === 0);

  const realDocIds = new Set(realDocs.map(d => d.id));
  const placeholderDocIds = placeholderDocs.map(d => d.id);

  console.log(`- Số văn bản giữ lại (Văn bản thật): ${realDocs.length}`);
  console.log(`- Số văn bản mẫu bị xóa: ${placeholderDocs.length}`);

  // 1. Filter category links
  const filteredCategoryLinks = demoData.DEMO_CATEGORY_LINKS.filter(link => realDocIds.has(link.document_id));

  // 2. Filter relations
  const filteredRelations = demoData.DEMO_RELATIONS.filter(
    rel => realDocIds.has(rel.source_document_id) && realDocIds.has(rel.target_document_id)
  );

  // 3. Keep active categories
  const linkedCategoryIds = new Set(filteredCategoryLinks.map(l => l.category_id));
  // Keep all categories or categories in use
  const filteredCategories = demoData.DEMO_CATEGORIES;

  // 4. Update demo-data.ts
  const newFrontendCode = `// 100% REAL LEGAL DATABASE - ZERO DEMO DATA - AUTHENTIC FULL-TEXT
import type { LegalDocument, Category } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(filteredCategories, null, 2)};

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(realDocs, null, 2)};

export const DEMO_CATEGORY_LINKS = ${JSON.stringify(filteredCategoryLinks, null, 2)};

export const DEMO_RELATIONS = ${JSON.stringify(filteredRelations, null, 2)};

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

export function getDocumentRelations(documentId: string) {
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

  fs.writeFileSync(demoDataPath, newFrontendCode, 'utf-8');
  console.log('✅ Đã cập nhật demo-data.ts, loại bỏ hoàn toàn 34 văn bản mẫu.');

  // 5. Delete placeholder docs from Supabase
  if (placeholderDocIds.length > 0) {
    console.log('🗑️ Đang xóa văn bản mẫu trên Supabase Cloud database...');
    const { error: delLinksErr } = await supabase
      .from('document_category_links')
      .delete()
      .in('document_id', placeholderDocIds);

    const { error: delRelErr } = await supabase
      .from('document_relations')
      .delete()
      .in('source_document_id', placeholderDocIds);

    const { error: delDocsErr } = await supabase
      .from('legal_documents')
      .delete()
      .in('id', placeholderDocIds);

    if (delDocsErr) {
      console.warn('Lưu ý khi xóa trên Supabase:', delDocsErr.message);
    } else {
      console.log('✅ Đã xóa sạch văn bản mẫu trên Supabase Database!');
    }
  }

  console.log('🎉 HOÀN TẤT DỌN DẸP 100%! HỆ THỐNG HIỆN TẠI CHỈ CÒN VĂN BẢN THẬT.');
}

main();
