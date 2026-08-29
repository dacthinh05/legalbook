import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(process.cwd(), 'src/lib/demo-data.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace or ensure getDocumentRelations returns as_source and as_target
const oldHelperPattern = /export function getDocumentRelations\([\s\S]*?return DEMO_RELATIONS\.filter\([\s\S]*?\);\s*\}/;

const newHelper = `export function getDocumentRelations(documentId: string): {
  as_source: DocumentRelation[];
  as_target: DocumentRelation[];
} {
  return {
    as_source: DEMO_RELATIONS.filter((r) => r.source_document_id === documentId),
    as_target: DEMO_RELATIONS.filter((r) => r.target_document_id === documentId),
  };
}`;

if (oldHelperPattern.test(content)) {
  content = content.replace(oldHelperPattern, newHelper);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated getDocumentRelations in demo-data.ts');
} else {
  console.log('Pattern not matched directly, appending/replacing...');
  // Find where export function getDocumentById is
  const idx = content.lastIndexOf('export function getDocumentById');
  if (idx !== -1) {
    const pre = content.slice(0, idx);
    const post = `export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id);
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
    fs.writeFileSync(filePath, pre + post, 'utf8');
    console.log('Successfully rewrote end helpers in demo-data.ts');
  }
}
