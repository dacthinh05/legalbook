import { DocumentRegistry } from './registry';
import type { LegalRelationship, LegalChange, LegalRelationshipType, DocumentNode } from './types';

export interface AnalysisResult {
  relationships: LegalRelationship[];
  changesets: LegalChange[];
}

export class LegalRuleEngine {
  private registry: DocumentRegistry;

  constructor() {
    this.registry = DocumentRegistry.getInstance();
  }

  public analyzeDocument(
    sourceDocumentId: string,
    sourceDocumentNumber: string,
    nodes: DocumentNode[],
    fullText: string
  ): AnalysisResult {
    const relationships: LegalRelationship[] = [];
    const changesets: LegalChange[] = [];
    const seenRelations = new Set<string>();

    const addRelation = (
      targetDocId: string,
      type: LegalRelationshipType,
      instruction: string,
      evidence: string,
      location: string,
      sourceNodeId?: string,
      targetNodeId?: string,
      confidence: number = 0.95,
      effectiveFrom?: string
    ) => {
      const key = `${sourceDocumentId}->${targetDocId}:${type}:${targetNodeId || ''}`;
      if (seenRelations.has(key)) return;
      seenRelations.add(key);

      const targetDoc = this.registry.getDocument(targetDocId);

      const relId = `rel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const rel: LegalRelationship = {
        id: relId,
        source_document_id: sourceDocumentId,
        target_document_id: targetDocId,
        relationship_type: type,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        effective_from: effectiveFrom,
        extracted_instruction: instruction,
        evidence_text: evidence,
        evidence_location: location,
        detection_method: 'rule',
        confidence: confidence,
        review_status: 'pending', // Strict requirement: AI/Rule detected items are ALWAYS pending
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source_document_number: sourceDocumentNumber,
        target_document_title: targetDoc?.title || undefined,
        target_document_number: targetDoc?.document_number || undefined,
      };
      relationships.push(rel);
      return rel;
    };

    // 1. SCAN FOR PREAMBLE CITATIONS (Căn cứ ban hành & Hướng dẫn thi hành)
    const preambleMatches = fullText.matchAll(/Căn cứ\s+(Luật|Bộ luật|Nghị định|Nghị quyết|Pháp lệnh)?\s*([^;\.\n]+)/gi);
    for (const match of preambleMatches) {
      const rawCite = match[0];
      const resolved = this.registry.resolve(rawCite);
      if (resolved.matchedDocumentId && resolved.matchedDocumentId !== sourceDocumentId) {
        addRelation(
          resolved.matchedDocumentId,
          'can_cu',
          'Căn cứ ban hành theo phần mở đầu của văn bản',
          rawCite,
          'Phần căn cứ ban hành',
          undefined,
          undefined,
          resolved.confidence
        );
      }
    }

    // 2. SCAN NODES FOR LEGAL OPERATIONAL COMMANDS
    for (const node of nodes) {
      const text = node.content;

      // Pattern A: Sửa đổi, bổ sung (Amends / Supplements)
      // e.g. "Sửa đổi, bổ sung khoản 1 Điều 19 Nghị định số 123/2020/NĐ-CP"
      // e.g. "Sửa đổi, bổ sung Điều 5 Thông tư số 219/2013/TT-BTC"
      const amendMatches = text.matchAll(/(Sửa đổi[,\s]+bổ sung|Sửa đổi|Bổ sung)\s+((?:khoản\s+\d+|điểm\s+[a-zđ]|Điều\s+\d+)[^,\.\n]*?)\s+của\s+(Luật|Nghị định|Thông tư|Quyết định|văn bản)?\s*([0-9]+\/[0-9]+[^\s,\.\;]*)/gi);
      for (const m of amendMatches) {
        const opType = m[1].toLowerCase().includes('bổ sung') ? 'supplements' : 'amends';
        const targetSection = m[2].trim();
        const targetDocRaw = m[4].trim();
        const resolved = this.registry.resolve(targetDocRaw);

        if (resolved.matchedDocumentId) {
          const rel = addRelation(
            resolved.matchedDocumentId,
            opType,
            `${m[1]} ${targetSection} của ${targetDocRaw}`,
            m[0],
            node.path,
            node.id,
            undefined,
            resolved.confidence
          );

          // Generate structured changeset
          const changeId = `chg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          changesets.push({
            id: changeId,
            relationship_id: rel?.id,
            amending_document_id: sourceDocumentId,
            target_document_id: resolved.matchedDocumentId,
            operation: opType === 'supplements' ? 'insert_after' : 'replace_node',
            new_content: node.content,
            evidence_text: m[0],
            evidence_location: node.path,
            confidence: resolved.confidence,
            effective_from: new Date().toISOString().split('T')[0],
            review_status: 'pending',
            created_at: new Date().toISOString(),
          });
        }
      }

