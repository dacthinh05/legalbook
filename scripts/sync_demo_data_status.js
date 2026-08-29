const fs = require('fs');
let content = fs.readFileSync('src/lib/demo-data.ts', 'utf-8');

// Update 99/2025/TT-BTC
content = content.replace(
  /"document_number":\s*"99\/2025\/TT-BTC"([\s\S]*?)"status":\s*"chua_hieu_luc"/g,
  '"document_number": "99/2025/TT-BTC"$1"status": "hieu_luc"'
);

// Update 109/2025/QH15
content = content.replace(
  /"document_number":\s*"109\/2025\/QH15"([\s\S]*?)"status":\s*"chua_hieu_luc"/g,
  '"document_number": "109/2025/QH15"$1"status": "hieu_luc"'
);

// Update 67/2025/QH15
content = content.replace(
  /"document_number":\s*"67\/2025\/QH15"([\s\S]*?)"status":\s*"chua_hieu_luc"/g,
  '"document_number": "67/2025/QH15"$1"status": "hieu_luc"'
);

// Update 320/2025/NĐ-CP
content = content.replace(
  /"document_number":\s*"320\/2025\/NĐ-CP"([\s\S]*?)"status":\s*"chua_hieu_luc"/g,
  '"document_number": "320/2025/NĐ-CP"$1"status": "hieu_luc"'
);

// Update 200/2014/TT-BTC
content = content.replace(
  /"document_number":\s*"200\/2014\/TT-BTC"([\s\S]*?)"status":\s*"hieu_luc"/g,
  '"document_number": "200/2014/TT-BTC"$1"status": "het_hieu_luc_toan_bo"'
);

fs.writeFileSync('src/lib/demo-data.ts', content, 'utf-8');
console.log('✅ Updated demo-data.ts successfully!');
