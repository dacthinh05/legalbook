import { DEMO_DOCUMENTS } from '../src/lib/demo-data';
import type { DocumentType } from '../src/types';

export function formatShortTitle(title: string, _docType?: DocumentType | string, docNumber?: string | null): string {
  if (!title) return '';
  let clean = title.trim();

  // 1. If explicit docNumber is provided, strip prefix containing docNumber
  // e.g. "Văn bản hợp nhất 112/VBHN-VPQH — Luật Thuế Thu nhập cá nhân" -> "Luật Thuế Thu nhập cá nhân"
  // e.g. "Luật số 76/2025/QH15 sửa đổi..." -> "Sửa đổi..."
  if (docNumber) {
    const escapedNum = docNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Number at beginning with type prefix
    const startNumRegex = new RegExp(`^(?:Luật|Bộ luật|Nghị định|Thông tư|Quyết định|Công văn|Văn bản hợp nhất)?\\s*(?:số\\s+)?${escapedNum}\\s*[-–—:]?\\s*`, 'iu');
    clean = clean.replace(startNumRegex, '');
    
    // Number at the end (e.g. "Luật Thuế Thu nhập cá nhân số 109/2025/QH15" -> "Luật Thuế Thu nhập cá nhân")
    const endNumRegex = new RegExp(`\\s+(?:số\\s+)?${escapedNum}$`, 'iu');
    clean = clean.replace(endNumRegex, '');
  }

  // 2. Strip standard leading type + actual number containing digits (e.g. "Thông tư 118/2026/TT-BTC ", "Nghị định 144/2026/NĐ-CP ")
  clean = clean.replace(/^(?:Luật|Bộ luật|Nghị định|Thông tư|Quyết định|Công văn|Văn bản hợp nhất)\s+(?:số\s+)?(?:\d+[\w/.-]*)\s*[-–—:]?\s*/iu, '');

  // 3. If title begins with generic "Luật " followed by specific law name (e.g. "Luật Thuế Thu nhập cá nhân" -> "Thuế Thu nhập cá nhân", "Luật Đất đai" -> "Đất đai")
  clean = clean.replace(/^Luật\s+(Thuế\s+|Đất\s+|Đầu\s+|Doanh\s+|Kế\s+|Kiểm\s+|Bảo\s+|Quản\s+|Khám\s+|Đấu\s+)/iu, '$1');

  clean = clean.trim();
  if (clean.length > 0) {
    clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    return clean;
  }
  return title;
}

console.log('=== TESTING ALL 58 TITLES WITH IMPROVED formatShortTitle ===\n');

let corruptedCount = 0;

DEMO_DOCUMENTS.forEach((d, idx) => {
  const shortTitle = formatShortTitle(d.title, d.document_type, d.document_number);
  const isCorrupted = /^[\u0300-\u036f\u1dc0-\u1dff\u1ab0-\u1aff\u1e00-\u1eff]/iu.test(shortTitle) ||
                      shortTitle.startsWith('Ế ') ||
                      shortTitle.startsWith('ế ') ||
                      shortTitle.startsWith('Luật Thu ') ||
                      shortTitle.length < 5;

  if (isCorrupted) {
    corruptedCount++;
    console.log(`❌ CORRUPTED [${idx + 1}]:`);
    console.log(`   Original: "${d.title}"`);
    console.log(`   Short:    "${shortTitle}"`);
  } else {
    console.log(`✅ [${idx + 1}] [${d.document_number || 'NO_NUM'}]:`);
    console.log(`   Original: "${d.title}"`);
    console.log(`   Short:    "${shortTitle}"`);
  }
});

console.log(`\nTotal corrupted: ${corruptedCount}`);
