import { DEMO_CATEGORIES, DEMO_DOCUMENTS, DEMO_CATEGORY_LINKS, DEMO_RELATIONS } from '../src/lib/demo-data.ts';
import fs from 'fs';
import path from 'path';

console.log('--- PURGE INCOMPLETE / STUB / FAKE DOCUMENTS ---');
console.log(`Total documents before: ${DEMO_DOCUMENTS.length}`);

// 1. Keep ONLY documents with authentic, non-empty full text
const retainedDocs = DEMO_DOCUMENTS.filter(doc => {
  if (!doc || !doc.id) return false;
  const html = doc.html_content;
  if (!html || typeof html !== 'string' || html.trim().length === 0) return false;
  if (doc.content_status === 'needs-ocr' || doc.content_status === 'not-fetched' || doc.content_status === 'failed') return false;
  return true;
});

const retainedDocIds = new Set(retainedDocs.map(d => d.id));
console.log(`Total documents after purge: ${retainedDocs.length}`);
retainedDocs.forEach((d, idx) => {
  console.log(`${idx + 1}. [${d.document_type.toUpperCase()}] ${d.document_number || 'N/A'} - ${d.title.slice(0, 70)} (${d.html_content?.length} chars)`);
});

// 2. Filter Category Links
const retainedLinks = DEMO_CATEGORY_LINKS.filter(link => retainedDocIds.has(link.document_id));
console.log(`Total category links before: ${DEMO_CATEGORY_LINKS.length}, after: ${retainedLinks.length}`);

// 3. Filter Relations
const retainedRelations = DEMO_RELATIONS.filter(rel => 
  retainedDocIds.has(rel.source_document_id) && retainedDocIds.has(rel.target_document_id)
);
console.log(`Total relations before: ${DEMO_RELATIONS.length}, after: ${retainedRelations.length}`);

// 4. Generate new demo-data.ts content
const demoDataPath = path.join(process.cwd(), 'src/lib/demo-data.ts');
const backupPath = path.join(process.cwd(), 'src/lib/demo-data.backup.ts');

// Ensure backup exists
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(demoDataPath, backupPath);
}

const fileContent = `import type { Category, LegalDocument, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(DEMO_CATEGORIES, null, 2)};

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(retainedDocs, null, 2)};

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(retainedLinks, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(retainedRelations, null, 2)};

export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<string, Category>();
  const roots: Category[] = [];

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots.sort((a, b) => a.order_index - b.order_index);
}

export function hasFullTextDocument(doc?: Partial<LegalDocument> | null): boolean {
  if (!doc) return false;
  const html = doc.html_content;
  if (!html || typeof html !== 'string' || html.trim().length === 0) return false;
  if (doc.content_status === 'needs-ocr' || doc.content_status === 'not-fetched' || doc.content_status === 'failed') return false;
  return true;
}

export function getDocumentsForCategory(categoryId: string, onlyWithFullText: boolean = true): Partial<LegalDocument>[] {
  const docIds = new Set(
    DEMO_CATEGORY_LINKS
      .filter((link) => link.category_id === categoryId)
      .map((link) => link.document_id)
  );

  return DEMO_DOCUMENTS.filter((doc) => doc && doc.id && docIds.has(doc.id) && (!onlyWithFullText || hasFullTextDocument(doc)));
}

export function getDocumentsForCategoryTree(categoryId: string, onlyWithFullText: boolean = true): Partial<LegalDocument>[] {
  const categoryIds = new Set<string>([categoryId]);

  function collectChildren(id: string) {
    DEMO_CATEGORIES
      .filter((c) => c.parent_id === id)
      .forEach((c) => {
        categoryIds.add(c.id);
        collectChildren(c.id);
      });
  }

  collectChildren(categoryId);

  const docIds = new Set(
    DEMO_CATEGORY_LINKS
      .filter((link) => categoryIds.has(link.category_id))
      .map((link) => link.document_id)
  );

  return DEMO_DOCUMENTS.filter((doc) => doc && doc.id && docIds.has(doc.id) && (!onlyWithFullText || hasFullTextDocument(doc)));
}

export function getDocumentById(id: string): Partial<LegalDocument> | undefined {
  return DEMO_DOCUMENTS.find((d) => d && d.id === id);
}

export function getDocumentRelations(documentId: string): {
  as_source: DocumentRelation[];
  as_target: DocumentRelation[];
} {
  return {
    as_source: DEMO_RELATIONS.filter((r) => r.source_document_id === documentId),
    as_target: DEMO_RELATIONS.filter((r) => r.target_document_id === documentId),
  };
}

export function getCategoryDocumentCount(categoryId: string, onlyWithFullText: boolean = true): number {
  return getDocumentsForCategoryTree(categoryId, onlyWithFullText).length;
}
`;

fs.writeFileSync(demoDataPath, fileContent, 'utf8');
console.log('✅ DEMO_DOCUMENTS purged and written successfully!');
