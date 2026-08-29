const { DEMO_DOCUMENTS, DEMO_CATEGORIES } = require('../src/lib/demo-data.ts');

console.log('Total categories:', DEMO_CATEGORIES.length);
console.log('Total documents:', DEMO_DOCUMENTS.length);

const summary = DEMO_DOCUMENTS.map((d, idx) => ({
  index: idx + 1,
  id: d.id,
  doc_number: d.document_number,
  title: d.title,
  content_len: (d.html_content || '').length,
  has_file: Boolean(d.files && d.files.length > 0),
  fileName: d.files && d.files[0] ? d.files[0].original_filename : null,
  is_demo_text: (d.html_content || '').includes('DEMO') || (d.html_content || '').includes('minh họa') || (d.html_content || '').length < 600
}));

console.table(summary);
