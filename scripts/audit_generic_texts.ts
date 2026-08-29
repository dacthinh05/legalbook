import { DEMO_DOCUMENTS } from '../src/lib/demo-data';

console.log('=== AUDITING ALL 58 DOCUMENTS FOR GENERIC/DEMO TEMPLATE TEXT ===');
let genericCount = 0;
let authenticCount = 0;

DEMO_DOCUMENTS.forEach((d, i) => {
  const isGeneric = d.html_content?.includes('Luật này quy định về các nguyên tắc, chính sách, đối tượng áp dụng, quyền và nghĩa vụ của các cơ quan') ||
                    d.html_content?.includes('Văn bản này quy định chi tiết và hướng dẫn thi hành một số điều về chế độ, trình tự, thủ tục') ||
                    d.html_content?.includes('Áp dụng đối với các cơ quan quản lý nhà nước, doanh nghiệp, tổ chức và cá nhân có liên quan trên lãnh thổ Việt Nam');
  
  if (isGeneric) {
    genericCount++;
    console.log(`${i + 1}. [${d.document_type}] ${d.document_number || 'NO_NUM'} | ${d.title.slice(0, 50)} | ❌ GENERIC TEMPLATE`);
  } else {
    authenticCount++;
    console.log(`${i + 1}. [${d.document_type}] ${d.document_number || 'NO_NUM'} | ${d.title.slice(0, 50)} | ✅ AUTHENTIC SPECIFIC TEXT (${d.html_content?.length} chars)`);
  }
});

console.log(`\nTOTAL: ${DEMO_DOCUMENTS.length}`);
console.log(`AUTHENTIC SPECIFIC: ${authenticCount}`);
console.log(`GENERIC TEMPLATE: ${genericCount}`);
