const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: cats } = await supabase.from('categories').select('*');
  const { data: docs } = await supabase.from('legal_documents').select('*');

  console.log(`Processing ${docs.length} documents and ${cats.length} categories...`);

  const catMap = new Map();
  cats.forEach(c => {
    catMap.set(c.slug, c);
    catMap.set(c.id, c);
  });

  const links = [];

  for (const doc of docs) {
    const title = (doc.title || '').toLowerCase();
    const num = (doc.document_number || '').toLowerCase();
    const type = doc.document_type;
    const catSlugs = new Set();

    // 1. KẾ TOÁN
    if (title.includes('kế toán') || title.includes('ifrs') || title.includes('vfrs') || title.includes('hcsn') || num.includes('88/2015') || num.includes('99/2025') || num.includes('200/2014') || num.includes('58/2026') || num.includes('118/2026') || num.includes('107/2025') || num.includes('101/2025') || num.includes('24/2024')) {
      catSlugs.add('ke-toan');
      if (type === 'luat') catSlugs.add('ke-toan-luat');
      if (type === 'nghi_dinh') catSlugs.add('ke-toan-nghi-dinh');
      if (type === 'thong_tu') {
        catSlugs.add('ke-toan-thong-tu');
        if (title.includes('hcsn') || title.includes('quỹ') || num.includes('107/2025') || num.includes('24/2024')) {
          catSlugs.add('ke-toan-hcsn-quy');
        }
      }
      if (type === 'cong_van') catSlugs.add('ke-toan-cong-van');
      if (type === 'chuan_muc' || title.includes('chuẩn mực') || title.includes('ifrs')) catSlugs.add('ke-toan-chuan-muc');
    }

    // 2. KIỂM TOÁN
    if (title.includes('kiểm toán') || num.includes('67/2011') || num.includes('84/2016') || num.includes('214/2012')) {
      catSlugs.add('kiem-toan');
      if (type === 'luat') catSlugs.add('kiem-toan-luat');
      if (type === 'nghi_dinh') catSlugs.add('kiem-toan-nghi-dinh');
      if (type === 'chuan_muc' || title.includes('chuẩn mực') || num.includes('214/2012')) catSlugs.add('kiem-toan-chuan-muc');
      if (type === 'huong_dan' || type === 'cong_van') catSlugs.add('kiem-toan-huong-dan');
    }

    // 3. THUẾ GTGT
    if (title.includes('giá trị gia tăng') || title.includes('gtgt') || num.includes('48/2024') || num.includes('181/2025') || num.includes('69/2025') || num.includes('174/2025') || num.includes('144/2026') || num.includes('1585/qtr')) {
      catSlugs.add('thue');
      catSlugs.add('thue-gtgt');
      if (type === 'luat') catSlugs.add('thue-gtgt-luat');
      if (type === 'nghi_dinh') catSlugs.add('thue-gtgt-nghi-dinh');
      if (type === 'thong_tu') catSlugs.add('thue-gtgt-thong-tu');
      if (type === 'cong_van') catSlugs.add('thue-gtgt-cong-van');
    }

    // 4. THUẾ TNDN
    if (title.includes('thu nhập doanh nghiệp') || title.includes('tndn') || num.includes('67/2025') || num.includes('320/2025') || num.includes('20/2026')) {
      catSlugs.add('thue');
      catSlugs.add('thue-tndn');
    }

    // 5. THUẾ TNCN
    if (title.includes('thu nhập cá nhân') || title.includes('tncn') || num.includes('109/2025') || num.includes('112/vbhn') || num.includes('253')) {
      catSlugs.add('thue');
      catSlugs.add('thue-tncn');
    }

    // 6. HÓA ĐƠN & CHỨNG TỪ / XỬ PHẠT THUẾ
    if (title.includes('hóa đơn') || title.includes('chứng từ') || title.includes('xử phạt') || num.includes('123/2020') || num.includes('70/2025') || num.includes('125/2020') || num.includes('15/vbhn') || num.includes('3643/tni') || num.includes('572/tng')) {
      catSlugs.add('thue');
      catSlugs.add('hoa-don-chung-tu');
    }

    // 7. GIAO DỊCH LIÊN KẾT & CHUYỂN GIÁ
    if (title.includes('giao dịch liên kết') || title.includes('chuyển giá') || num.includes('132/2020') || num.includes('20/2025') || num.includes('1188/tct') || num.includes('3058/tct')) {
      catSlugs.add('thue');
      catSlugs.add('thue-giao-dich-lien-ket');
      catSlugs.add('doanh-nghiep');
      catSlugs.add('giao-dich-lien-ket-dn');
    }

    // 8. QUẢN LÝ THUẾ
    if (title.includes('quản lý thuế') || num.includes('38/2019') || num.includes('56/2024')) {
      catSlugs.add('thue');
      catSlugs.add('quan-ly-thue');
    }

    // 9. DOANH NGHIỆP & ĐĂNG KÝ KINH DOANH
    if (title.includes('doanh nghiệp') || title.includes('hộ kinh doanh') || num.includes('59/2020') || num.includes('76/2025') || num.includes('168/2025') || num.includes('68/2025') || num.includes('210/2025') || num.includes('248/2025') || num.includes('145/2026')) {
      catSlugs.add('doanh-nghiep');
      if (type === 'luat') catSlugs.add('doanh-nghiep-luat');
      if (type === 'nghi_dinh') catSlugs.add('doanh-nghiep-nghi-dinh');
      if (type === 'thong_tu') catSlugs.add('doanh-nghiep-thong-tu');
    }

    // 10. LAO ĐỘNG & TIỀN LƯƠNG
    if (title.includes('lao động') || title.includes('tiền lương') || title.includes('hợp đồng') || num.includes('45/2019') || num.includes('145/2020') || num.includes('08/2026')) {
      catSlugs.add('lao-dong-tien-luong');
      if (type === 'luat') catSlugs.add('lao-dong-bo-luat');
      if (type === 'nghi_dinh') catSlugs.add('lao-dong-nghi-dinh');
      if (type === 'thong_tu') catSlugs.add('lao-dong-thong-tu');
    }

    // 11. BẢO HIỂM XÃ HỘI
    if (title.includes('bảo hiểm xã hội') || title.includes('bhxh') || num.includes('41/2024') || num.includes('115/2015') || num.includes('59/2015')) {
      catSlugs.add('bao-hiem-xa-hoi');
      if (type === 'luat') catSlugs.add('bhxh-luat');
      if (type === 'nghi_dinh') catSlugs.add('bhxh-nghi-dinh');
      if (type === 'thong_tu') catSlugs.add('bhxh-thong-tu');
    }

    // 12. ĐẦU TƯ & ĐẤT ĐAI
    if (title.includes('đầu tư') || title.includes('đất đai') || num.includes('61/2020') || num.includes('31/2024') || num.includes('50/2026') || num.includes('2301/qđ')) {
      catSlugs.add('dau-tu');
    }

    // Convert slugs to category IDs
    for (const slug of catSlugs) {
      const cat = catMap.get(slug);
      if (cat) {
        links.push({
          document_id: doc.id,
          category_id: cat.id,
          is_primary: links.filter(l => l.document_id === doc.id).length === 0,
        });
      }
    }
  }

  console.log(`Generated ${links.length} links!`);

  // Delete existing links in Supabase and re-insert
  console.log('Re-inserting into Supabase document_category_links...');
  await supabase.from('document_category_links').delete().neq('document_id', '00000000-0000-0000-0000-000000000000');
  
  // Insert in batches of 50
  for (let i = 0; i < links.length; i += 50) {
    const batch = links.slice(i, i + 50);
    const { error: insErr } = await supabase.from('document_category_links').insert(batch);
    if (insErr) {
      console.error('Insert error batch:', insErr);
    }
  }

  console.log('✅ Successfully linked all documents to their categories!');
}
run();
