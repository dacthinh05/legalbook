import * as fs from 'fs';
import * as path from 'path';
import { Packer } from 'docx';
import { DEMO_DOCUMENTS, DEMO_CATEGORIES, DEMO_CATEGORY_LINKS, DEMO_RELATIONS } from '../src/lib/demo-data';
import { createLegalDocxDocument } from '../src/lib/document-import/docx-exporter';
import type { LegalDocument } from '../src/types';

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/*?:"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateDocxFilename(doc: LegalDocument): string {
  const typePrefix = doc.document_type === 'thong_tu' ? 'TT'
    : doc.document_type === 'nghi_dinh' ? 'ND'
    : doc.document_type === 'luat' ? 'Luat'
    : doc.document_type === 'quyet_dinh' ? 'QD'
    : doc.document_type === 'cong_van' ? 'CV'
    : 'VB';

  const docNumClean = (doc.document_number || 'Van-ban').replace(/[/]/g, '.');
  const shortTitleClean = (doc.title || '')
    .replace(/^Thông tư\s+/i, '')
    .replace(/^Nghị định\s+/i, '')
    .replace(/^Luật\s+/i, '')
    .replace(/^Quyết định\s+/i, '')
    .replace(/^Công văn\s+/i, '')
    .slice(0, 60);

  return sanitizeFilename(`${typePrefix} ${docNumClean} - ${shortTitleClean}.docx`);
}

async function main() {
  const docsDir = path.resolve(process.cwd(), 'public/documents');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  console.log(`Auditing ${DEMO_DOCUMENTS.length} documents for attachments...`);
  let generatedCount = 0;

  for (const doc of DEMO_DOCUMENTS) {
    if (!doc.files || doc.files.length === 0) {
      const filename = generateDocxFilename(doc);
      const filePath = path.join(docsDir, filename);

      console.log(`Generating DOCX for [${doc.document_number}] -> ${filename}...`);

      const docxDoc = createLegalDocxDocument({
        title: doc.title,
        documentNumber: doc.document_number,
        documentType: doc.document_type,
        issuingBody: doc.issuing_body,
        signer: doc.signer,
        issuedDate: doc.issued_date,
        effectiveDate: doc.effective_date,
        htmlContent: doc.html_content,
        summaryMain: doc.summary_main,
      });

      const buffer = await Packer.toBuffer(docxDoc);
      fs.writeFileSync(filePath, buffer);

      const fileId = `file-${doc.id.slice(0, 8)}-docx`;
      const encodedFilename = encodeURIComponent(filename);
      const storageUrl = `https://pfgxkybzwwuzkyquhpdc.supabase.co/storage/v1/object/public/documents/${encodedFilename.replace(/%/g, '_')}`;

      doc.files = [
        {
          id: fileId,
          version: 1,
          file_url: `/documents/${filename}`,
          file_size: buffer.length,
          file_type: 'docx',
          created_at: new Date().toISOString(),
          is_primary: true,
          document_id: doc.id,
          uploaded_by: null,
          original_filename: filename,
        }
      ];

      generatedCount++;
    }
  }

  console.log(`\nSuccessfully generated ${generatedCount} DOCX files in public/documents/`);

  // Write updated DEMO_DOCUMENTS back to demo-data.ts
  const demoDataPath = path.resolve(process.cwd(), 'src/lib/demo-data.ts');
  const fileContent = `/**
 * demo-data.ts
 * Single source of truth for all verified legal documents, categories, and relations.
 */
import type { LegalDocument, Category, CategoryDocumentLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(DEMO_CATEGORIES, null, 2)};

export const DEMO_CATEGORY_LINKS: CategoryDocumentLink[] = ${JSON.stringify(DEMO_CATEGORY_LINKS, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(DEMO_RELATIONS, null, 2)};

export const DEMO_DOCUMENTS: LegalDocument[] = ${JSON.stringify(DEMO_DOCUMENTS, null, 2)};

export function getDocumentById(id: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.id === id);
}

export function getDocumentByNumber(docNumber: string): LegalDocument | undefined {
  return DEMO_DOCUMENTS.find((d) => d.document_number === docNumber);
}

export function getDocumentRelations(documentId: string): DocumentRelation[] {
  return DEMO_RELATIONS.filter(
    (r) => r.source_document_id === documentId || r.target_document_id === documentId
  );
}

export function buildCategoryTree(): Category[] {
  const map = new Map<string, Category & { children: Category[] }>();
  const roots: (Category & { children: Category[] })[] = [];

  DEMO_CATEGORIES.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  DEMO_CATEGORIES.forEach((cat) => {
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
`;

  fs.writeFileSync(demoDataPath, fileContent, 'utf8');
  console.log(`Updated ${demoDataPath} with 100% attached DOCX files.`);
}

main().catch(console.error);
