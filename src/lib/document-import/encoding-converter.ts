/**
 * Vietnamese Encoding Converter: TCVN 5712:1993 (TCVN3 / ABC), VNI-Windows -> Unicode NFC & NFD -> NFC.
 * 
 * Strict Semantic Table Separation:
 * - TCVN3_LOWER_MAP: Strictly maps to lowercase Unicode characters.
 * - TCVN3_UPPER_MAP: Strictly maps to uppercase Unicode characters.
 * - TCVN3_MAP: Standard mixed-case legal text map (preserving capital base codes \u00A1..\u00A7).
 * - Standard Unicode Vietnamese (e.g. "bò", "trò chơi") is preserved 100% untouched.
 */

// Strictly Lowercase TCVN3 Mapping
export const TCVN3_LOWER_MAP: Record<string, string> = {
  // Base characters (lowercase)
  '\u00A1': 'ă',
  '\u00A2': 'â',
  '\u00A3': 'ê',
  '\u00A4': 'ô',
  '\u00A5': 'ơ',
  '\u00A6': 'ư',
  '\u00A7': 'đ',
  '\u00A8': 'ă',
  '\u00A9': 'â',
  '\u00AE': 'đ',

  // Lowercase Accented Vowels
  '\u00B5': 'ả', '\u00B6': 'ã', '\u00B7': 'á', '\u00B8': 'à', '\u00B9': 'ạ',
  '\u00AC': 'ằ', '\u00AD': 'ẳ', '\u00AF': 'ắ', '\u00B0': 'ặ',
  '\u00AA': 'ầ', '\u00AB': 'ẩ', '\u00B1': 'ậ',
  '\u00CC': 'è', '\u00CE': 'ẻ', '\u00CF': 'ẽ', '\u00D0': 'é', '\u00D1': 'ẹ',
  '\u00D7': 'ề', '\u00D8': 'ể', '\u00D9': 'ễ', '\u00DA': 'ế', '\u00DB': 'ệ',
  '\u00D5': 'ì', '\u00D6': 'ỉ', '\u00DD': 'ĩ', '\u00DE': 'í', '\u00DF': 'ị',
  '\u00E0': 'ò', '\u00E1': 'ỏ', '\u00E2': 'õ', '\u00E3': 'ó', '\u00E4': 'ọ',
  '\u00E5': 'ồ', '\u00E6': 'ổ', '\u00E7': 'ỗ', '\u00E8': 'ố', '\u00E9': 'ộ',
  '\u00EA': 'ờ', '\u00EB': 'ở', '\u00EC': 'ỡ', '\u00ED': 'ớ', '\u00EE': 'ợ',
  '\u00EF': 'ù', '\u00F1': 'ủ', '\u00F2': 'ũ', '\u00F3': 'ú', '\u00F4': 'ụ',
  '\u00F6': 'ừ', '\u00F7': 'ử', '\u00F8': 'ữ', '\u00F9': 'ứ', '\u00FA': 'ự',
  '\u00FB': 'ỳ', '\u00FC': 'ỷ', '\u00FD': 'ý', '\u00FE': 'ỹ', '\u00FF': 'ỵ',
};

// Strictly Uppercase TCVN3 Mapping (Used for all-caps .VNTimeH font text)
export const TCVN3_UPPER_MAP: Record<string, string> = {
  // Base characters (uppercase)
  '\u00A1': 'Ă',
  '\u00A2': 'Â',
  '\u00A3': 'Ê',
  '\u00A4': 'Ô',
  '\u00A5': 'Ơ',
  '\u00A6': 'Ư',
  '\u00A7': 'Đ',
  '\u00A8': 'Ă',
  '\u00A9': 'Â',
  '\u00AE': 'Đ',

  // Uppercase Accented Vowels
  '\u00B5': 'Ả', '\u00B6': 'Ã', '\u00B7': 'Á', '\u00B8': 'À', '\u00B9': 'Ạ',
  '\u00AC': 'Ằ', '\u00AD': 'Ẳ', '\u00AF': 'Ắ', '\u00B0': 'Ặ',
  '\u00AA': 'Ầ', '\u00AB': 'Ẩ', '\u00B1': 'Ậ',
  '\u00CC': 'È', '\u00CE': 'Ẻ', '\u00CF': 'Ẽ', '\u00D0': 'É', '\u00D1': 'Ẹ',
  '\u00D7': 'Ề', '\u00D8': 'Ể', '\u00D9': 'Ễ', '\u00DA': 'Ế', '\u00DB': 'Ệ',
  '\u00D5': 'Ì', '\u00D6': 'Ỉ', '\u00DD': 'Ĩ', '\u00DE': 'Í', '\u00DF': 'Ị',
  '\u00E0': 'Ò', '\u00E1': 'Ỏ', '\u00E2': 'Õ', '\u00E3': 'Ó', '\u00E4': 'Ọ',
  '\u00E5': 'Ồ', '\u00E6': 'Ổ', '\u00E7': 'Ỗ', '\u00E8': 'Ố', '\u00E9': 'Ộ',
  '\u00EA': 'Ờ', '\u00EB': 'Ở', '\u00EC': 'Ỡ', '\u00ED': 'Ớ', '\u00EE': 'Ợ',
  '\u00EF': 'Ù', '\u00F1': 'Ủ', '\u00F2': 'Ũ', '\u00F3': 'Ú', '\u00F4': 'Ụ',
  '\u00F6': 'Ừ', '\u00F7': 'Ử', '\u00F8': 'Ữ', '\u00F9': 'Ứ', '\u00FA': 'Ự',
  '\u00FB': 'Ỳ', '\u00FC': 'Ỷ', '\u00FD': 'Ý', '\u00FE': 'Ỹ', '\u00FF': 'Ỵ',
};

