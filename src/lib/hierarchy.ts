import { DEMO_RELATIONS, getDocumentById } from './demo-data';
import type { LegalDocument } from '@/types';
export interface HierarchyNode {
  tier: 1 | 2 | 3 | 4;
  tierLabel: 'Luật / Bộ luật' | 'Nghị định' | 'Thông tư / Quyết định' | 'Công văn hướng dẫn';
  document: LegalDocument;
  relationNotes?: string | null;
  children: HierarchyNode[];
}

export interface HierarchyChain {
  rootLaw?: LegalDocument;
  currentTier: 1 | 2 | 3 | 4;
  hierarchyTree: HierarchyNode[];
  ancestors: LegalDocument[];
  descendants: {
    decrees: LegalDocument[];
    circulars: LegalDocument[];
    dispatches: LegalDocument[];
  };
}

export function getTierForDocument(doc: Partial<LegalDocument>): 1 | 2 | 3 | 4 {
  switch (doc.document_type) {
    case 'luat':
      return 1;
    case 'nghi_dinh':
      return 2;
    case 'thong_tu':
    case 'quyet_dinh':
    case 'chuan_muc':
      return 3;
    case 'cong_van':
    case 'huong_dan':
    default:
      return 4;
  }
}

export function getTierLabel(tier: 1 | 2 | 3 | 4): 'Luật / Bộ luật' | 'Nghị định' | 'Thông tư / Quyết định' | 'Công văn hướng dẫn' {
  switch (tier) {
    case 1:
      return 'Luật / Bộ luật';
    case 2:
      return 'Nghị định';
    case 3:
      return 'Thông tư / Quyết định';
    case 4:
      return 'Công văn hướng dẫn';
  }
}

// Build smart 4-tier hierarchy for any given document
export function buildDocumentHierarchy(docId: string): HierarchyChain {
  const currentDoc = getDocumentById(docId) as LegalDocument | undefined;
  if (!currentDoc) {
    return {
      currentTier: 1,
      hierarchyTree: [],
      ancestors: [],
      descendants: { decrees: [], circulars: [], dispatches: [] },
    };
  }

  const currentTier = getTierForDocument(currentDoc);

  // 1. Find all parent laws or guiding decrees by walking up relations
  // target_document_id where relation_type in ('huong_dan', 'can_cu')
  const ancestors: LegalDocument[] = [];
  let rootLaw: LegalDocument | undefined = currentTier === 1 ? currentDoc : undefined;

  // Walk up
  const visitedUp = new Set<string>();
  const queueUp = [currentDoc.id];
  while (queueUp.length > 0) {
    const currentId = queueUp.shift()!;
    if (visitedUp.has(currentId)) continue;
    visitedUp.add(currentId);

    const rels = DEMO_RELATIONS.filter(
      (r) => r.source_document_id === currentId && (r.relation_type === 'huong_dan' || r.relation_type === 'can_cu')
    );

    for (const rel of rels) {
      const target = getDocumentById(rel.target_document_id) as LegalDocument | undefined;
      if (target && !ancestors.find((a) => a.id === target.id)) {
        ancestors.push(target);
        if (target.document_type === 'luat' && !rootLaw) {
          rootLaw = target;
        }
        queueUp.push(target.id);
      }
    }
  }

  // 2. Walk down from rootLaw (or currentDoc if tier 1) to find all Decrees -> Circulars -> Dispatches
  const effectiveRoot = rootLaw || currentDoc;
  const decrees: LegalDocument[] = [];
  const circulars: LegalDocument[] = [];
  const dispatches: LegalDocument[] = [];

  // Find all documents that guide the effectiveRoot or sub-nodes
  // Helper to find documents that guide a specific document
  function findChildDocs(parentId: string): { doc: LegalDocument; relationNotes?: string | null }[] {
    const rels = DEMO_RELATIONS.filter(
      (r) => r.target_document_id === parentId && (r.relation_type === 'huong_dan' || r.relation_type === 'can_cu')
    );
    return rels
      .map((r) => {
        const d = getDocumentById(r.source_document_id) as LegalDocument | undefined;
        return d ? { doc: d, relationNotes: r.notes } : null;
      })
      .filter(Boolean) as { doc: LegalDocument; relationNotes?: string | null }[];
  }

  // Build tree from rootLaw
  // Build tree from rootLaw with cycle protection
  function buildSubTree(nodeDoc: LegalDocument, visited: Set<string> = new Set()): HierarchyNode {
    const tier = getTierForDocument(nodeDoc);
    
    if (visited.has(nodeDoc.id)) {
      return {
        tier,
        tierLabel: getTierLabel(tier),
        document: nodeDoc,
        children: [],
      };
    }
    visited.add(nodeDoc.id);

    const childEntries = findChildDocs(nodeDoc.id);
    const childrenNodes: HierarchyNode[] = [];
    for (const entry of childEntries) {
      const childDoc = entry.doc;
      const childTier = getTierForDocument(childDoc);

      if (childTier === 2 && !decrees.find((d) => d.id === childDoc.id)) {
        decrees.push(childDoc);
      } else if (childTier === 3 && !circulars.find((c) => c.id === childDoc.id)) {
        circulars.push(childDoc);
      } else if (childTier === 4 && !dispatches.find((dp) => dp.id === childDoc.id)) {
        dispatches.push(childDoc);
      }

      childrenNodes.push({
        ...buildSubTree(childDoc, new Set(visited)),
        relationNotes: entry.relationNotes,
      });
    }

    return {
      tier,
      tierLabel: getTierLabel(tier),
      document: nodeDoc,
      children: childrenNodes,
    };
  }

  const hierarchyTree: HierarchyNode[] = [buildSubTree(effectiveRoot)];

  return {
    rootLaw,
    currentTier,
    hierarchyTree,
    ancestors,
    descendants: {
      decrees,
      circulars,
      dispatches,
    },
  };
}
