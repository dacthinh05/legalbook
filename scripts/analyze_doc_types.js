const { DEMO_DOCUMENTS, DEMO_CATEGORY_LINKS, DEMO_RELATIONS } = require('../src/lib/demo-data.ts');

console.log('=== PHÂN TÍCH TẬP DỮ LIỆU HIỆN TẠI ===');
const realDocs = DEMO_DOCUMENTS.filter(d => d.files && d.files.length > 0);
const placeholderDocs = DEMO_DOCUMENTS.filter(d => !d.files || d.files.length === 0);

console.log('Văn bản thật (có file gốc, full text):', realDocs.length);
realDocs.forEach(d => console.log(`  + [THẬT] ${d.document_number}: ${d.title.slice(0, 60)}`));

console.log('\nVăn bản mẫu seed ban đầu (không có file đính kèm, text tóm tắt ngắn ~800 ký tự):', placeholderDocs.length);
placeholderDocs.forEach(d => console.log(`  - [MẪU] ${d.document_number}: ${d.title.slice(0, 60)} (id: ${d.id})`));
