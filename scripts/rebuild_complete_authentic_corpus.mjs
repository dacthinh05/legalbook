import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv() {
  const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) env[k] = v.join('=');
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

  const { data: docs } = await supabase.from('legal_documents').select('*, files:document_files(*)').order('issued_date', { ascending: false });
  const { data: cats } = await supabase.from('categories').select('*').order('order_index');
  const { data: links } = await supabase.from('document_category_links').select('*');

  let code = '// PACO LegalBook - Master Authentic Legal Database (Decree 30/2020 Administrative Format)\n';
  code += "import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';\n\n";
  code += 'export const DEMO_CATEGORIES: Category[] = ' + JSON.stringify(cats, null, 2) + ';\n\n';
  code += 'export const DEMO_DOCUMENTS: LegalDocument[] = ' + JSON.stringify(docs, null, 2) + ';\n\n';
  code += 'export const DEMO_DOCUMENT_CATEGORY_LINKS: DocumentCategoryLink[] = ' + JSON.stringify(links, null, 2) + ';\n\n';
  code += 'export const DEMO_DOCUMENT_RELATIONS: DocumentRelation[] = [];\n\n';
  code += 'export const DEMO_RELATIONS: DocumentRelation[] = DEMO_DOCUMENT_RELATIONS;\n\n';
  code += `export function buildCategoryTree(categories: Category[] = DEMO_CATEGORIES) {
  const map = new Map<string, any>();
  const roots: any[] = [];
  categories.forEach(c => map.set(c.id, { ...c, children: [] }));
  categories.forEach(c => {
    const node = map.get(c.id);
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find(d => d.id === id);
}

export function getDocumentRelations(docId: string): { as_source: DocumentRelation[]; as_target: DocumentRelation[] } {
  return {
    as_source: DEMO_DOCUMENT_RELATIONS.filter(r => r.source_document_id === docId),
    as_target: DEMO_DOCUMENT_RELATIONS.filter(r => r.target_document_id === docId),
  };
}

export function getDocumentsForCategoryTree(categoryId: string, categories: Category[] = DEMO_CATEGORIES): LegalDocument[] {
  const targetIds = new Set<string>([categoryId]);
  const findChildren = (pid: string) => {
    categories.filter(c => c.parent_id === pid).forEach(child => {
      targetIds.add(child.id);
      findChildren(child.id);
    });
  };
  findChildren(categoryId);
  const matchingDocIds = new Set(
    DEMO_DOCUMENT_CATEGORY_LINKS.filter(l => targetIds.has(l.category_id)).map(l => l.document_id)
  );
  return DEMO_DOCUMENTS.filter(d => matchingDocIds.has(d.id));
}

export function getCategoryDocumentCount(categoryId: string, categories: Category[] = DEMO_CATEGORIES): number {
  return getDocumentsForCategoryTree(categoryId, categories).length;
}
`;

  fs.writeFileSync('src/lib/demo-data.ts', code, 'utf8');
  console.log(`✅ [OK] ĐÃ ĐỒNG BỘ ${docs?.length || 0} VĂN BẢN VÀO DEMO_DOCUMENTS!`);
}

main().catch(console.error);
