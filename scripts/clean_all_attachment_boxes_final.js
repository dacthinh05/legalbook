const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

const filesToClean = [
  path.join(__dirname, '../src/lib/demo-data.ts'),
  path.join(__dirname, '../src/lib/paco-data.ts'),
];

function cleanContent(str) {
  // Regex to remove the entire <div class="bg-blue-50 ...">...</div> block
  // handles both escaped \" and unescaped "
  let cleaned = str.replace(
    /\\n<div class=\\"bg-blue-50 border border-blue-200 rounded p-4 mt-6\\">[\s\S]*?<\/div>/g,
    ''
  );
  cleaned = cleaned.replace(
    /\n<div class="bg-blue-50 border border-blue-200 rounded p-4 mt-6">[\s\S]*?<\/div>/g,
    ''
  );
  cleaned = cleaned.replace(
    /<div class=\\"bg-blue-50[^"]*\\"[\s\S]*?<\/div>/g,
    ''
  );
  cleaned = cleaned.replace(
    /<div class="bg-blue-50[^"]*"[\s\S]*?<\/div>/g,
    ''
  );
  return cleaned;
}

async function main() {
  console.log('🧹 BẮT ĐẦU QUÉT VÀ XÓA TRIỆT ĐỂ TOÀN BỘ KHỐI ATTACHMENT Ở TẤT CẢ FILE & SUPABASE...');

  for (const filePath of filesToClean) {
    if (fs.existsSync(filePath)) {
      const original = fs.readFileSync(filePath, 'utf-8');
      const cleaned = cleanContent(original);
      fs.writeFileSync(filePath, cleaned, 'utf-8');
      console.log(`✅ Đã làm sạch file: ${path.basename(filePath)}`);
    }
  }

  // Clean Supabase legal_documents table
  const { data: docs, error } = await supabase.from('legal_documents').select('id, html_content');
  if (docs) {
    let updatedCount = 0;
    for (const doc of docs) {
      if (doc.html_content && (doc.html_content.includes('bg-blue-50') || doc.html_content.includes('AUDIT PACO'))) {
        const cleanedHtml = cleanContent(doc.html_content);
        await supabase.from('legal_documents').update({ html_content: cleanedHtml }).eq('id', doc.id);
        updatedCount++;
      }
    }
    console.log(`✅ Đã cập nhật làm sạch ${updatedCount} bản ghi trên Supabase Database.`);
  }

  console.log('🎉 XỬ LÝ HOÀN TẤT!');
}

main();
