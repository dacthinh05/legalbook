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

async function checkData() {
  console.log('=== 1. KIỂM TRA DỮ LIỆU TRÊN SUPABASE CLOUD ===');
  const { data: docs, error } = await supabase
    .from('legal_documents')
    .select('id, document_number, title, issuing_body, status, issued_date, effective_date')
    .order('effective_date', { ascending: false });

  if (error) {
    console.error('Lỗi truy vấn Supabase:', error.message);
    return;
  }

  console.log(`Tổng số văn bản hiện có trên Supabase: ${docs.length}`);
  console.log('\nDanh sách toàn bộ văn bản trong CSDL Supabase:');
  docs.forEach((d, idx) => {
    console.log(`${idx + 1}. [${d.document_number}] ${d.title} (${d.issuing_body}, Hiệu lực: ${d.effective_date})`);
  });

  // Check for any suspicious/demo words
  const suspicious = docs.filter(d => 
    d.title.toLowerCase().includes('demo') || 
    d.title.toLowerCase().includes('minh họa') ||
    d.title.toLowerCase().includes('giả định') ||
    d.document_number.includes('demo')
  );

  console.log(`\nSố lượng văn bản ảo/demo phát hiện: ${suspicious.length}`);
}

checkData();
