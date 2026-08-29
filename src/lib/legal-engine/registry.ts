import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import type { LegalDocument } from '@/types';

export interface NormalizedDocumentRef {
  raw: string;
  normalizedNumber: string;
  documentType?: string;
  year?: string;
  organCode?: string;
  matchedDocumentId?: string;
  confidence: number;
}

export class DocumentRegistry {
  private static instance: DocumentRegistry;
  private documentMap: Map<string, string> = new Map(); // normalized_key -> document_id
  private idToDocMap: Map<string, Partial<LegalDocument>> = new Map();

  private constructor() {
    this.buildIndex();
  }

  public static getInstance(): DocumentRegistry {
    if (!DocumentRegistry.instance) {
      DocumentRegistry.instance = new DocumentRegistry();
    }
    return DocumentRegistry.instance;
  }

  private buildIndex() {
    this.documentMap.clear();
    this.idToDocMap.clear();

    for (const doc of DEMO_DOCUMENTS) {
      if (!doc.id) continue;
      this.idToDocMap.set(doc.id, doc);
      if (doc.document_number) {
        const standard = this.normalizeNumber(doc.document_number);
        this.documentMap.set(standard, doc.id);

        // Also index short variations
        const cleanNo = doc.document_number.replace(/\s+/g, '').toUpperCase();
        this.documentMap.set(cleanNo, doc.id);

        // Number/Year only
        const parts = this.extractNumberAndYear(doc.document_number);
        if (parts) {
          this.documentMap.set(`${parts.num}/${parts.year}`, doc.id);
        }
      }
    }
  }

  public normalizeNumber(input: string): string {
    if (!input) return '';
    return input
      .trim()
      .replace(/^(Luật|Bộ luật|Nghị định|Thông tư|Quyết định|Công văn|Văn bản hợp nhất)\s*(số)?\s*/i, '')
      .replace(/^(NĐ|TT|QĐ|CV|VBHN)\s*/i, '')
      .replace(/\s*[\/\-]\s*/g, '/')
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  public extractNumberAndYear(text: string): { num: string; year: string } | null {
    const match = text.match(/(\d+)[\/\-](\d{4})/);
    if (match) {
      return { num: match[1], year: match[2] };
    }
    return null;
  }

  public resolve(rawCitation: string): NormalizedDocumentRef {
    const normalized = this.normalizeNumber(rawCitation);
    let matchedId = this.documentMap.get(normalized);
    let confidence = 0.0;

    if (matchedId) {
      confidence = 1.0;
    } else {
      // Try resolving by number/year
      const parts = this.extractNumberAndYear(rawCitation);
      if (parts) {
        const fallbackKey = `${parts.num}/${parts.year}`;
        matchedId = this.documentMap.get(fallbackKey);
        if (matchedId) {
          confidence = 0.85;
        }
      }

      // Try searching title keywords if still not matched
      if (!matchedId) {
        const lowerRaw = rawCitation.toLowerCase();
        for (const [id, doc] of this.idToDocMap.entries()) {
          if (doc.title && lowerRaw.includes(doc.title.toLowerCase().slice(0, 30))) {
            matchedId = id;
            confidence = 0.75;
            break;
          }
        }
      }
    }

    return {
      raw: rawCitation,
      normalizedNumber: normalized,
      matchedDocumentId: matchedId,
      confidence: matchedId ? confidence : 0.0,
    };
  }

  public getDocument(id: string) {
    return this.idToDocMap.get(id);
  }

  public getAllDocuments() {
    return Array.from(this.idToDocMap.values());
  }
}
