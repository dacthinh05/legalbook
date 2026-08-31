/**
 * Update Quality & Verification Status for Master Documents in Supabase
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

async function run() {
  const envContent = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const env: Record<string, string> = {};
  envContent.split('\n').forEach(line => {
    const [k, ...v] = line.split('=');
    if (k && v.length) env[k.trim()] = v.join('=').trim();
  });

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const docIds = [
    '60cc814d-6a97-4a30-ab03-dfc2d3d2f747',
    'e1322020-0000-4000-8000-000000000132',
    'e1252020-0000-4000-8000-000000000125'
  ];

  const { error } = await supabase
    .from('legal_documents')
    .update({
      content_status: 'verified',
      quality_status: 'complete',
      review_status: 'published',
      is_published: true,
      is_deleted: false,
      updated_at: new Date().toISOString()
    })
    .in('id', docIds);

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log('✅ Successfully updated content_status to verified in Supabase!');
  }
}

run().catch(console.error);
