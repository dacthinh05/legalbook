import * as fs from 'fs';
import * as path from 'path';

const demoPath = path.resolve(process.cwd(), 'src/lib/demo-data.ts');
let content = fs.readFileSync(demoPath, 'utf8');

// Ensure all cong_van have effective_date: null
const parsedData = JSON.parse(content.match(/export const DEMO_DOCUMENTS: LegalDocument\[\] = (\[[\s\S]*?\]);\n\nexport/)?.[1] || '[]');

if (parsedData.length > 0) {
  parsedData.forEach((d: any) => {
    if (d.document_type === 'cong_van') {
      d.effective_date = null;
    }
  });

  content = content.replace(
    /export const DEMO_DOCUMENTS: LegalDocument\[\] = \[[\s\S]*?\];\n\nexport/,
    `export const DEMO_DOCUMENTS: LegalDocument[] = ${JSON.stringify(parsedData, null, 2)};\n\nexport`
  );
  fs.writeFileSync(demoPath, content, 'utf8');
  console.log('Successfully set effective_date: null for all cong_van.');
}
