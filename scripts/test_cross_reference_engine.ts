import { DEMO_DOCUMENTS } from '../src/lib/demo-data';

export interface ExtractedArticle {
  id: string;
  number: string;
  label: string;
  title: string;
  body: string;
}

export function extractStructuredArticles(html: string): ExtractedArticle[] {
  if (!html) return [];

  // Match all Article headings (H1-H6, P, strong, inner or outer anchors <a id="..."></a>)
  const regex = /(?:<h[1-6][^>]*>|<p[^>]*>)\s*(?:<a[^>]*><\/a>\s*)?(?:<strong>|<b>)?\s*(?:<a[^>]*><\/a>\s*)?(Điều\s+(\d+[a-z]?)[.:\s][^<]*)/gi;
  const matches: Array<{ index: number; fullHeading: string; num: string }> = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    const rawHeading = match[1] || '';
    const cleanHeading = rawHeading.replace(/<[^>]*>/g, '').trim();
    const num = match[2] || '';
    matches.push({
      index: match.index,
      fullHeading: cleanHeading,
      num: `Điều ${num}`
    });
  }

  const articles: ExtractedArticle[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const nextIdx = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const sectionHtml = html.slice(m.index, nextIdx);
    const bodyText = sectionHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    articles.push({
      id: `dieu-${m.num.replace(/\s+/g, '-').toLowerCase()}`,
      number: m.num,
      label: m.num,
      title: m.fullHeading,
      body: bodyText
    });
  }

  return articles;
}

export function buildCrossReferenceMatrix(
  docLaw: { title: string; document_number?: string | null; html_content?: string | null },
  docGuiding: { title: string; document_number?: string | null; html_content?: string | null }
) {
  const lawArticles = extractStructuredArticles(docLaw.html_content || '');
  const guidingArticles = extractStructuredArticles(docGuiding.html_content || '');

  console.log(`Extracted: ${lawArticles.length} Law articles, ${guidingArticles.length} Guiding articles.`);

  const pairs = [];

  for (const lawArt of lawArticles) {
    const lawNumDigits = lawArt.number.replace(/[^\d]/g, '');
    const matchedGuiding: ExtractedArticle[] = [];
    let matchType = 'general';

    for (const gArt of guidingArticles) {
      // 1. Check explicit citation in guiding article body (e.g. "Điều 2 của Luật", "khoản 4 Điều 2")
      const citationRegex = new RegExp(`(?:khoản\\s+\\d+[a-z]?\\s*,?\\s*)*(?:điểm\\s+[a-z]\\s*,?\\s*)*Điều\\s+${lawNumDigits}(?:\\s+của\\s+Luật|\\s+Luật|\\s*[,.;])`, 'i');
      if (citationRegex.test(gArt.body)) {
        matchedGuiding.push(gArt);
        matchType = 'citation';
        continue;
      }

      // 2. Check title similarity
      const lawCoreTitle = lawArt.title.replace(/^Điều\s+\d+[a-z]?[.:\s]*/i, '').trim().toLowerCase();
      const gCoreTitle = gArt.title.replace(/^Điều\s+\d+[a-z]?[.:\s]*/i, '').trim().toLowerCase();
      if (lawCoreTitle.length > 6 && (gCoreTitle.includes(lawCoreTitle) || lawCoreTitle.includes(gCoreTitle))) {
        matchedGuiding.push(gArt);
        matchType = 'title_match';
      }
    }

    if (matchedGuiding.length > 0) {
      pairs.push({
        lawArticleNumber: lawArt.number,
        lawArticleTitle: lawArt.title,
        lawSnippet: lawArt.body.slice(0, 250) + '...',
        guidingArticleNumber: matchedGuiding.map(g => g.number).join(', '),
        guidingArticleTitle: matchedGuiding.map(g => g.title).join('; '),
        guidingSnippet: matchedGuiding.map(g => g.body.slice(0, 300)).join('\n\n') + '...',
        summaryTag: matchedGuiding[0].title.replace(/^Điều\s+\d+[a-z]?[.:\s]*/i, '').slice(0, 60),
        citationType: matchType
      });
    } else {
      pairs.push({
        lawArticleNumber: lawArt.number,
        lawArticleTitle: lawArt.title,
        lawSnippet: lawArt.body.slice(0, 250) + '...',
        guidingArticleNumber: '—',
        guidingArticleTitle: 'Thực hiện trực tiếp theo quy định của Luật',
        guidingSnippet: 'Nội dung áp dụng trực tiếp theo quy định khung tại Luật.',
        summaryTag: 'Quy định khung',
        citationType: 'general'
      });
    }
  }

  return pairs;
}

const doc109 = DEMO_DOCUMENTS.find(d => d.document_number === '109/2025/QH15');
const doc253 = DEMO_DOCUMENTS.find(d => d.document_number === '253/2026/NĐ-CP');

if (doc109 && doc253) {
  const matrix = buildCrossReferenceMatrix(doc109, doc253);
  console.log(`\n=== MAPPING MATRIX: ${doc109.document_number} <-> ${doc253.document_number} ===`);
  console.log(`Total Mapped Rows: ${matrix.length}\n`);
  matrix.slice(0, 12).forEach((p, idx) => {
    console.log(`Row ${idx + 1}: [${p.lawArticleNumber}] ${p.lawArticleTitle}`);
    console.log(`  ↳ Hướng dẫn chi tiết tại: [${p.guidingArticleNumber}] ${p.guidingArticleTitle}`);
    console.log(`  ↳ Tag tóm tắt: "${p.summaryTag}" (${p.citationType})\n`);
  });
}
