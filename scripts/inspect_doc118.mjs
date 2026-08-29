import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';
import { extractToc, findTocElement } from '../src/lib/toc-utils.ts';
import { formatLegalHtmlContent } from '../src/lib/legal-formatter.ts';
import { JSDOM } from 'jsdom';

const doc118 = DEMO_DOCUMENTS.find(d => d.document_number === '118/2026/TT-BTC');
console.log('Doc 118 title:', doc118?.title);
console.log('Raw HTML length:', doc118?.html_content?.length);

const formatted = formatLegalHtmlContent(doc118.html_content, doc118);
const dom = new JSDOM(`<div class="reader-viewport"><div class="legal-doc-content">${formatted}</div></div>`);
const container = dom.window.document.querySelector('.legal-doc-content');

const items = extractToc(formatted);
console.log('Extracted TOC items count:', items.length);
console.log('TOC items:', items.map(i => ({ id: i.id, targetId: i.targetId, title: i.title })));

const dieu9Item = items.find(i => i.articleNumber === '9' || i.title.includes('Điều 9'));
console.log('Dieu 9 TOC item:', dieu9Item);

const el9 = findTocElement(container, dieu9Item);
console.log('Found element for Dieu 9:', el9 ? { id: el9.id, tagName: el9.tagName, text: el9.textContent } : 'NOT FOUND');
