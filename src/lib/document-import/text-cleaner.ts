/**
 * Safe text cleaner for Vietnamese legal documents.
 * Normalizes layout, punctuation, removes repeated headers/footers, fixes hyphenation.
 */

export interface CleaningResult {
  cleanedText: string;
  removedHeadersFootersCount: number;
  joinedHyphensCount: number;
}

export function cleanControlCharacters(text: string): string {
  if (!text) return '';
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Joins hyphenated words broken across line breaks (e.g. "doanh nghi-\nệp" -> "doanh nghiệp").
 */
export function joinLineHyphenations(text: string): { text: string; count: number } {
  if (!text) return { text: '', count: 0 };
  let count = 0;
  // Match a Vietnamese word character, a hyphen, newline, optional whitespace, and word character
  const joined = text.replace(/([a-zA-Zà-ỹÀ-Ỹ0-9])-\s*\n\s*([a-zA-Zà-ỹÀ-Ỹ0-9])/g, (_match, p1, p2) => {
    count++;
    return `${p1}${p2}`;
  });
  return { text: joined, count };
}

/**
 * Normalizes Vietnamese punctuation and whitespace without altering legal words or numbers.
 */
export function normalizePunctuationAndSpacing(text: string): string {
  if (!text) return '';

  return text
    // Replace non-breaking spaces
    .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
    // Replace 3+ consecutive newlines with 2 newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing whitespace on each line
    .split('\n')
    .map((line) => {
      let l = line.replace(/[ \t]+/g, ' ').trim();
      // Fix spacing before punctuation like " , " or " . "
      l = l.replace(/\s+([,.:;?!])/g, '$1');
      // Ensure space after punctuation if followed by a letter (avoid decimal numbers like 1.5 or 2,5)
      l = l.replace(/([,.:;?!])([a-zA-Zà-ỹÀ-Ỹ])/g, '$1 $2');
      return l;
    })
    .join('\n')
    .trim();
}

/**
 * Removes repetitive page headers and footers (such as "Trang 1 / 10", "VBPL...", repeated across pages).
 */
export function removeRepetitiveHeadersFooters(lines: string[]): { cleanedLines: string[]; removedCount: number } {
  if (lines.length <= 10) {
    return { cleanedLines: lines, removedCount: 0 };
  }

  // Count frequency of candidate header/footer patterns
  const lineCounts = new Map<string, number>();
  const isCandidate = (l: string) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.length > 80) return false;
    // Common page number patterns or official slogans repeated on every page
    if (/^(Trang\s+\d+(\s*[\/\-]\s*\d+)?|\d+\s*[\/\-]\s*\d+|Page\s+\d+)$/i.test(trimmed)) return true;
    if (/^(CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM|Độc lập - Tự do - Hạnh phúc)$/i.test(trimmed)) return false; // keep first occurrence
    return false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (isCandidate(trimmed)) {
      lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
    }
  }

  let removedCount = 0;
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (isCandidate(trimmed) && (lineCounts.get(trimmed) || 0) >= 2) {
      // Page number repeated across multiple pages
      removedCount++;
      continue;
    }
    cleanedLines.push(line);
  }

  return { cleanedLines, removedCount };
}

/**
 * Full safe cleaning pipeline for raw extracted document text.
 */
export function cleanDocumentLayout(rawText: string): CleaningResult {
  if (!rawText) {
    return { cleanedText: '', removedHeadersFootersCount: 0, joinedHyphensCount: 0 };
  }

  // 1. Remove control characters
  const sanitized = cleanControlCharacters(rawText);

  // 2. Join hyphenated words across linebreaks
  const { text: hyphenFixed, count: hyphensCount } = joinLineHyphenations(sanitized);

  // 3. Remove repetitive headers & footers
  const rawLines = hyphenFixed.split('\n');
  const { cleanedLines, removedCount: headerFooterCount } = removeRepetitiveHeadersFooters(rawLines);

  // 4. Normalize spacing & punctuation
  const cleanedText = normalizePunctuationAndSpacing(cleanedLines.join('\n'));

  return {
    cleanedText,
    removedHeadersFootersCount: headerFooterCount,
    joinedHyphensCount: hyphensCount,
  };
}