      // Pattern B: Thay thế cụm từ / Thay thế toàn bộ (Replaces)
      // e.g. "Thông tư này thay thế Thông tư số 200/2014/TT-BTC"
      // e.g. "Thay thế cụm từ 'gửi thông báo' bằng cụm từ 'lập văn bản thỏa thuận'"
      const replaceDocMatches = text.matchAll(/(Văn bản|Nghị định|Thông tư|Luật)?\s*này\s+thay\s+thế\s+(Luật|Nghị định|Thông tư|Quyết định)?\s*([0-9]+\/[0-9]+[^\s,\.\;]*)/gi);
      for (const m of replaceDocMatches) {
        const targetDocRaw = m[3].trim();
        const resolved = this.registry.resolve(targetDocRaw);
        if (resolved.matchedDocumentId) {
          addRelation(
            resolved.matchedDocumentId,
            'replaces',
            `Thay thế toàn bộ văn bản ${targetDocRaw}`,
            m[0],
            node.path,
            node.id,
            undefined,
            resolved.confidence
          );
        }
      }

      const phraseMatches = text.matchAll(/Thay\s+thế\s+cụm\s+từ\s+["“]([^"”]+)["”]\s+bằng\s+cụm\s+từ\s+["“]([^"”]+)["”]/gi);
      for (const m of phraseMatches) {
        const oldPhrase = m[1];
        const newPhrase = m[2];
        changesets.push({
          id: `chg-phr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          amending_document_id: sourceDocumentId,
          target_document_id: sourceDocumentId,
          operation: 'replace_phrase',
          old_content: oldPhrase,
          new_content: newPhrase,
          evidence_text: m[0],
          evidence_location: node.path,
          confidence: 0.98,
          effective_from: new Date().toISOString().split('T')[0],
          review_status: 'pending',
          created_at: new Date().toISOString(),
        });
      }

      // Pattern C: Bãi bỏ (Repeals)
      // e.g. "Bãi bỏ khoản 2 Điều 15..." hoặc "Bãi bỏ Thông tư số..."
      const repealMatches = text.matchAll(/Bãi\s+bỏ\s+((?:khoản\s+\d+|điểm\s+[a-zđ]|Điều\s+\d+|toàn\s+bộ)[^,\.\n]*?)\s*(?:của\s+(Luật|Nghị định|Thông tư|Quyết định)?\s*([0-9]+\/[0-9]+[^\s,\.\;]*))?/gi);
      for (const m of repealMatches) {
        const targetPart = m[1].trim();
        const targetDocRaw = m[3] ? m[3].trim() : null;
        if (targetDocRaw) {
          const resolved = this.registry.resolve(targetDocRaw);
          if (resolved.matchedDocumentId) {
            addRelation(
              resolved.matchedDocumentId,
              'repeals',
              `Bãi bỏ ${targetPart} của ${targetDocRaw}`,
              m[0],
              node.path,
              node.id,
              undefined,
              resolved.confidence
            );
          }
        }
      }

      // Pattern D: Hướng dẫn thi hành (Guides / Details)
      // e.g. "Quy định chi tiết và hướng dẫn thi hành Luật Thuế giá trị gia tăng số 48/2024/QH15"
      const guideMatches = text.matchAll(/(Quy định chi tiết|Hướng dẫn thi hành|Hướng dẫn thực hiện)\s+(?:Điều\s+\d+\s+)?(?:của\s+)?(Luật|Nghị định|Thông tư)?\s*([0-9]+\/[0-9]+[^\s,\.\;]*)/gi);
      for (const m of guideMatches) {
        const targetDocRaw = m[3].trim();
        const resolved = this.registry.resolve(targetDocRaw);
        if (resolved.matchedDocumentId) {
          addRelation(
            resolved.matchedDocumentId,
            'guides',
            `${m[1]} cho ${targetDocRaw}`,
            m[0],
            node.path,
            node.id,
            undefined,
            resolved.confidence
          );
        }
      }
    }

    return { relationships, changesets };
  }
}
