import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';
import { extractToc, findTocElement } from '../src/lib/toc-utils.ts';
import { formatLegalHtmlContent } from '../src/lib/legal-formatter.ts';
import { JSDOM } from 'jsdom';

let totalDocs = DEMO_DOCUMENTS.length;
let totalTocItems = 0;
let matchedItems = 0;
let failedItems = [];

for (const doc of DEMO_DOCUMENTS) {
  if (!doc.html_content) continue;
  const formatted = formatLegalHtmlContent(doc.html_content, doc);
  const dom = new JSDOM(`<div class="reader-viewport"><div class="legal-doc-content">${formatted}</div></div>`);
  const container = dom.window.document.querySelector('.legal-doc-content');
  const items = extractToc(formatted);
  totalTocItems += items.length;

  for (const item of items) {
    const el = findTocElement(container, item);
    if (el) {
      matchedItems++;
    } else {
      failedItems.push({ doc: doc.document_number, item: item.title, targetId: item.targetId });
    }
  }
}

console.log(`Audited ${totalDocs} documents.`);
console.log(`Total TOC Items: ${totalTocItems}`);
console.log(`Matched Items: ${matchedItems}`);
console.log(`Failed Items: ${failedItems.length}`);
if (failedItems.length > 0) {
  console.log('Sample failed:', failedItems.slice(0, 10));
}
