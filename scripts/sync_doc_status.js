const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function syncStatus() {
  const { data: docs, error } = await supabase.from('legal_documents').select('id, document_number, effective_date, expiry_date, status');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  const today = '2026-08-29';
  for (const doc of docs) {
    let newStatus = doc.status;
    if (doc.expiry_date && doc.expiry_date <= today) {
      newStatus = 'het_hieu_luc_toan_bo';
    } else if (doc.effective_date && doc.effective_date <= today && doc.status === 'chua_hieu_luc') {
      newStatus = 'hieu_luc';
    }

    if (newStatus !== doc.status) {
      console.log('Updating ' + doc.document_number + ' from ' + doc.status + ' to ' + newStatus);
      const { error: updErr } = await supabase.from('legal_documents').update({ status: newStatus }).eq('id', doc.id);
      if (updErr) console.error('Update error:', updErr);
    }
  }
  console.log('✅ Done syncing status in Supabase!');
}
syncStatus();
