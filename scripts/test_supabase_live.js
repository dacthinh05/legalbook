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
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase at:', supabaseUrl);

const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function testConnection() {
  try {
    const { data: cats, error: catErr } = await supabase.from('categories').select('count');
    if (catErr) {
      console.error('Categories error:', catErr.message);
    } else {
      console.log('✅ Categories table connected successfully!');
    }

    const { data: docs, error: docErr } = await supabase.from('legal_documents').select('count');
    if (docErr) {
      console.error('Legal documents error:', docErr.message);
    } else {
      console.log('✅ Legal documents table connected successfully!');
    }

    const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
    if (bErr) {
      console.error('Storage error:', bErr.message);
    } else {
      console.log('✅ Storage connected! Buckets:', buckets.map(b => b.name));
    }
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
