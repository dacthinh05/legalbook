/**
 * diff-engine.ts
 * 
 * High-performance, zero-dependency token-level Diff Engine and Legal Amendment Comparator
 * for comparing legal articles, clauses, and document versions.
 */

export type DiffOp = 'unchanged' | 'added' | 'deleted';

export interface DiffToken {
  op: DiffOp;
  text: string;
}

export interface ArticleDiffItem {
  articleId: string;
  articleLabel: string;
  articleTitleA: string;
  articleTitleB: string;
  status: 'modified' | 'added' | 'deleted' | 'unchanged';
  tokens: DiffToken[];
  additionsCount: number;
  deletionsCount: number;
}

export interface LegalDocumentDiffResult {
  titleA: string;
  titleB: string;
  totalArticlesCount: number;
  modifiedArticlesCount: number;
  addedArticlesCount: number;
  deletedArticlesCount: number;
  unchangedArticlesCount: number;
  totalWordsAdded: number;
  totalWordsDeleted: number;
  articles: ArticleDiffItem[];
}

/**
 * Tokenizes text into words, whitespace, and punctuation tokens.
 */
export function tokenizeText(text: string): string[] {
  if (!text) return [];
  // Split while capturing delimiters (words, whitespace, punctuation)
  const tokens = text.match(/[\w\d\p{L}]+|[^\w\d\p{L}\s]+|\s+/gu);
  return tokens || [text];
}

/**
 * Computes token-level differences between two strings using an optimized Longest Common Subsequence (LCS) matrix.
 */
export function computeTokenDiff(textA: string, textB: string): DiffToken[] {
  if (textA === textB) {
    return textA ? [{ op: 'unchanged', text: textA }] : [];
  }
  if (!textA) {
    return textB ? [{ op: 'added', text: textB }] : [];
  }
  if (!textB) {
    return textA ? [{ op: 'deleted', text: textA }] : [];
  }

  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);

  const n = tokensA.length;
  const m = tokensB.length;

  // For very large texts, if diff is identical or trivial, early return
  if (n === 0 && m === 0) return [];

  // Bounded DP matrix for LCS
  // When lengths are large, use a flat 1D array or trimmed bounds
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build token sequence
  const rawDiff: DiffToken[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      rawDiff.push({ op: 'unchanged', text: tokensA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ op: 'added', text: tokensB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ op: 'deleted', text: tokensA[i - 1] });
      i--;
    }
  }

  rawDiff.reverse();

  // Compress contiguous operations of the same type
  const compressed: DiffToken[] = [];
  for (const token of rawDiff) {
    const last = compressed[compressed.length - 1];
    if (last && last.op === token.op) {
      last.text += token.text;
    } else {
      compressed.push({ op: token.op, text: token.text });
    }
  }

  return compressed;
}

/**
 * Strips HTML tags into clean plain text for diff comparison.
 */
function cleanHtmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ExtractedArticle {
  id: string;
  label: string;
  title: string;
  body: string;
}

/**
 * Parses all articles and structural sections from legal HTML content.
 */
export function extractLegalArticles(html: string): ExtractedArticle[] {
  if (!html) return [];

  const headingRegex = /(?:<h[1-6][^>]*>|<p[^>]*>\s*<strong>|<strong>|<p[^>]*>)\s*((?:Điều|Chương|Phần|Mục|Phụ lục)\s+[\dIVXLCDM\w\.\-]+[^<\n]{0,120})/gi;
  const matches: Array<{ index: number; fullHeading: string; label: string }> = [];
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const rawHeading = match[1] || '';
    const fullHeading = rawHeading.replace(/<[^>]*>/g, '').trim();
    const label = fullHeading.replace(/[\.:].*$/, '').trim();
    if (label && label.length > 2) {
      matches.push({
        index: match.index,
        fullHeading,
        label,
      });
    }
  }

  const articles: ExtractedArticle[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const sectionHtml = html.slice(m.index, nextIndex);
    const sectionBody = cleanHtmlToText(sectionHtml);

    // Normalized ID (e.g. dieu-1, dieu-15)
    let semanticId = `sec-${i}`;
    const dieuMatch = m.label.match(/điều\s+(\d+[a-z]?)/i);
    if (dieuMatch) {
      semanticId = `dieu-${dieuMatch[1].toLowerCase()}`;
    } else {
      const chuongMatch = m.label.match(/chương\s+([ivxlcdm\d]+)/i);
      if (chuongMatch) {
        semanticId = `chuong-${chuongMatch[1].toLowerCase()}`;
      }
    }

    articles.push({
      id: semanticId,
      label: m.label,
      title: m.fullHeading,
      body: sectionBody,
    });
  }

  return articles;
}

