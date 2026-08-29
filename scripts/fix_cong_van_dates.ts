import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES, DEMO_RELATIONS, DEMO_CATEGORY_LINKS } from '../src/lib/demo-data';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  console.log('Fixing cong_van effective_date to null...');
  for (const doc of DEMO_DOCUMENTS) {
    if (doc.document_type === 'cong_van') {
      doc.effective_date = null;
      await supabase
        .from('legal_documents')
        .update({ effective_date: null })
        .eq('id', doc.id);
    }
  }

  const demoDataContent = `import type { LegalDocument, Category, DocumentRelation, DocumentCategoryLink } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(DEMO_CATEGORIES, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(DEMO_RELATIONS, null, 2)};

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(DEMO_CATEGORY_LINKS, null, 2)};

export const DEMO_DOCUMENTS: LegalDocument[] = ${JSON.stringify(DEMO_DOCUMENTS, null, 2)};

export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      const parent = map.get(cat.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id);
}

export function getDocumentRelations(documentId: string): DocumentRelation[] {
  return DEMO_RELATIONS.filter(
    (r) => r.source_document_id === documentId || r.target_document_id === documentId
  );
}

export function getDocumentsForCategoryTree(categoryId: string): LegalDocument[] {
  const targetCategoryIds = new Set<string>([categoryId]);

  let added = true;
  while (added) {
    added = false;
    for (const cat of DEMO_CATEGORIES) {
      if (cat.parent_id && targetCategoryIds.has(cat.parent_id) && !targetCategoryIds.has(cat.id)) {
        targetCategoryIds.add(cat.id);
        added = true;
      }
    }
  }

  const linkedDocIds = new Set<string>();
  for (const link of DEMO_CATEGORY_LINKS) {
    if (targetCategoryIds.has(link.category_id)) {
      linkedDocIds.add(link.document_id);
    }
  }

  return DEMO_DOCUMENTS.filter((doc) => linkedDocIds.has(doc.id));
}

export function getCategoryDocumentCount(categoryId: string): number {
  return getDocumentsForCategoryTree(categoryId).length;
}
`;

  fs.writeFileSync(path.resolve(process.cwd(), 'src/lib/demo-data.ts'), demoDataContent, 'utf8');
  console.log('Done fixing cong_van effective_date to null.');
}

main();
