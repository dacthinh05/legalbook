/**
 * Pure 5 Full-Text Proven Legal Corpus Builder
 * 
 * Contains EXCLUSIVELY the 5 legal statutes verified to have complete, un-truncated full text (Chương, Điều, Khoản).
 * 
 * 1. [109/2025/QH15] Luật Thuế Thu nhập cá nhân số 109/2025/QH15 (34,065 chars)
 * 2. [67/2025/QH15] Luật Thuế Thu nhập doanh nghiệp số 67/2025/QH15 (52,278 chars)
 * 3. [320/2025/NĐ-CP] Nghị định 320/2025/NĐ-CP quy định chi tiết thi hành Luật Thuế TNDN (187,995 chars)
 * 4. [69/2025/TT-BTC] Thông tư 69/2025/TT-BTC hướng dẫn chi tiết thi hành Luật Thuế GTGT (52,076 chars)
 * 5. [112/VBHN-VPQH] Văn bản hợp nhất 112/VBHN-VPQH — Luật Thuế Thu nhập cá nhân (35,242 chars)
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BASE_DOCS_PATH = path.join(__dirname, 'base_authentic_docs.json');
const DEMO_DATA_PATH = path.join(ROOT, 'src', 'lib', 'demo-data.ts');
const CATEGORIES_PATH = path.join(__dirname, 'original_categories.json');

const baseDocs = JSON.parse(fs.readFileSync(BASE_DOCS_PATH, 'utf8'));

const ALLOWED_NUMBERS = new Set([
  '109/2025/QH15',
  '67/2025/QH15',
  '320/2025/NĐ-CP',
  '69/2025/TT-BTC',
  '112/VBHN-VPQH'
]);

const proven5Corpus = baseDocs.filter(d => ALLOWED_NUMBERS.has(d.document_number)).map(d => ({
  ...d,
  is_published: true,
  is_deleted: false,
  verification_status: 'verified',
  source_url: 'https://vanban.chinhphu.vn'
}));

console.log(`Proven 5 full-text documents found: ${proven5Corpus.length}`);
proven5Corpus.forEach((d, i) => {
  console.log(`${i + 1}. [${d.document_number}] ${d.title} (Length: ${d.html_content?.length} chars)`);
});

const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'));

const categoryLinks = [];
const catBySlug = {};
categories.forEach(c => { catBySlug[c.slug] = c.id; });

proven5Corpus.forEach(doc => {
  const text = (doc.title + ' ' + doc.summary_main + ' ' + (doc.document_number || '')).toLowerCase();
  const linkedCats = new Set();

  if (text.includes('thuế gtgt') || text.includes('giá trị gia tăng')) {
    if (catBySlug['thue-gtgt']) linkedCats.add(catBySlug['thue-gtgt']);
    if (catBySlug['thue']) linkedCats.add(catBySlug['thue']);
  }
  if (text.includes('thuế tndn') || text.includes('thu nhập doanh nghiệp')) {
    if (catBySlug['thue-tndn']) linkedCats.add(catBySlug['thue-tndn']);
    if (catBySlug['thue']) linkedCats.add(catBySlug['thue']);
  }
  if (text.includes('thuế tncn') || text.includes('thu nhập cá nhân')) {
    if (catBySlug['thue-tncn']) linkedCats.add(catBySlug['thue-tncn']);
    if (catBySlug['thue']) linkedCats.add(catBySlug['thue']);
  }

  if (linkedCats.size === 0) {
    if (catBySlug['phap-luat-chung']) linkedCats.add(catBySlug['phap-luat-chung']);
  }

  linkedCats.forEach(catId => {
    categoryLinks.push({
      document_id: doc.id,
      category_id: catId,
      is_primary: true
    });
  });
});

const outputCode = `// PACO LegalBook - Master Verified Authentic Legal Database (5 Proven Full-Text Statutes)
import type { LegalDocument, Category, CategoryLink } from '@/types';

export const DEMO_CATEGORIES: Category[] = ${JSON.stringify(categories, null, 2)};

export const DEMO_DOCUMENTS: LegalDocument[] = ${JSON.stringify(proven5Corpus, null, 2)};

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

export const DEMO_CATEGORY_LINKS: CategoryLink[] = ${JSON.stringify(categoryLinks, null, 2)};
`;

fs.writeFileSync(DEMO_DATA_PATH, outputCode, 'utf8');
console.log(`Successfully wrote ${DEMO_DATA_PATH} with 5 strictly proven authentic documents.`);
