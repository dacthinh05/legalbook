
import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';

for (let i = 0; i < DEMO_DOCUMENTS.length; i++) {
  const d = DEMO_DOCUMENTS[i];
  if (!d.files || d.files.length === 0) {
    console.log(`[NO FILES] ${d.document_number} - ${d.title}`);
  }
}