// Standard Mixed-Case TCVN3 Mapping
export const TCVN3_MAP: Record<string, string> = {
  ...TCVN3_LOWER_MAP,
  '\u00A1': 'Ă',
  '\u00A2': 'Â',
  '\u00A3': 'Ê',
  '\u00A4': 'Ô',
  '\u00A5': 'Ơ',
  '\u00A6': 'Ư',
  '\u00A7': 'Đ',
};



// Composite uppercase patterns (Capital ASCII base + TCVN3 tone mark)
const TCVN3_COMPOSITE_UPPER_PAIRS: [string, string][] = [
  ['A\u00B7', 'Á'], ['A\u00B8', 'À'], ['A\u00B5', 'Ả'], ['A\u00B6', 'Ã'], ['A\u00B9', 'Ạ'],
  ['E\u00D0', 'É'], ['E\u00CC', 'È'], ['E\u00CE', 'Ẻ'], ['E\u00CF', 'Ẽ'], ['E\u00D1', 'Ẹ'],
  ['I\u00DE', 'Í'], ['I\u00D5', 'Ì'], ['I\u00D6', 'Ỉ'], ['I\u00DD', 'Ĩ'], ['I\u00DF', 'Ị'],
  ['O\u00E3', 'Ó'], ['O\u00E0', 'Ò'], ['O\u00E1', 'Ỏ'], ['O\u00E2', 'Õ'], ['O\u00E4', 'Ọ'],
  ['U\u00F3', 'Ú'], ['U\u00EF', 'Ù'], ['U\u00F1', 'Ủ'], ['U\u00F2', 'Ũ'], ['U\u00F4', 'Ụ'],
  ['Y\u00FD', 'Ý'], ['Y\u00FB', 'Ỳ'], ['Y\u00FC', 'Ỷ'], ['Y\u00FE', 'Ỹ'], ['Y\u00FF', 'Ỵ'],
];

