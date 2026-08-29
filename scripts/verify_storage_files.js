const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

async function checkStorage() {
  console.log('=== 2. KIỂM TRA STORAGE TRÊN SUPABASE ===');
  const { data: files, error } = await supabase.storage.from('documents').list();
  if (error) {
    console.error('Lỗi Storage:', error.message);
    return;
  }
  console.log(`Số lượng file gốc trong Supabase Storage bucket 'documents': ${files.length}`);
  files.forEach((f, i) => console.log(`${i+1}. ${f.name} (${(f.metadata?.size / 1024).toFixed(1)} KB)`));
}

checkStorage();
