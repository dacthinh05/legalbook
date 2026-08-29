import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Connecting to Supabase:', supabaseUrl);

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: docs, error } = await supabase
    .from('legal_documents')
    .select('id, document_number, title, html_content, content_status, is_deleted')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Supabase docs:', error);
    return;
  }

  console.log(`Total documents in Supabase: ${docs.length}`);
  
  const shortDocs: Array<{ num: string | null; title: string; length: number; status: string }> = [];
  const demoBoxDocs: Array<{ num: string | null; title: string; length: number }> = [];
  const validDocs: Array<{ num: string | null; title: string; length: number }> = [];

  for (const doc of docs) {
    const html = doc.html_content || '';
    const hasBox = html.includes('ĐIỂM NỔI BẬT') || html.includes('legal-box') || html.includes('warning');
    const isShort = html.length < 3000;
    
    if (hasBox) {
      demoBoxDocs.push({
        num: doc.document_number,
        title: doc.title.slice(0, 50),
        length: html.length
      });
    } else if (isShort) {
      shortDocs.push({
        num: doc.document_number,
        title: doc.title.slice(0, 50),
        length: html.length,
        status: doc.content_status
      });
    } else {
      validDocs.push({
        num: doc.document_number,
        title: doc.title.slice(0, 50),
        length: html.length
      });
    }
  }

  console.log(`\nValid full text docs: ${validDocs.length}`);
  console.log(`Docs with DEMO BOXES: ${demoBoxDocs.length}`);
  console.log(`Short docs: ${shortDocs.length}`);

  if (demoBoxDocs.length > 0) {
    console.log('\n--- DOCS WITH DEMO BOXES (ĐIỂM NỔI BẬT) ---');
    demoBoxDocs.forEach((d, i) => console.log(`${i+1}. [${d.num}] ${d.title} (${d.length} chars)`));
  }

  if (shortDocs.length > 0) {
    console.log('\n--- SHORT DOCS (< 3000 chars) ---');
    shortDocs.forEach((d, i) => console.log(`${i+1}. [${d.num}] ${d.title} (${d.length} chars, status: ${d.status})`));
  }
}

main();