// Authoritative VNI Windows -> Unicode mapping table (ordered by multi-character sequence first)
export const VNI_PAIRS: [RegExp, string][] = [
  // 3-char sequences
  [/uaä/gi, 'uậ'], [/ueá/gi, 'uế'], [/ueà/gi, 'uề'], [/ueå/gi, 'uể'], [/ueã/gi, 'uễ'], [/ueä/gi, 'uệ'],
  [/ieä/gi, 'iệ'], [/ieá/gi, 'iế'], [/ieà/gi, 'iề'], [/ieå/gi, 'iể'], [/ieã/gi, 'iễ'],

  // 2-char sequences (lowercase)
  [/aù/g, 'á'], [/aø/g, 'à'], [/aû/g, 'ả'], [/aõ/g, 'ã'], [/aï/g, 'ạ'],
  [/aê/g, 'ă'], [/aé/g, 'ắ'], [/aè/g, 'ằ'], [/aú/g, 'ẳ'], [/aü/g, 'ẵ'], [/aë/g, 'ặ'],
  [/aâ/g, 'â'], [/aá/g, 'ấ'], [/aà/g, 'ầ'], [/aå/g, 'ẩ'], [/aã/g, 'ẫ'], [/aä/g, 'ậ'],
  [/eù/g, 'é'], [/eø/g, 'è'], [/eû/g, 'ẻ'], [/eõ/g, 'ẽ'], [/eï/g, 'ẹ'],
  [/eâ/g, 'ê'], [/eá/g, 'ế'], [/eà/g, 'ề'], [/eå/g, 'ể'], [/eã/g, 'ễ'], [/eä/g, 'ệ'],
  [/iù/g, 'í'], [/iø/g, 'ì'], [/iû/g, 'ỉ'], [/iõ/g, 'ĩ'], [/iï/g, 'ị'],
  [/où/g, 'ó'], [/oø/g, 'ò'], [/oû/g, 'ỏ'], [/oõ/g, 'õ'], [/oï/g, 'ọ'],
  [/oâ/g, 'ô'], [/oá/g, 'ố'], [/oà/g, 'ồ'], [/oå/g, 'ổ'], [/oã/g, 'ỗ'], [/oä/g, 'ộ'],
  [/ôù/g, 'ớ'], [/ôø/g, 'ờ'], [/ôû/g, 'ở'], [/ôõ/g, 'ỡ'], [/ôï/g, 'ợ'],
  [/uù/g, 'ú'], [/uø/g, 'ù'], [/uû/g, 'ủ'], [/uõ/g, 'ũ'], [/uï/g, 'ụ'],
  [/öù/g, 'ứ'], [/öø/g, 'ừ'], [/öû/g, 'ử'], [/öõ/g, 'ữ'], [/öï/g, 'ự'],
  [/yù/g, 'ý'], [/yø/g, 'ỳ'], [/yû/g, 'ỷ'], [/yõ/g, 'ỹ'], [/î/g, 'ỵ'],
  [/ñ/g, 'đ'], [/Ñ/g, 'Đ'],
  [/ö/g, 'ư'], [/ô/g, 'ơ'],

  // Uppercase sequences
  [/AÙ/g, 'Á'], [/AØ/g, 'À'], [/AÛ/g, 'Ả'], [/AÕ/g, 'Ã'], [/AÏ/g, 'Ạ'],
  [/AÊ/g, 'Ă'], [/AÉ/g, 'Ắ'], [/AÈ/g, 'Ằ'], [/AÚ/g, 'Ẳ'], [/AÜ/g, 'Ẵ'], [/AË/g, 'Ặ'],
  [/AÂ/g, 'Â'], [/AÁ/g, 'Ấ'], [/AÀ/g, 'Ầ'], [/AÅ/g, 'Ẩ'], [/AÃ/g, 'Ẫ'], [/AÄ/g, 'Ậ'],
  [/EÙ/g, 'É'], [/EØ/g, 'È'], [/EÛ/g, 'Ẻ'], [/EÕ/g, 'Ẽ'], [/EÏ/g, 'Ẹ'],
  [/EÂ/g, 'Ê'], [/EÁ/g, 'Ế'], [/EÀ/g, 'Ề'], [/EÅ/g, 'Ể'], [/EÃ/g, 'Ễ'], [/EÄ/g, 'Ệ'],
  [/IÙ/g, 'Í'], [/IØ/g, 'Ì'], [/IÛ/g, 'Ỉ'], [/IÕ/g, 'Ĩ'], [/IÏ/g, 'Ị'],
  [/OÙ/g, 'Ó'], [/OØ/g, 'Ò'], [/OÛ/g, 'Ỏ'], [/OÕ/g, 'Õ'], [/OÏ/g, 'Ọ'],
  [/OÂ/g, 'Ô'], [/OÁ/g, 'Ố'], [/OÀ/g, 'Ồ'], [/OÅ/g, 'Ổ'], [/OÃ/g, 'Ỗ'], [/OÄ/g, 'Ộ'],
  [/ÔÙ/g, 'Ớ'], [/ÔØ/g, 'Ờ'], [/ÔÛ/g, 'Ở'], [/ÔÕ/g, 'Ỡ'], [/ÔÏ/g, 'Ợ'],
  [/UÙ/g, 'Ú'], [/UØ/g, 'Ù'], [/UÛ/g, 'Ủ'], [/UÕ/g, 'Ũ'], [/UÏ/g, 'Ụ'],
  [/ÖÙ/g, 'Ứ'], [/ÖØ/g, 'Ừ'], [/ÖÛ/g, 'Ử'], [/ÖÕ/g, 'Ữ'], [/ÖÏ/g, 'Ự'],
  [/YÙ/g, 'Ý'], [/YØ/g, 'Ỳ'], [/YÛ/g, 'Ỷ'], [/YÕ/g, 'Ỹ'],
  [/Ö/g, 'Ư'], [/Ô/g, 'Ơ'],
];

// Distinctive indicator byte codes that only appear in raw TCVN3 encoded strings
const TCVN3_EXCLUSIVE_INDICATORS = new Set([
  '\u00A1', '\u00A2', '\u00A3', '\u00A4', '\u00A5', '\u00A6', '\u00A7',
  '\u00A8', '\u00A9', '\u00AC', '\u00AD', '\u00AE', '\u00AF', '\u00B0', '\u00B1',
  '\u00B5', '\u00B6', '\u00B7', '\u00B8', '\u00B9',
  '\u00CC', '\u00CE', '\u00CF', '\u00D0', '\u00D1',
  '\u00D5', '\u00D6', '\u00D7', '\u00D8', '\u00D9', '\u00DA', '\u00DB',
  '\u00DC', '\u00DD', '\u00DE', '\u00DF',
  '\u00E0', '\u00E1', '\u00E2', '\u00E3', '\u00E4',
  '\u00E5', '\u00E6', '\u00E7', '\u00E8', '\u00E9', '\u00EA', '\u00EB',
  '\u00EC', '\u00ED', '\u00EE', '\u00EF',
  '\u00F1', '\u00F2', '\u00F3', '\u00F4', '\u00F6', '\u00F7', '\u00F8',
  '\u00F9', '\u00FA', '\u00FB', '\u00FC', '\u00FD', '\u00FE', '\u00FF',
]);

