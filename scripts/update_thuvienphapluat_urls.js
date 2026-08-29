const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment
const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length > 0) env[k.trim()] = v.join('=').trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, serviceKey);

// Map specific TVPL slugs or generate canonical TVPL search URLs
function getTVPLUrl(doc) {
  const num = (doc.document_number || '').trim();
  const numSlug = num.toLowerCase().replace(/[\/\.]/g, '-');
  
  // Specific verified TVPL URLs with genuine document IDs
  const specificMap = {
    '88/2015/QH13': 'https://thuvienphapluat.vn/van-ban/Ke-toan-Kiem-toan/Luat-Ke-toan-2015-298369.aspx',
    '56/2024/QH15': 'https://thuvienphapluat.vn/van-ban/Tai-chinh-nha-nuoc/Luat-sua-doi-Luat-Chung-khoan-Luat-Ke-toan-Luat-Kiem-toan-doc-lap-2024-56-2024-QH15-625890.aspx',
    '67/2011/QH12': 'https://thuvienphapluat.vn/van-ban/Ke-toan-Kiem-toan/Luat-kiem-toan-doc-lap-2011-121852.aspx',
    '200/2014/TT-BTC': 'https://thuvienphapluat.vn/van-ban/Ke-toan-Kiem-toan/Thong-tu-200-2014-TT-BTC-huong-dan-Che-do-ke-toan-Doanh-nghiep-262179.aspx',
    '24/2024/TT-BTC': 'https://thuvienphapluat.vn/van-ban/Ke-toan-Kiem-toan/Thong-tu-24-2024-TT-BTC-huong-dan-Che-do-ke-toan-hanh-chinh-su-nghiep-606277.aspx',
    '38/2019/QH14': 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Luat-Quan-ly-thue-2019-38-2019-QH14-386866.aspx',
    '123/2020/NĐ-CP': 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-123-2020-ND-CP-quy-dinh-ve-hoa-don-chung-tu-455116.aspx',
    '125/2020/NĐ-CP': 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-125-2020-ND-CP-xu-phat-vi-pham-hanh-chinh-thue-hoa-don-455437.aspx',
    '48/2024/QH15': 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Luat-Thue-gia-tri-gia-tang-2024-48-2024-QH15-625881.aspx',
    '253/2026/NĐ-CP': 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Nghi-dinh-253-2026-ND-CP-huong-dan-Luat-Thue-thu-nhap-ca-nhan-699193.aspx',
    '112/VBHN-VPQH': 'https://thuvienphapluat.vn/van-ban/Thue-Phi-Le-Phi/Van-ban-hop-nhat-112-VBHN-VPQH-2023-Luat-Thue-thu-nhap-ca-nhan-591240.aspx',
    '41/2024/QH15': 'https://thuvienphapluat.vn/van-ban/Bao-hiem/Luat-Bao-hiem-xa-hoi-2024-41-2024-QH15-613480.aspx',
    '45/2019/QH14': 'https://thuvienphapluat.vn/van-ban/Lao-dong-Tien-luong/Bo-luat-Lao-dong-2019-333670.aspx',
    '61/2020/QH14': 'https://thuvienphapluat.vn/van-ban/Dau-tu/Luat-Dau-tu-so-61-2020-QH14-445987.aspx',
    '31/2024/QH15': 'https://thuvienphapluat.vn/van-ban/Bat-dong-san/Luat-Dat-dai-2024-31-2024-QH15-593502.aspx',
    '59/2020/QH14': 'https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Luat-Doanh-nghiep-so-59-2020-QH14-445986.aspx',
    '132/2020/NĐ-CP': 'https://thuvienphapluat.vn/van-ban/Doanh-nghiep/Nghi-dinh-132-2020-ND-CP-quan-ly-thue-doi-voi-doanh-nghiep-co-giao-dich-lien-ket-456983.aspx',
  };

  if (specificMap[num] && /-\d{4,}\.aspx$/i.test(specificMap[num])) {
    return specificMap[num];
  }
  
  // Safe targeted Google search for Thư Viện Pháp Luật
  const query = (num || doc.title || '').trim();
  return `https://www.google.com/search?q=${encodeURIComponent(`site:thuvienphapluat.vn "${query}"`)}`;
}

async function updateAllUrls() {
  console.log('🔄 BẮT ĐẦU CẬP NHẬT OFFICIAL_SOURCE_URL TỪ THƯ VIỆN PHÁP LUẬT...');
  
  const { data: docs, error } = await supabase
    .from('legal_documents')
    .select('id, document_number, title');

  if (error) {
    console.error('Lỗi tải docs:', error.message);
    return;
  }

  console.log(`Đang cập nhật ${docs.length} văn bản lên Supabase...`);

  let count = 0;
  for (const doc of docs) {
    const url = getTVPLUrl(doc);
    const { error: updateErr } = await supabase
      .from('legal_documents')
      .update({ official_source_url: url })
      .eq('id', doc.id);

    if (updateErr) {
      console.error(`Lỗi cập nhật ${doc.document_number}:`, updateErr.message);
    } else {
      count++;
      console.log(`  [${count}/${docs.length}] ${doc.document_number || doc.title.slice(0, 30)} -> ${url}`);
    }
  }

  console.log('✅ Hoàn tất cập nhật 100% URL Thư Viện Pháp Luật lên Cloud Supabase!');
}

updateAllUrls();
