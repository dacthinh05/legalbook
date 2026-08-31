import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';
import { executeSearch, preindexDocuments } from '../src/lib/search.ts';

preindexDocuments(DEMO_DOCUMENTS);
console.log('DEMO_DOCUMENTS count:', DEMO_DOCUMENTS.length);
const res = executeSearch(DEMO_DOCUMENTS, 'chi phí được');
console.log('Search res for "chi phí được":', res.length);
if (res.length > 0) {
  console.log('First result:', res[0].displayTitle);
}
