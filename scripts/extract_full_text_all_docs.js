const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mammoth = require('mammoth');

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

async function extractHtmlForFile(fileNamePrefix) {
  // Find docx file
  const matched = allFiles.find(f => f.toLowerCase().includes(fileNamePrefix.toLowerCase()) && f.endsWith('.docx'));
  if (!matched) return null;

  const filePath = path.join(docDir, matched);
  try {
    const res = await mammoth.convertToHtml({ path: filePath });
    return { html: res.value, originalFile: matched };
  } catch (err) {
    console.error(`Error converting ${matched}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('📖 BẮT ĐẦU TRÍCH XUẤT 100% TOÀN VĂN VĂN BẢN TỪ WORD DOCX...');

  // Map of document IDs to file matches
  const docFileMap = {
    'doc-tt-58-ketoan-2026': '58 HD',
    'doc-tt-99-ketoan-2025': '99.2025',
    'doc-tt-08-hdld-2026': '08 HD',
    'doc-nd-144-gtgt-2026': '144',
    'doc-vbhn-15-xphc-2026': '15 VBHN',
    'doc-qd-2301-hcm-2026': '2301',
    'doc-cv-3643-tni-2025': '3643',
    'doc-vbhn-112-tncn': '112',
    'doc-nd-181-gtgt-2025': '181.2025',
    'doc-tt-69-gtgt-2025': '69.2025',
    'doc-nd-174-gtgt-2025': '174.2025',
    'doc-nd-320-tndn-2025': '320.2025',
    'doc-tt-20-tndn-2026': '20-2026',
    'doc-nd-132-2020': '132.2020',
    'doc-nd-20-gdlk-2025': '20.2025',
    'doc-nd-125-2020': '125.2020',
    'doc-nd-70-hoadon-2025': '70.2025',
    'doc-nd-253-tncn-2026': '253',
    'doc-luat-67-tndn-2025': '67.2025',
    'doc-luat-109-tncn-2025': '109.2025',
    'doc-nd-167-haiquan-2025': '167.2025',
    'doc-bantin-t05-2026': 'T05',
  };

  // Load existing demo-data.ts
  const demoData = require('../src/lib/demo-data.ts');
  const docs = demoData.DEMO_DOCUMENTS;

  for (const doc of docs) {
    const filePrefix = docFileMap[doc.id];
    if (filePrefix) {
      const extracted = await extractHtmlForFile(filePrefix);
      if (extracted && extracted.html && extracted.html.length > 100) {
        console.log(`✅ Trích xuất toàn văn thành công cho [${doc.document_number}]: ${extracted.html.length} ký tự`);
        
        // Add header and download link
        doc.html_content = `
<div class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg not-prose text-xs text-gray-700 space-y-1">
  <p><strong>Cơ quan ban hành:</strong> ${doc.issuing_body}</p>
  <p><strong>Số hiệu:</strong> ${doc.document_number}</p>
  <p><strong>Ngày ban hành:</strong> ${doc.issued_date} — <strong>Ngày hiệu lực:</strong> ${doc.effective_date}</p>
  <p><strong>Người ký:</strong> ${doc.signer || 'Đang cập nhật'}</p>
  <div class="pt-2">
    <a href="/documents/${encodeURIComponent(extracted.originalFile)}" target="_blank" download class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white rounded font-semibold hover:bg-blue-800 text-xs">
      📥 Tải xuống tệp gốc Word/PDF (${path.extname(extracted.originalFile).toUpperCase()})
    </a>
  </div>
</div>
<hr class="my-4 border-gray-200" />
<div class="document-full-body">
${extracted.html}
</div>
`;
      }
    }

    // Update Supabase
    await supabase.from('legal_documents').update({
      html_content: doc.html_content,
    }).eq('id', toUUID(doc.id));
  }

  // Update demo-data.ts
  const newFrontendCode = `// 100% REAL LEGAL DATABASE - WITH 100% FULL TEXT HTML CONTENT
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
  console.log('🎉 ĐÃ CẬP NHẬT 100% TOÀN VĂN VĂN BẢN VÀO HỆ THỐNG THÀNH CÔNG!');
}

main();
