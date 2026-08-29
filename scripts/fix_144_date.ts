import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  console.log('Fixing issued_date for 144/2026/NĐ-CP to 2026-05-05...');
  await supabase
    .from('legal_documents')
    .update({ issued_date: '2026-05-05', updated_at: new Date().toISOString() })
    .eq('document_number', '144/2026/NĐ-CP');
  
  const demoPath = path.resolve(process.cwd(), 'src/lib/demo-data.ts');
  let demo = fs.readFileSync(demoPath, 'utf8');
  demo = demo.replace(/"document_number": "144\/2026\/NĐ-CP",\s*"document_type": "nghi_dinh",\s*"issuing_body": "Chính phủ",\s*"signer": "Phạm Minh Chính",\s*"issued_date": "[^"]+"/, '"document_number": "144/2026/NĐ-CP",\n    "document_type": "nghi_dinh",\n    "issuing_body": "Chính phủ",\n    "signer": "Phạm Minh Chính",\n    "issued_date": "2026-05-05"');
  fs.writeFileSync(demoPath, demo, 'utf8');
  console.log('Done updating 144/2026/NĐ-CP issued_date.');
}

main();
