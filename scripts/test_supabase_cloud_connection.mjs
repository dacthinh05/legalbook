/**
 * Supabase Cloud Connection & Database Health Diagnostic Tool
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('================================================================');
console.log('🔍 KIỂM TRA KẾT NỐI SUPABASE CLOUD DATABASE CHO LEGALBOOK');
console.log('================================================================');
console.log(`Endpoint URL: ${url}`);
console.log(`Anon Key configured: ${Boolean(anonKey)}`);
console.log(`Service Role Key configured: ${Boolean(serviceKey)}`);
console.log('----------------------------------------------------------------');

const supabaseAnon = createClient(url, anonKey);
const supabaseAdmin = createClient(url, serviceKey || anonKey);

async function probeSupabase() {
  const results = {
    connection: false,
    auth: false,
    tables: {},
    storage: {},
    rpc: {},
    errors: []
  };

  // 1. Check Tables and Row Counts
  const tablesToCheck = [
    'legal_documents',
    'categories',
    'document_category_links',
    'document_relations',
    'document_files',
    'document_nodes',
    'document_provisions',
    'provision_anchors',
    'legal_effects',
    'legal_changesets',
    'document_annotations',
    'profiles',
    'organizations',
    'organization_members',
    'bookmarks',
    'reading_history',
    'notes',
    'tags',
    'crawler_runs',
    'crawled_documents',
    'data_quality_audits',
    'data_quality_audit_history'
  ];

  console.log('\n📊 1. KIỂM TRA CÁC BẢNG DỮ LIỆU (DATABASE TABLES):');
  for (const table of tablesToCheck) {
    try {
      const { data, count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.tables[table] = { status: 'ERROR / CHƯA TẠO', error: error.message };
        console.log(`  ❌ Bảng [${table}]: Lỗi (${error.message})`);
      } else {
        results.connection = true;
        results.tables[table] = { status: 'OK', count: count || 0 };
        console.log(`  ✅ Bảng [${table}]: Đã kết nối · Số dòng hiện có: ${count || 0}`);
      }
    } catch (err) {
      results.tables[table] = { status: 'EXCEPTION', error: String(err) };
      console.log(`  ❌ Bảng [${table}]: Exception (${String(err)})`);
    }
  }

  // 2. Check Supabase Storage
  console.log('\n📦 2. KIỂM TRA SUPABASE STORAGE BUCKETS:');
  try {
    const { data: buckets, error: bucketErr } = await supabaseAdmin.storage.listBuckets();
    if (bucketErr) {
      console.log(`  ❌ Lỗi lấy danh sách Storage: ${bucketErr.message}`);
      results.storage.error = bucketErr.message;
    } else {
      console.log(`  ✅ Tìm thấy ${buckets.length} Storage Bucket(s):`);
      for (const b of buckets) {
        console.log(`     • Bucket [${b.name}] (Public: ${b.public})`);
        results.storage[b.name] = { public: b.public, id: b.id };
      }
      if (!buckets.some(b => b.name === 'documents')) {
        console.log(`  ⚠️ Bucket "documents" chưa được tạo. Cần tạo bucket "documents" (Public) để lưu file đính kèm DOCX/PDF.`);
      }
    }
  } catch (err) {
    console.log(`  ❌ Lỗi kết nối Storage: ${String(err)}`);
  }

  // 3. Check RPC Functions
  console.log('\n⚙️ 3. KIỂM TRA CÁC HÀM TÌM KIẾM & THỦ TỤC (RPC FUNCTIONS):');
  try {
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('search_legal_documents_hybrid', {
      query_text: 'thuế',
      limit_val: 5
    });

    if (rpcErr) {
      console.log(`  ⚠️ RPC 'search_legal_documents_hybrid': ${rpcErr.message}`);
      results.rpc['search_legal_documents_hybrid'] = { status: 'MISSING / ERROR', error: rpcErr.message };
    } else {
      console.log(`  ✅ RPC 'search_legal_documents_hybrid': Hoạt động tốt · Trả về ${rpcRes ? rpcRes.length : 0} kết quả.`);
      results.rpc['search_legal_documents_hybrid'] = { status: 'OK' };
    }
  } catch (err) {
    console.log(`  ⚠️ RPC 'search_legal_documents_hybrid': Exception (${String(err)})`);
  }

  console.log('\n================================================================');
  console.log('🏁 TỔNG KẾT ĐÁNH GIÁ KẾT NỐI');
  console.log('================================================================');
  const tableSuccessCount = Object.values(results.tables).filter(t => t.status === 'OK').length;
  console.log(`• Tình trạng kết nối chung: ${results.connection ? '🟢 THÀNH CÔNG (CONNECTED)' : '🔴 THẤT BẠI'}`);
  console.log(`• Số bảng database đã tạo đúng: ${tableSuccessCount} / ${tablesToCheck.length} bảng`);
  
  if (results.tables['legal_documents'] && results.tables['legal_documents'].status === 'OK') {
    const docCount = results.tables['legal_documents'].count;
    console.log(`• Dữ liệu văn bản trên Supabase: ${docCount} văn bản`);
    if (docCount === 0) {
      console.log(`  👉 GỢI Ý: Bảng legal_documents đang trống (0 dòng). Bạn có thể chạy 'npm run seed:supabase' để nạp toàn bộ 67 văn bản thật lên database.`);
    }
  }

  console.log('================================================================\n');
}

probeSupabase();
