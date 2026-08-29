const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function toUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
const demoData = require(demoDataPath);

const docs = demoData.DEMO_DOCUMENTS;
const categories = demoData.DEMO_CATEGORIES;

// Map category slug to id
const catMap = {};
categories.forEach(c => { catMap[c.slug] = c.id; });

const links = [];

function addLink(docId, catSlug, isPrimary = true) {
  const catId = catMap[catSlug];
  if (catId) {
    links.push({
      id: toUUID(`link-${docId}-${catId}`),
      document_id: docId,
      category_id: catId,
      is_primary: isPrimary
    });
  }
}

// Map each of the 25 real docs
docs.forEach(doc => {
  const num = doc.document_number || '';
  const title = (doc.title || '').toLowerCase();

  // Kế toán
  if (num.includes('99/2025/TT-BTC') || num.includes('58/2026/TT-BTC')) {
    addLink(doc.id, 'ke-toan-thong-tu');
    addLink(doc.id, 'ke-toan', false);
  }
  // Thuế GTGT
  else if (num.includes('181/2025') || num.includes('144/2026') || num.includes('174/2025')) {
    addLink(doc.id, 'thue-gtgt-nghi-dinh');
    addLink(doc.id, 'thue-gtgt', false);
    addLink(doc.id, 'thue', false);
  }
  else if (num.includes('69/2025/TT-BTC')) {
    addLink(doc.id, 'thue-gtgt-thong-tu');
    addLink(doc.id, 'thue-gtgt', false);
    addLink(doc.id, 'thue', false);
  }
  else if (num.includes('1585/QTR')) {
    addLink(doc.id, 'thue-gtgt-cong-van');
    addLink(doc.id, 'thue-gtgt', false);
    addLink(doc.id, 'thue', false);
  }
  // Thuế TNDN
  else if (num.includes('67/2025/QH15') || num.includes('320/2025') || num.includes('20/2026/TT-BTC') || num.includes('572/TNG')) {
    addLink(doc.id, 'thue-tndn');
    addLink(doc.id, 'thue', false);
  }
  // Thuế TNCN
  else if (num.includes('109/2025/QH15') || num.includes('253/2026') || num.includes('112/VBHN')) {
    addLink(doc.id, 'thue-tncn');
    addLink(doc.id, 'thue', false);
  }
  // Hóa đơn
  else if (num.includes('70/2025') || num.includes('125/2020') || num.includes('15/VBHN') || num.includes('3643/TNI')) {
    addLink(doc.id, 'hoa-don-chung-tu');
    addLink(doc.id, 'thue', false);
  }
  // Giao dịch liên kết
  else if (num.includes('132/2020') || num.includes('20/2025/NĐ-CP')) {
    addLink(doc.id, 'thue-giao-dich-lien-ket');
    addLink(doc.id, 'giao-dich-lien-ket-dn', false);
    addLink(doc.id, 'thue', false);
  }
  // Lao động
  else if (num.includes('08/2026/TT-BLĐTBXH')) {
    addLink(doc.id, 'lao-dong-thong-tu');
    addLink(doc.id, 'lao-dong-tien-luong', false);
  }
  // Đầu tư & Đất đai
  else if (num.includes('2301/QĐ') || num.includes('50/2026')) {
    addLink(doc.id, 'dau-tu');
  }
  // Hải quan & Bản tin PACO
  else if (num.includes('167/2025') || num.includes('PACO-T05')) {
    addLink(doc.id, 'thue');
    addLink(doc.id, 'doanh-nghiep', false);
  }
  // Fallback
  else {
    addLink(doc.id, 'thue');
  }
});

console.log(`Generated ${links.length} category links for 25 authentic documents.`);

// Generate updated TypeScript code
const finalCode = `// 100% REAL LEGAL DATABASE - ZERO DEMO DATA - AUTHENTIC FULL-TEXT
import type { LegalDocument, Category, DocumentCategoryLink, DocumentRelation } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(categories, null, 2)};

export const DEMO_DOCUMENTS: Partial<LegalDocument>[] = ${JSON.stringify(docs, null, 2)};

export const DEMO_CATEGORY_LINKS: DocumentCategoryLink[] = ${JSON.stringify(links, null, 2)};

export const DEMO_RELATIONS: DocumentRelation[] = ${JSON.stringify(demoData.DEMO_RELATIONS, null, 2)};

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

fs.writeFileSync(demoDataPath, finalCode, 'utf-8');
console.log('✅ Updated demo-data.ts with complete typed links!');
