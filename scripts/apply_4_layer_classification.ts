/**
 * Apply 4-Layer Deterministic Classification to Master Legal Corpus
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { classifyLegalDocumentDeterministic } from '../src/lib/taxonomy/deterministic-classifier';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES } from '../src/lib/demo-data';
import type { LegalDocument, Category, DocumentCategoryLink } from '../src/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEMO_DATA_PATH = path.join(ROOT, 'src', 'lib', 'demo-data.ts');

async function run() {
  console.log('=== RUNNING 4-LAYER DETERMINISTIC CLASSIFICATION PIPELINE ===\n');

  const catBySlug: Record<string, string> = {};
  DEMO_CATEGORIES.forEach(c => { catBySlug[c.slug] = c.id; });

  const docs = DEMO_DOCUMENTS;
  console.log(`Loaded ${docs.length} documents for classification.\n`);

  const categoryLinks: DocumentCategoryLink[] = [];
  let linkIndex = 1;

  docs.forEach((doc, idx) => {
    const result = classifyLegalDocumentDeterministic(doc, catBySlug);
    console.log(`${idx + 1}. [${doc.document_number}] ${doc.title.slice(0, 50)}...`);
    console.log(`   🎯 Primary: ${result.primaryCategorySlug} (ID: ${result.primaryCategoryId}) | Confidence: ${result.confidenceScore}%`);
    console.log(`   📎 Secondary: ${result.secondaryCategoryIds.length} related topics`);
    console.log(`   💡 Reasons: ${result.taxonomyReasons.join(' | ')}\n`);

    // Primary link
    categoryLinks.push({
      id: `link-tax-${linkIndex++}`,
      document_id: doc.id,
      category_id: result.primaryCategoryId,
      is_primary: true
    });

    // Secondary links
    result.secondaryCategoryIds.forEach(secCatId => {
      if (secCatId !== result.primaryCategoryId) {
        categoryLinks.push({
          id: `link-tax-${linkIndex++}`,
          document_id: doc.id,
          category_id: secCatId,
          is_primary: false
        });
      }
    });
  });

  // Re-write demo-data.ts
  const outputCode = `// PACO LegalBook - Master Authentic Legal Database (4-Layer Deterministic Taxonomy)
import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(DEMO_CATEGORIES, null, 2)};

export const DEMO_DOCUMENTS: LegalDocument[] = ${JSON.stringify(docs, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = [];

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

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(categoryLinks, null, 2)};

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id || d.document_number === id);
}

export function getDocumentRelations(documentId: string): { as_source: DocumentRelation[]; as_target: DocumentRelation[] } {
  return {
    as_source: DEMO_RELATIONS.filter((r) => r.source_document_id === documentId),
    as_target: DEMO_RELATIONS.filter((r) => r.target_document_id === documentId)
  };
}

export function getDocumentsForCategoryTree(categoryId?: string): LegalDocument[] {
  if (!categoryId) return DEMO_DOCUMENTS;
  const matchingLinks = DEMO_CATEGORY_LINKS.filter((l) => l.category_id === categoryId);
  const matchingDocIds = new Set(matchingLinks.map((l) => l.document_id));
  return DEMO_DOCUMENTS.filter((d) => matchingDocIds.has(d.id));
}

export function getCategoryDocumentCount(categoryId: string): number {
  return DEMO_CATEGORY_LINKS.filter((l) => l.category_id === categoryId).length;
}
`;

  fs.writeFileSync(DEMO_DATA_PATH, outputCode, 'utf8');
  console.log(`✅ Updated ${DEMO_DATA_PATH} with ${categoryLinks.length} classified links.`);

  // Synchronize Supabase Cloud
  const envContent = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  console.log('\n=== SYNCHRONIZING CATEGORY LINKS TO SUPABASE CLOUD ===');
  
  const docIds = docs.map(d => d.id);
  await supabase.from('document_category_links').delete().in('document_id', docIds);

  const supabaseLinks = categoryLinks.map(l => ({
    id: `f000${l.id.replace(/[^0-9]/g, '').padStart(12, '0')}-0000-4000-8000-000000000000`.slice(0, 36),
    document_id: l.document_id,
    category_id: l.category_id,
    is_primary: l.is_primary
  }));

  const { error: linkErr } = await supabase.from('document_category_links').insert(supabaseLinks);
  if (linkErr) {
    console.error('Error inserting category links:', linkErr);
  } else {
    console.log(`✅ Upserted ${supabaseLinks.length} category links to Supabase.`);
  }
}

run().catch(console.error);