/**
 * Detects if string is likely TCVN3 encoded.
 */
export function isLikelyTCVN3(text: string): boolean {
  if (!text || text.length < 3) return false;
  
  // If text contains Vietnamese Unicode characters (code points > 255), it is already Unicode
  if (/[\u0100-\u1EF9]/.test(text)) {
    return false;
  }

  let count = 0;
  for (const char of text) {
    if (TCVN3_EXCLUSIVE_INDICATORS.has(char)) {
      count++;
    }
  }
  return count >= 2;
}

/**
 * Converts TCVN3 (ABC) string to Unicode NFC.
 * Automatically handles mixed-case, all-caps heading text, and composite capitals.
 */
export function convertTCVN3ToUnicode(text: string): string {
  if (!text) return '';

  let intermediate = text;

  // 1. Convert composite uppercase sequences (e.g. A + tone mark)
  for (const [seq, replacement] of TCVN3_COMPOSITE_UPPER_PAIRS) {
    intermediate = intermediate.replaceAll(seq, replacement);
  }

  // 2. Check if the block is predominantly uppercase (.VNTimeH all-caps style)
  let upperAlphaCount = 0;
  let lowerAlphaCount = 0;
  for (const char of intermediate) {
    if (char >= 'A' && char <= 'Z') upperAlphaCount++;
    else if (char >= 'a' && char <= 'z') lowerAlphaCount++;
  }
  const isUppercaseContext = upperAlphaCount > 0 && lowerAlphaCount === 0;

  // 3. Map individual character code points
  let result = '';
  for (let i = 0; i < intermediate.length; i++) {
    const char = intermediate[i];
    if (isUppercaseContext && TCVN3_UPPER_MAP[char] !== undefined) {
      result += TCVN3_UPPER_MAP[char];
    } else if (TCVN3_MAP[char] !== undefined) {
      result += TCVN3_MAP[char];
    } else {
      result += char;
    }
  }

  return result.normalize('NFC');
}

/**
 * Detects if string is likely VNI encoded.
 */
export function isLikelyVNI(text: string): boolean {
  if (!text || text.length < 4) return false;
  
  if (/[\u0100-\u1EF9]/.test(text)) {
    return false;
  }

  const vniPatterns = [/a[ùøûõïêéèúüë]/i, /e[ùøûõïêéèåãä]/i, /o[ùøûõïâáàåãä]/i, /u[ùøûõï]/i, /ö[ùøûõï]/i, /ô[ùøûõï]/i, /ñ/i, /ue[áàåãä]/i, /ua[äáàåã]/i];
  let matchCount = 0;
  for (const pat of vniPatterns) {
    if (pat.test(text)) matchCount++;
  }
  return matchCount >= 2;
}

/**
 * Converts VNI-Windows string to Unicode NFC.
 */
export function convertVNIToUnicode(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [pattern, replacement] of VNI_PAIRS) {
    result = result.replace(pattern, replacement);
  }
  return result.normalize('NFC');
}

/**
 * Universal Font and Encoding normalization.
 * Auto-detects TCVN3, VNI, or decomposed Unicode NFD and returns clean Unicode NFC.
 */
export function normalizeVietnameseEncoding(text: string): {
  normalizedText: string;
  detectedEncoding: 'unicode_nfc' | 'unicode_nfd' | 'tcvn3' | 'vni';
  converted: boolean;
} {
  if (!text) {
    return { normalizedText: '', detectedEncoding: 'unicode_nfc', converted: false };
  }

  // 1. Check TCVN3
  if (isLikelyTCVN3(text)) {
    const converted = convertTCVN3ToUnicode(text);
    return { normalizedText: converted, detectedEncoding: 'tcvn3', converted: true };
  }

  // 2. Check VNI
  if (isLikelyVNI(text)) {
    const converted = convertVNIToUnicode(text);
    return { normalizedText: converted, detectedEncoding: 'vni', converted: true };
  }

  // 3. Check Decomposed Unicode (NFD vs NFC)
  const nfc = text.normalize('NFC');
  const isNFD = text !== nfc;

  return {
    normalizedText: nfc,
    detectedEncoding: isNFD ? 'unicode_nfd' : 'unicode_nfc',
    converted: isNFD,
  };
}
