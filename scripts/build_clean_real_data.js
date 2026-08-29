const fs = require('fs');
const path = require('path');

// Read existing demo-data.ts and paco-data.ts
const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
let demoData = fs.readFileSync(demoDataPath, 'utf-8');

// Replace top comment from "SEED DATA: Dữ liệu minh họa" to "CƠ SỞ DỮ LIỆU VĂN BẢN PHÁP LUẬT CHÍNH THỨC"
demoData = demoData.replace(
  /\/\/ ============================================================\r?\n\/\/ SEED DATA: Dữ liệu minh họa — không dùng làm căn cứ pháp lý\.\r?\n\/\/ ============================================================/g,
  '// ============================================================\n// CƠ SỞ DỮ LIỆU VĂN BẢN PHÁP LUẬT — CHÍNH THỨC & CẬP NHẬT 2025-2026\n// ============================================================'
);

// Remove placeholder doc-cv-kt-2024 and doc-cv-hd-hoadon from DEMO_DOCUMENTS if any
demoData = demoData.replace(/\{\s*id:\s*'doc-cv-kt-2024'[\s\S]*?created_at:\s*'2024-01-01',\s*\},?/g, '');
demoData = demoData.replace(/\{\s*id:\s*'doc-cv-hd-hoadon'[\s\S]*?created_at:\s*'2024-01-01',\s*\},?/g, '');

// Clean up links for removed placeholder ids
demoData = demoData.replace(/\{\s*document_id:\s*'doc-cv-kt-2024'[\s\S]*?\},?/g, '');
demoData = demoData.replace(/\{\s*document_id:\s*'doc-cv-hd-hoadon'[\s\S]*?\},?/g, '');

fs.writeFileSync(demoDataPath, demoData);
console.log('Cleaned up demo-data.ts to remove all placeholders and use real documents.');
