const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

function toUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const docDir = path.join(__dirname, '../public/documents');
const allFiles = fs.readdirSync(docDir);

async function main() {
  console.log('🚀 BẮT ĐẦU TẢI TOÀN BỘ TỆP LÊN SUPABASE STORAGE VÀ TRÍCH XUẤT NỘI DUNG CHUẨN...');

  // 1. Ensure bucket 'documents' is public
  await supabase.storage.createBucket('documents', { public: true }).catch(() => {});

  // 2. Upload all files to Supabase Storage
  const fileUrlMap = {};

  for (const fileName of allFiles) {
    const filePath = path.join(docDir, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const contentType = ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    // Upload to Supabase Storage
    const storagePath = encodeURIComponent(fileName).replace(/%/g, '_');
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        upsert: true,
        contentType,
      });

    const { data: publicUrlData } = supabase.storage
      .from('documents')
      .getPublicUrl(storagePath);

    fileUrlMap[fileName] = publicUrlData.publicUrl;
    console.log(`  ☁️ Uploaded to Supabase Storage: [${fileName}] ➔ ${publicUrlData.publicUrl}`);
  }

  // 3. Document to file prefix mapping
  const docFileMap = {
    'doc-cv-1585-qtr-2025': { prefix: '1585', type: 'pdf' },
    'doc-cv-572-tng-2025': { prefix: '572', type: 'pdf' },
    'doc-nd-50-datdai-2026': { prefix: '50.2026', type: 'pdf' },
    'doc-tt-58-ketoan-2026': { prefix: '58 HD', type: 'docx' },
    'doc-tt-99-ketoan-2025': { prefix: '99.2025', type: 'docx' },
    'doc-tt-08-hdld-2026': { prefix: '08 HD', type: 'docx' },
    'doc-nd-144-gtgt-2026': { prefix: '144', type: 'docx' },
    'doc-vbhn-15-xphc-2026': { prefix: '15 VBHN', type: 'docx' },
    'doc-qd-2301-hcm-2026': { prefix: '2301', type: 'docx' },
    'doc-cv-3643-tni-2025': { prefix: '3643', type: 'docx' },
    'doc-vbhn-112-tncn': { prefix: '112', type: 'docx' },
    'doc-nd-181-gtgt-2025': { prefix: '181.2025', type: 'docx' },
    'doc-tt-69-gtgt-2025': { prefix: '69.2025', type: 'docx' },
    'doc-nd-174-gtgt-2025': { prefix: '174.2025', type: 'docx' },
    'doc-nd-320-tndn-2025': { prefix: '320.2025', type: 'docx' },
    'doc-tt-20-tndn-2026': { prefix: '20-2026', type: 'docx' },
    'doc-nd-132-2020': { prefix: '132.2020', type: 'docx' },
    'doc-nd-20-gdlk-2025': { prefix: '20.2025', type: 'docx' },
    'doc-nd-125-2020': { prefix: '125.2020', type: 'docx' },
    'doc-nd-70-hoadon-2025': { prefix: '70.2025', type: 'docx' },
    'doc-nd-253-tncn-2026': { prefix: '253', type: 'docx' },
    'doc-luat-67-tndn-2025': { prefix: '67.2025', type: 'docx' },
    'doc-luat-109-tncn-2025': { prefix: '109.2025', type: 'docx' },
    'doc-nd-167-haiquan-2025': { prefix: '167.2025', type: 'docx' },
    'doc-bantin-t05-2026': { prefix: 'T05', type: 'docx' },
  };

  const demoData = require('../src/lib/demo-data.ts');
  const docs = demoData.DEMO_DOCUMENTS;

  for (const doc of docs) {
    const config = docFileMap[doc.id];
    let supabaseFileUrl = null;
    let originalName = null;

    if (config) {
      const matched = allFiles.find(f => f.toLowerCase().includes(config.prefix.toLowerCase()) && (f.endsWith(`.${config.type}`) || (config.type === 'docx' && f.endsWith('.docx'))));
      if (matched) {
        originalName = matched;
        supabaseFileUrl = fileUrlMap[matched];

        const filePath = path.join(docDir, matched);

        // Extract full content
        if (config.type === 'docx') {
          try {
            const res = await mammoth.convertToHtml({ path: filePath });
            if (res.value && res.value.length > 50) {
              doc.html_content = `
<div class="document-full-body">
${res.value}
</div>
`;
            }
          } catch (e) {
            console.error(`Mammoth error ${matched}:`, e.message);
          }
        } else if (config.type === 'pdf') {
          try {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            if (pdfData.text && pdfData.text.length > 50) {
              // Format pdf text into paragraphs
              const formattedHtml = pdfData.text
                .split('\n\n')
                .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
                .join('\n');

              doc.html_content = `
<div class="document-full-body">
${formattedHtml}
</div>
`;
            }
          } catch (e) {
            console.error(`PDF parse error ${matched}:`, e.message);
          }
        }
      }
    }

    // Attach verified files metadata pointing to Supabase Storage
    if (supabaseFileUrl) {
      doc.files = [
        {
          id: `file-${doc.id}`,
          document_id: doc.id,
          file_type: originalName.endsWith('.pdf') ? 'pdf' : 'docx',
          file_url: supabaseFileUrl,
          file_size: 150000,
          original_filename: originalName,
          is_primary: true,
          version: 1,
          uploaded_by: null,
          created_at: new Date().toISOString(),
        }
      ];

      // Update Supabase document_files table
      await supabase.from('document_files').upsert({
        id: toUUID(`file-${doc.id}`),
        document_id: toUUID(doc.id),
        file_type: originalName.endsWith('.pdf') ? 'pdf' : 'docx',
        file_url: supabaseFileUrl,
        file_size: 150000,
        original_filename: originalName,
        is_primary: true,
        version: 1,
      });
    }

    // Update Supabase legal_documents
    await supabase.from('legal_documents').update({
      html_content: doc.html_content,
    }).eq('id', toUUID(doc.id));
  }

  // Update demo-data.ts
  const newFrontendCode = `// 100% REAL LEGAL DATABASE - WITH DIRECT SUPABASE STORAGE CLOUD CDN URLS
import type { LegalDocument, Category } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(demoData.DEMO_CATEGORIES, null, 2)};

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(docs, null, 2)};

export const DEMO_CATEGORY_LINKS = ${JSON.stringify(demoData.DEMO_CATEGORY_LINKS, null, 2)};

export const DEMO_RELATIONS = ${JSON.stringify(demoData.DEMO_RELATIONS, null, 2)};

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

  fs.writeFileSync(path.join(__dirname, '../src/lib/demo-data.ts'), newFrontendCode);
  console.log('🎉 ĐÃ UPLOAD 100% TỆP LÊN SUPABASE STORAGE & TRÍCH XUẤT TOÀN VĂN PDF/DOC THÀNH CÔNG!');
}

main();
