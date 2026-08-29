const fs = require('fs');
const path = require('path');

const demoDataPath = path.join(__dirname, '../src/lib/demo-data.ts');
let content = fs.readFileSync(demoDataPath, 'utf-8');

// Count before
const beforeCount = (content.match(/AUDIT PACO/g) || []).length;
console.log(`Before: ${beforeCount} AUDIT PACO blocks found`);

// The file is a .ts file with JSON string literals in it.
// The html_content is stored as a single-line JSON string with escaped characters.
// Pattern in the file looks like:
//   "html_content": "<p>...</p>\n<div class=\"bg-blue-50 border border-blue-200 rounded p-4 mt-6\">...</div>",
//
// But when stored in the JSON inside the .ts file, it's escaped, so \n becomes \\n
// and " becomes \\\"

// Use a simpler approach: split on the known prefix and reconstruct
// We do a string replacement of the escaped pattern

// The pattern in the raw file looks like this (escaped in JSON within .ts):
// \\n<div class=\\"bg-blue-50 border border-blue-200 rounded p-4 mt-6\\">...\\n<\\/div>

// Let's use indexOf to find and replace each occurrence
function removeAuditPacoBlocks(text) {
  const startMarkers = [
    '\\n\\u003cdiv class=\\"bg-blue-50 border border-blue-200 rounded p-4 mt-6\\"',
    '\\n<div class=\\"bg-blue-50 border border-blue-200 rounded p-4 mt-6\\"',
    '<div class=\\"bg-blue-50 border border-blue-200 rounded p-4 mt-6\\"',
  ];
  const endMarker = '<\\/div>';
  const endMarker2 = '<\/div>';

  let result = text;

  // Strategy: find "AUDIT PACO" and expand to find the surrounding <div>...</div>
  let searchFrom = 0;
  while (true) {
    const auditIdx = result.indexOf('AUDIT PACO', searchFrom);
    if (auditIdx === -1) break;

    // Find the opening <div> before AUDIT PACO
    // Search backwards for <div
    let divStart = -1;
    // Look back up to 200 chars
    const lookbackText = result.substring(Math.max(0, auditIdx - 300), auditIdx);
    const divMatch = lookbackText.lastIndexOf('\\n<div ');
    const divMatch2 = lookbackText.lastIndexOf('<div ');

    if (divMatch !== -1) {
      divStart = Math.max(0, auditIdx - 300) + divMatch;
    } else if (divMatch2 !== -1) {
      divStart = Math.max(0, auditIdx - 300) + divMatch2;
    }

    if (divStart === -1) {
      searchFrom = auditIdx + 1;
      continue;
    }

    // Find the closing </div> after AUDIT PACO
    const closeIdx1 = result.indexOf('<\\/div>', auditIdx);
    const closeIdx2 = result.indexOf('<\/div>', auditIdx);
    const closeIdx = closeIdx1 !== -1 && closeIdx2 !== -1 
      ? Math.min(closeIdx1, closeIdx2)
      : closeIdx1 !== -1 ? closeIdx1 : closeIdx2;

    if (closeIdx === -1) {
      searchFrom = auditIdx + 1;
      continue;
    }

    // Find end of closing tag
    const closingTagEnd = result.indexOf('>', closeIdx) + 1;
    
    // Remove from divStart to closingTagEnd
    const removed = result.substring(divStart, closingTagEnd);
    console.log(`Removing block starting at index ${divStart}:`, removed.substring(0, 80) + '...');
    result = result.substring(0, divStart) + result.substring(closingTagEnd);
    
    // Don't advance searchFrom since we removed content
  }

  return result;
}

content = removeAuditPacoBlocks(content);

// Count after
const afterCount = (content.match(/AUDIT PACO/g) || []).length;
console.log(`After: ${afterCount} AUDIT PACO blocks remaining`);

fs.writeFileSync(demoDataPath, content, 'utf-8');
console.log('demo-data.ts updated successfully');
