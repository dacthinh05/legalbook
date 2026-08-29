const fs = require('fs');
const path = require('path');

const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
const demoData = require(demoDataPath);

console.log('Categories:');
demoData.DEMO_CATEGORIES.forEach(c => console.log(`  - ${c.name} (id: ${c.id}, slug: ${c.slug}, parent: ${c.parent_id})`));

console.log('\n25 Real Documents:');
demoData.DEMO_DOCUMENTS.forEach(d => console.log(`  - [${d.document_type}] ${d.document_number}: ${d.title}`));
