import { DEMO_DOCUMENTS } from '../src/lib/demo-data';

const doc253 = DEMO_DOCUMENTS.find(d => d.document_number === '253/2026/NĐ-CP');
if (doc253) {
  const html = doc253.html_content || '';
  console.log('Doc 253 start (first 2500 chars):\n', html.slice(0, 2500));
}
