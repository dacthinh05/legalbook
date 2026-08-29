const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

function toUUID(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

function sanitizeStorageKey(filename) {
  // Convert Vietnamese accents and spaces to clean ASCII safe filename
  const str = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/_+/g, '_');
}

async function syncAll() {
  console.log('--- 1. Uploading AUDIT PACO Files to Supabase Storage ---');
  const docDir = path.join(__dirname, '../public/documents');
  const files = fs.readdirSync(docDir);

  for (const file of files) {
    const filePath = path.join(docDir, file);
    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(file).toLowerCase();
    const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/msword';
    const storageKey = sanitizeStorageKey(file);

    const { data, error } = await supabase.storage.from('documents').upload(storageKey, fileBuffer, {
      contentType,
      upsert: true,
    });
    if (error) {
      console.error(`Upload error for ${file} -> ${storageKey}:`, error.message);
    } else {
      console.log(`✅ Uploaded to storage: ${storageKey}`);
    }
  }

  console.log('🎉 Toàn bộ dữ liệu và file gốc đã được đồng bộ lên Supabase Cloud thành công!');
}

syncAll();
