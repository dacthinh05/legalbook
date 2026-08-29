import * as fs from 'fs';
import * as path from 'path';

const demoPath = path.resolve(process.cwd(), 'src/lib/demo-data.ts');
let content = fs.readFileSync(demoPath, 'utf8');

// Replace getCategoryDocumentCount implementation
const oldHelper = /export function getCategoryDocumentCount\([^)]*\)[^}]*\}/;
const newHelper = `export function getCategoryDocumentCount(categoryId: string): number {
  return getDocumentsForCategoryTree(categoryId).length;
}`;

if (oldHelper.test(content)) {
  content = content.replace(oldHelper, newHelper);
} else {
  content += '\n' + newHelper + '\n';
}

fs.writeFileSync(demoPath, content, 'utf8');
console.log('Successfully updated getCategoryDocumentCount in demo-data.ts');
