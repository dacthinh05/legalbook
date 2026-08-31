
import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';

const doc3115 = DEMO_DOCUMENTS.find(d => d.document_number === '3115/TCT-CS');
console.log('DOC 3115:', JSON.stringify(doc3115?.files, null, 2));
