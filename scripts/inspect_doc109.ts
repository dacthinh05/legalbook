import { DEMO_DOCUMENTS } from '../src/lib/demo-data';

const doc109 = DEMO_DOCUMENTS.find(d => d.document_number === '109/2025/QH15');
if (doc109) {
  console.log('Doc 109 length:', doc109.html_content?.length);
  const snippet = doc109.html_content?.slice(0, 2000) || '';
  console.log('Doc 109 snippet:\n', snippet);
}
