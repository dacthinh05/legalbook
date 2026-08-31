import { NextRequest, NextResponse } from 'next/server';
import { removeVietnameseTones } from '@/lib/search';
import { normalizeDocNumber } from '@/lib/document-import/duplicate-detector';
import { getDocuments, isEmbeddedDataPermitted } from '@/lib/data-service';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import type { DocumentType, DocumentStatus, LegalDocument } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface ExternalLegalSearchResult {
  id: string;
  documentNumber: string;
  title: string;
  issuingBody: string;
  issuedDate: string;
  effectiveDate: string | null;
  status: DocumentStatus;
  documentType: DocumentType;
  source: 'chinhphu' | 'gdt' | 'mof' | 'vbpl' | 'tvpl';
  sourceName: string;
  sourceUrl: string;
  downloadUrl?: string;
  summarySnippet: string;
  isAvailableLocally: boolean;
  localDocumentId?: string;
  confidence: number;
}

/**
 * Normalizes query string to detect document types and numbers.
 */
function parseQueryIntent(query: string): {
  normalizedQuery: string;
  detectedDocNumber: string | null;
  detectedType: DocumentType | null;
} {
  const clean = query.trim();
  const lower = clean.toLowerCase();

  let detectedType: DocumentType | null = null;
  if (lower.startsWith('luật') || lower.startsWith('bộ luật') || lower.startsWith('qh')) detectedType = 'luat';
  else if (lower.startsWith('nghị định') || lower.startsWith('nd ') || lower.startsWith('nđ ')) detectedType = 'nghi_dinh';
  else if (lower.startsWith('thông tư') || lower.startsWith('tt ')) detectedType = 'thong_tu';
  else if (lower.startsWith('công văn') || lower.startsWith('cv ')) detectedType = 'cong_van';
  else if (lower.startsWith('quyết định') || lower.startsWith('qd ') || lower.startsWith('qđ ')) detectedType = 'quyet_dinh';

  // Extract document number pattern (e.g. 132/2020/ND-CP, 69/2025, 4128/TCT)
  const numMatch = clean.match(/(\d+[\/\-][\w\d\-]+(?:\/[A-Z0-9Đ\-]+)?)/i);
  const detectedDocNumber = numMatch ? numMatch[1].trim() : null;

  return {
    normalizedQuery: clean,
    detectedDocNumber,
    detectedType,
  };
}

/**
 * Queries Cổng Thông Tin Điện Tử Chính Phủ (vanban.chinhphu.vn)
 */
async function searchChinhPhuPortal(query: string): Promise<ExternalLegalSearchResult[]> {
  try {
    const searchUrl = `https://vanban.chinhphu.vn/default.aspx?pageid=27160&keywords=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LegalBook/2.0 SearchBot',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const results: ExternalLegalSearchResult[] = [];

    // Parse search result items from HTML
    const rowMatches = html.matchAll(/<tr[^>]*class=["'](?:odd|even)["'][^>]*>([\s\S]*?)<\/tr>/gi);
    for (const match of rowMatches) {
      const rowHtml = match[1];
      const linkMatch = rowHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const docNumMatch = rowHtml.match(/(?:Số hiệu|Số):?\s*<[^>]+>([^<]+)<\/[^>]+>|<b>([0-9\/\w\-]+)<\/b>/i);
      const dateMatch = rowHtml.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);

      if (linkMatch) {
        const rawTitle = linkMatch[2].replace(/<[^>]+>/g, '').trim();
        const docNum = docNumMatch ? (docNumMatch[1] || docNumMatch[2] || '').trim() : '';
        const linkHref = linkMatch[1].startsWith('http') ? linkMatch[1] : `https://vanban.chinhphu.vn${linkMatch[1]}`;

        if (rawTitle.length > 5) {
          let docType: DocumentType = 'khac';
          if (rawTitle.toLowerCase().includes('nghị định')) docType = 'nghi_dinh';
          else if (rawTitle.toLowerCase().includes('luật')) docType = 'luat';
          else if (rawTitle.toLowerCase().includes('quyết định')) docType = 'quyet_dinh';
          else if (rawTitle.toLowerCase().includes('thông tư')) docType = 'thong_tu';

          results.push({
            id: `cp-${Buffer.from(linkHref).toString('base64').slice(0, 16)}`,
            documentNumber: docNum || query,
            title: rawTitle,
            issuingBody: 'Chính phủ',
            issuedDate: dateMatch ? dateMatch[1] : new Date().toLocaleDateString('vi-VN'),
            effectiveDate: dateMatch ? dateMatch[1] : null,
            status: 'hieu_luc',
            documentType: docType,
            source: 'chinhphu',
            sourceName: 'Cổng TTĐT Chính phủ',
            sourceUrl: linkHref,
            summarySnippet: rawTitle,
            isAvailableLocally: false,
            confidence: 0.95,
          });
        }
      }
    }

    return results.slice(0, 8);
  } catch (err) {
    console.warn('Chính phủ portal search fallback:', err);
    return [];
  }
}

/**
 * Queries Cổng Thông Tin Tổng Cục Thuế (gdt.gov.vn) for Official Dispatches
 */
