
import * as fs from 'fs';
import * as path from 'path';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES, DEMO_CATEGORY_LINKS, DEMO_RELATIONS } from '../src/lib/demo-data.ts';

const updatedDocs = DEMO_DOCUMENTS.map(doc => {
  const files = (doc.files || []).map(f => ({
    ...f,
    uploaded_by: null,
  }));
  return {
    ...doc,
    files,
  };
});

const header = `/**
 * demo-data.ts
 * Single source of truth for all verified legal documents, categories, and relations.
 */
import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(DEMO_CATEGORIES, null, 2)};

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(DEMO_CATEGORY_LINKS, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(DEMO_RELATIONS, null, 2)};

export const DEMO_DOCUMENTS: LegalDocument[] = ${JSON.stringify(updatedDocs, null, 2)};

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id);
}

export function getDocumentByNumber(docNumber: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.document_number === docNumber);
}

export function getDocumentRelations(documentId: string): { as_source: DocumentRelation[]; as_target: DocumentRelation[] } {
  const as_source = DEMO_RELATIONS.filter((r) => r.source_document_id === documentId);
  const as_target = DEMO_RELATIONS.filter((r) => r.target_document_id === documentId);
  return { as_source, as_target };
}

export function buildCategoryTree(categories: Category[] = DEMO_CATEGORIES): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();
  const roots: (Category & { children: Category[] })[] = [];

  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function getDocumentsForCategory(categoryId: string): LegalDocument[] {
  const linkedDocIds = new Set(
    DEMO_CATEGORY_LINKS.filter((l) => l.category_id === categoryId).map((l) => l.document_id)
  );
  return DEMO_DOCUMENTS.filter((d) => linkedDocIds.has(d.id));
}

export function getDocumentsForCategoryTree(categoryId: string): LegalDocument[] {
  const allSubIds = new Set<string>([categoryId]);
  const findChildren = (pid: string) => {
    DEMO_CATEGORIES.filter((c) => c.parent_id === pid).forEach((c) => {
      allSubIds.add(c.id);
      findChildren(c.id);
    });
  };
  findChildren(categoryId);

  const linkedDocIds = new Set(
    DEMO_CATEGORY_LINKS.filter((l) => allSubIds.has(l.category_id)).map((l) => l.document_id)
  );

  return DEMO_DOCUMENTS.filter((d) => linkedDocIds.has(d.id));
}

export function getCategoryDocumentCount(categoryId: string): number {
  return getDocumentsForCategoryTree(categoryId).length;
}
`;

fs.writeFileSync(path.resolve('src/lib/demo-data.ts'), header, 'utf8');
console.log('SUCCESS: demo-data.ts updated with uploaded_by: null');
