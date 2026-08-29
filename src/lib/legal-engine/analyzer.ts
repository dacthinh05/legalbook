import { DocumentStructureParser } from './parser';
import { LegalRuleEngine } from './rules';
import type { LegalRelationship, LegalChange, DocumentNode, ReviewStatus } from './types';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';

export class LegalDocumentAnalyzer {
  private static instance: LegalDocumentAnalyzer;
  private queueRelationships: LegalRelationship[] = [];
  private queueChangesets: LegalChange[] = [];
  private parsedNodesMap: Map<string, DocumentNode[]> = new Map();
  private auditLogs: {
    id: string;
    relationship_id: string;
    action: 'approved' | 'rejected' | 'modified';
    reviewer: string;
    timestamp: string;
    notes?: string;
  }[] = [];

  private constructor() {
    this.runInitialAnalysis();
  }

  public static getInstance(): LegalDocumentAnalyzer {
    if (!LegalDocumentAnalyzer.instance) {
      LegalDocumentAnalyzer.instance = new LegalDocumentAnalyzer();
    }
    return LegalDocumentAnalyzer.instance;
  }

  private runInitialAnalysis() {
    const engine = new LegalRuleEngine();

    for (const doc of DEMO_DOCUMENTS) {
      if (!doc.id || !doc.html_content) continue;

      const parser = new DocumentStructureParser(doc.id, doc.id);
      const nodes = parser.parseHtml(doc.html_content);
      this.parsedNodesMap.set(doc.id, nodes);

      const flatNodes = parser.flattenNodes(nodes);
      const result = engine.analyzeDocument(
        doc.id,
        doc.document_number || doc.id,
        flatNodes,
        doc.html_content
      );

      this.queueRelationships.push(...result.relationships);
      this.queueChangesets.push(...result.changesets);
    }
  }

  public getQueueRelationships(status?: ReviewStatus): LegalRelationship[] {
    if (!status) return this.queueRelationships;
    return this.queueRelationships.filter(r => r.review_status === status);
  }

  public getQueueChangesets(): LegalChange[] {
    return this.queueChangesets;
  }

  public getParsedNodes(documentId: string): DocumentNode[] {
    return this.parsedNodesMap.get(documentId) || [];
  }

  public updateReviewStatus(
    relationshipId: string,
    status: ReviewStatus,
    reviewer: string = 'Chuyên viên Pháp chế',
    notes?: string,
    modifiedData?: Partial<LegalRelationship>
  ): LegalRelationship | null {
    const rel = this.queueRelationships.find(r => r.id === relationshipId);
    if (!rel) return null;

    rel.review_status = status;
    rel.reviewed_by = reviewer;
    rel.reviewed_at = new Date().toISOString();
    rel.notes = notes || rel.notes;

    if (modifiedData) {
      Object.assign(rel, modifiedData);
    }

    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      relationship_id: relationshipId,
      action: status === 'verified' ? (modifiedData ? 'modified' : 'approved') : 'rejected',
      reviewer,
      timestamp: new Date().toISOString(),
      notes,
    });

    return rel;
  }

  public getAuditLogs() {
    return this.auditLogs;
  }
}
