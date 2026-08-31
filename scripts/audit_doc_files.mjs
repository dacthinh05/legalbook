
import { DEMO_DOCUMENTS } from '../src/lib/demo-data.ts';
import * as fs from 'fs';
import * as path from 'path';

const docsDir = path.resolve('public/documents');
const diskFiles = fs.readdirSync(docsDir);

console.log('Total documents in DEMO_DOCUMENTS: ' + DEMO_DOCUMENTS.length);
console.log('Total files in public/documents: ' + diskFiles.length);

let missingFilesCount = 0;
let attachedCount = 0;

for (let i = 0; i < DEMO_DOCUMENTS.length; i++) {
  const d = DEMO_DOCUMENTS[i];
  const files = d.files || [];
  if (files.length === 0) {
    missingFilesCount++;
    console.log(`[MISSING FILES] ${d.document_number} - ${d.title}`);
  } else {
    attachedCount++;
    const f = files[0];
    const existsOnDisk = fs.existsSync(path.join(docsDir, f.original_filename || ''));
    if (!existsOnDisk) {
      console.log(`[FILE NOT ON DISK] ${d.document_number}: ${f.original_filename} (url: ${f.file_url})`);
    }
  }
}

console.log(`\nSUMMARY: Attached = ${attachedCount}, Missing = ${missingFilesCount}`);