/**
 * Compares two legal documents at the article and token level.
 */
export function compareLegalDocuments(
  docA: { title: string; html: string },
  docB: { title: string; html: string }
): LegalDocumentDiffResult {
  const articlesA = extractLegalArticles(docA.html);
  const articlesB = extractLegalArticles(docB.html);

  const mapA = new Map<string, ExtractedArticle>();
  articlesA.forEach((a) => mapA.set(a.id, a));

  const mapB = new Map<string, ExtractedArticle>();
  articlesB.forEach((b) => mapB.set(b.id, b));

  // Union of all article IDs in document order
  const allIds: string[] = [];
  articlesA.forEach((a) => {
    if (!allIds.includes(a.id)) allIds.push(a.id);
  });
  articlesB.forEach((b) => {
    if (!allIds.includes(b.id)) allIds.push(b.id);
  });

  const diffItems: ArticleDiffItem[] = [];
  let modifiedCount = 0;
  let addedCount = 0;
  let deletedCount = 0;
  let unchangedCount = 0;
  let totalWordsAdded = 0;
  let totalWordsDeleted = 0;

  for (const id of allIds) {
    const artA = mapA.get(id);
    const artB = mapB.get(id);

    if (artA && artB) {
      const tokens = computeTokenDiff(artA.body, artB.body);
      const isModified = tokens.some((t) => t.op !== 'unchanged');
      let adds = 0;
      let dels = 0;

      tokens.forEach((t) => {
        if (t.op === 'added') {
          adds += (t.text.match(/\S+/g) || []).length;
        } else if (t.op === 'deleted') {
          dels += (t.text.match(/\S+/g) || []).length;
        }
      });

      totalWordsAdded += adds;
      totalWordsDeleted += dels;

      if (isModified) {
        modifiedCount++;
      } else {
        unchangedCount++;
      }

      diffItems.push({
        articleId: id,
        articleLabel: artB.label || artA.label,
        articleTitleA: artA.title,
        articleTitleB: artB.title,
        status: isModified ? 'modified' : 'unchanged',
        tokens,
        additionsCount: adds,
        deletionsCount: dels,
      });
    } else if (artB && !artA) {
      // Newly added article
      addedCount++;
      const words = (artB.body.match(/\S+/g) || []).length;
      totalWordsAdded += words;

      diffItems.push({
        articleId: id,
        articleLabel: artB.label,
        articleTitleA: '',
        articleTitleB: artB.title,
        status: 'added',
        tokens: [{ op: 'added', text: artB.body }],
        additionsCount: words,
        deletionsCount: 0,
      });
    } else if (artA && !artB) {
      // Deleted / repealed article
      deletedCount++;
      const words = (artA.body.match(/\S+/g) || []).length;
      totalWordsDeleted += words;

      diffItems.push({
        articleId: id,
        articleLabel: artA.label,
        articleTitleA: artA.title,
        articleTitleB: '',
        status: 'deleted',
        tokens: [{ op: 'deleted', text: artA.body }],
        additionsCount: 0,
        deletionsCount: words,
      });
    }
  }

  return {
    titleA: docA.title,
    titleB: docB.title,
    totalArticlesCount: allIds.length,
    modifiedArticlesCount: modifiedCount,
    addedArticlesCount: addedCount,
    deletedArticlesCount: deletedCount,
    unchangedArticlesCount: unchangedCount,
    totalWordsAdded,
    totalWordsDeleted,
    articles: diffItems,
  };
}