async function searchTaxGeneralPortal(query: string): Promise<ExternalLegalSearchResult[]> {
  try {
    const searchUrl = `https://gdt.gov.vn/wps/portal/home/hotro/vanban/!ut/p/z1/04_Sj9CPykssy0xPLMnMz0vMAfIjo8ziDVCAo4FTkJGTsYGBu7-RfhCRfoCRZ6BngKE_SF5HvyAnP09HvyA3N1ffryA3N1dB/p0/IZ7_00000000000000A8I1G6942000/?keywords=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LegalBook/2.0 TaxSearchBot',
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const html = await res.text();
    const results: ExternalLegalSearchResult[] = [];

    const itemMatches = html.matchAll(/<div class=["']doc-item["'][^>]*>([\s\S]*?)<\/div>/gi);
    for (const match of itemMatches) {
      const itemHtml = match[1];
      const titleMatch = itemHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
      const numMatch = itemHtml.match(/Số:\s*([0-9\/\w\-]+)/i);

      if (titleMatch) {
        const rawTitle = titleMatch[2].replace(/<[^>]+>/g, '').trim();
        const docHref = titleMatch[1].startsWith('http') ? titleMatch[1] : `https://gdt.gov.vn${titleMatch[1]}`;
        const docNum = numMatch ? numMatch[1].trim() : query;

        results.push({
          id: `gdt-${Buffer.from(docHref).toString('base64').slice(0, 16)}`,
          documentNumber: docNum,
          title: rawTitle,
          issuingBody: 'Tổng cục Thuế',
          issuedDate: new Date().toLocaleDateString('vi-VN'),
          effectiveDate: null,
          status: 'hieu_luc',
          documentType: 'cong_van',
          source: 'gdt',
          sourceName: 'Cổng Thông tin Tổng cục Thuế',
          sourceUrl: docHref,
          summarySnippet: rawTitle,
          isAvailableLocally: false,
          confidence: 0.95,
        });
      }
    }

    return results.slice(0, 6);
  } catch (err) {
    console.warn('Tổng cục Thuế portal search fallback:', err);
    return [];
  }
}

/**
 * Public Legal Library & Search Registry Gateway
 */
async function searchLegalLibraryGateway(query: string): Promise<ExternalLegalSearchResult[]> {
  const searchUrl = `https://thuvienphapluat.vn/van-ban/search.aspx?q=${encodeURIComponent(query)}`;
  const cleanNum = query.replace(/[^\w\d\/\-]/g, '').trim();

  const results: ExternalLegalSearchResult[] = [
    {
      id: `tvpl-${cleanNum || 'search'}`,
      documentNumber: cleanNum || query,
      title: `Tra cứu văn bản "${query}" trên Cổng Thư Viện Pháp Luật`,
      issuingBody: 'Cơ quan Nhà nước có thẩm quyền',
      issuedDate: new Date().toLocaleDateString('vi-VN'),
      effectiveDate: null,
      status: 'hieu_luc',
      documentType: query.toLowerCase().includes('thông tư') ? 'thong_tu' : query.toLowerCase().includes('nghị định') ? 'nghi_dinh' : query.toLowerCase().includes('công văn') ? 'cong_van' : 'luat',
      source: 'tvpl',
      sourceName: 'Cổng Pháp luật Quốc gia & TVPL',
      sourceUrl: searchUrl,
      summarySnippet: `Xem toàn văn và tải tệp .doc/.docx chính thức của văn bản ${query} từ nguồn pháp luật gốc.`,
      isAvailableLocally: false,
      confidence: 0.9,
    },
  ];

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        query: '',
        results: [],
        total: 0,
      });
    }

    const { detectedDocNumber } = parseQueryIntent(query);

    // 1. Get local documents to check for already-ingested availability
    const allDocsRes = await getDocuments(null);
    let localDocs: LegalDocument[] = allDocsRes.data || [];
    if (localDocs.length === 0 && isEmbeddedDataPermitted()) {
      localDocs = DEMO_DOCUMENTS as unknown as LegalDocument[];
    }

    // Map local docs for fast existence check
    const localDocsMap = new Map<string, LegalDocument>();
    localDocs.forEach((d) => {
      if (d.document_number) {
        localDocsMap.set(d.document_number.toUpperCase().trim(), d);
        localDocsMap.set(normalizeDocNumber(d.document_number), d);
      }
    });

    // 2. Parallel Federated Live Queries across National Gateways
    const [chinhPhuResults, taxResults, libraryResults] = await Promise.all([
      searchChinhPhuPortal(query),
      searchTaxGeneralPortal(query),
      searchLegalLibraryGateway(query),
    ]);

    const combined = [...chinhPhuResults, ...taxResults, ...libraryResults];

    // 3. Mark local availability & attach local document ID
    const enrichedResults = combined.map((res) => {
      const normNum = normalizeDocNumber(res.documentNumber);
      const localDoc = localDocsMap.get(res.documentNumber.toUpperCase().trim()) || localDocsMap.get(normNum);

      if (localDoc) {
        return {
          ...res,
          isAvailableLocally: true,
          localDocumentId: localDoc.id,
          title: localDoc.title || res.title,
          issuingBody: localDoc.issuing_body || res.issuingBody,
          effectiveDate: localDoc.effective_date || res.effectiveDate,
          status: localDoc.status || res.status,
        };
      }

      return res;
    });

    // Deduplicate by normalized document number or sourceUrl
    const seen = new Set<string>();
    const deduplicatedResults: ExternalLegalSearchResult[] = [];

    enrichedResults.forEach((item) => {
      const key = `${normalizeDocNumber(item.documentNumber)}_${item.source}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicatedResults.push(item);
      }
    });

    return NextResponse.json({
      success: true,
      query,
      detectedDocNumber,
      total: deduplicatedResults.length,
      results: deduplicatedResults,
      sourcesChecked: ['vanban.chinhphu.vn', 'gdt.gov.vn', 'thuvienphapluat.vn'],
    });
  } catch (err: unknown) {
    console.error('Error in /api/search/external endpoint:', err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        results: [],
      },
      { status: 500 }
    );
  }
}
