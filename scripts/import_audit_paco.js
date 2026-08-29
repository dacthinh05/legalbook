const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const docDir = path.join(__dirname, '../public/documents');

async function processDocs() {
  const files = fs.readdirSync(docDir);
  console.log(`Found ${files.length} files in public/documents`);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(docDir, file);
    
    if (ext === '.docx') {
      try {
        const result = await mammoth.convertToHtml({ path: filePath });
        const html = result.value;
        console.log(`\n=== File: ${file} ===`);
        console.log(`HTML length: ${html.length}`);
        console.log(`Preview: ${html.slice(0, 300)}...`);
      } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
      }
    } else {
      console.log(`File (${ext}): ${file}`);
    }
  }
}

processDocs();
