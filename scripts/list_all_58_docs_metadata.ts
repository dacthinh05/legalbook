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

async function listAll() {
  const { data: docs } = await supabase
    .from('legal_documents')
    .select('id, document_number, title, document_type, issuing_body, signer, issued_date, effective_date, status')
    .order('document_type', { ascending: true })
    .order('effective_date', { ascending: false });

  if (!docs) return;
  console.log(`TOTAL DOCS: ${docs.length}\n`);
  docs.forEach((d, i) => {
    console.log(`${i + 1}. [${d.document_type}] ${d.document_number || 'NO_NUM'} | ${d.title} | ${d.issuing_body} | ${d.issued_date} | ${d.id}`);
  });
}

listAll();
