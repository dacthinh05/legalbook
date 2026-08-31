import type { Category, LegalDocument, DocumentCategoryLink, DocumentType } from "@/types";

export interface FlattenedTreeNode {
  category: Category;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
}

export const VIRTUAL_DOC_TYPE_CONFIG: { type: DocumentType; label: string; order: number }[] = [
  { type: 'luat', label: 'Luật / Bộ luật', order: 1 },
  { type: 'nghi_dinh', label: 'Nghị định', order: 2 },
  { type: 'thong_tu', label: 'Thông tư', order: 3 },
  { type: 'quyet_dinh', label: 'Quyết định', order: 4 },
  { type: 'cong_van', label: 'Công văn hướng dẫn', order: 5 },
  { type: 'chuan_muc', label: 'Chuẩn mực (VAS / IFRS)', order: 6 },
  { type: 'huong_dan', label: 'Hướng dẫn nghiệp vụ', order: 7 },
  { type: 'khac', label: 'Khác / VBHN', order: 8 },
];

/**
 * Checks if a category already represents an explicitly typed leaf node
 * (e.g., 'Luật thuế GTGT', 'Nghị định BHXH', 'Thông tư kế toán')
 */
export function isExplicitTypedCategory(cat: Category): boolean {
  const slug = (cat.slug || '').toLowerCase();
  const name = (cat.name || '').toLowerCase();
  if (slug.endsWith('-luat') || name.startsWith('luật') || name.startsWith('bộ luật')) return true;
  if (slug.endsWith('-nghi-dinh') || name.startsWith('nghị định')) return true;
  if (slug.endsWith('-thong-tu') || name.startsWith('thông tư')) return true;
  if (slug.endsWith('-cong-van') || name.startsWith('công văn')) return true;
  if (slug.endsWith('-quyet-dinh') || name.startsWith('quyết định')) return true;
  if (slug.endsWith('-chuan-muc') || name.startsWith('chuẩn mực')) return true;
  return false;
}

/**
 * Dynamically injects smart subcategories by document type for leaf categories
 * that contain multiple documents or mixed document types (e.g. Hóa đơn, Quản lý thuế, Đầu tư).
 */
export function injectVirtualSubcategories(
  treeNodes: Category[],
  allDocuments: LegalDocument[] = [],
  links: DocumentCategoryLink[] = []
): Category[] {
  if (!treeNodes || treeNodes.length === 0) return [];
  if (!allDocuments || allDocuments.length === 0) return treeNodes;

  const docMap = new Map<string, LegalDocument>();
  allDocuments.forEach((d) => {
    if (d.id) docMap.set(d.id, d);
    if (d.document_number) docMap.set(d.document_number, d);
    if (d.slug) docMap.set(d.slug, d);
  });
  const cloneNodes = (nodes: Category[]): Category[] => {
    return nodes.map((node) => {
      const clonedNode: Category = { ...node, children: node.children ? cloneNodes(node.children) : [] };

      if (clonedNode.children && clonedNode.children.length > 0) {
        // Has explicit children, don't generate virtual children at this level
        return clonedNode;
      }

      // If it is ALREADY an explicitly typed category (e.g. 'Luật thuế GTGT', 'Nghị định BHXH'), keep as leaf
      if (isExplicitTypedCategory(clonedNode)) {
        return clonedNode;
      }

      // Find documents linked directly to this category
      const directLinks = links.filter((l) => l.category_id === clonedNode.id);
      const directDocs = directLinks.map((l) => docMap.get(l.document_id)).filter(Boolean) as LegalDocument[];

      const typeCounts = new Map<DocumentType, number>();
      directDocs.forEach((d) => {
        typeCounts.set(d.document_type, (typeCounts.get(d.document_type) || 0) + 1);
      });

      if (typeCounts.size > 0) {
        const virtualChildren: Category[] = [];
        VIRTUAL_DOC_TYPE_CONFIG.forEach((tc) => {
          const count = typeCounts.get(tc.type);
          if (count && count > 0) {
            virtualChildren.push({
              id: `${clonedNode.id}__type__${tc.type}`,
              parent_id: clonedNode.id,
              name: tc.label,
              slug: `${clonedNode.slug || 'cat'}-${tc.type}`,
              description: null,
              order_index: tc.order,
              icon: null,
              is_active: true,
              created_at: clonedNode.created_at || new Date().toISOString(),
              updated_at: clonedNode.updated_at || new Date().toISOString(),
              children: [],
            });
          }
        });

        if (virtualChildren.length > 0) {
          clonedNode.children = virtualChildren;
        }
      }

      return clonedNode;
    });
  };

  return cloneNodes(treeNodes);
}

/**
 * Finds all ancestor IDs for a given category ID by traversing up the parent links.
 */
export function getAncestorCategoryIds(categoryId: string, categories: Category[]): string[] {
  const ancestorIds: string[] = [];

  let targetId = categoryId;
  if (categoryId.includes('__type__')) {
    const [baseId] = categoryId.split('__type__');
    ancestorIds.push(baseId);
    targetId = baseId;
  }

  const map = new Map<string, Category>();

  function register(cats: Category[]) {
    cats.forEach((c) => {
      map.set(c.id, c);
      if (c.children && c.children.length > 0) {
        register(c.children);
      }
    });
  }
  register(categories);

  let current = map.get(targetId);
  while (current && current.parent_id) {
    if (!ancestorIds.includes(current.parent_id)) {
      ancestorIds.push(current.parent_id);
    }
    current = map.get(current.parent_id);
  }

  return ancestorIds;
}

/**
 * Flattens the visible tree nodes based on current expanded state.
 * Useful for keyboard navigation (ArrowUp, ArrowDown, Home, End).
 */
export function flattenVisibleTree(
  categories: Category[],
  expandedIds: Set<string>,
  depth: number = 0,
  parentId: string | null = null
): FlattenedTreeNode[] {
  const result: FlattenedTreeNode[] = [];

  for (const cat of categories) {
    const hasChildren = Boolean(cat.children && cat.children.length > 0);
    result.push({
      category: cat,
      depth,
      hasChildren,
      parentId,
    });

    if (hasChildren && expandedIds.has(cat.id) && cat.children) {
      result.push(...flattenVisibleTree(cat.children, expandedIds, depth + 1, cat.id));
    }
  }

  return result;
}

/**
 * Calculates standard compact indentation based on node depth (level).
 * Level 1 (Root, depth 0): 12px
 * Level 2 (depth 1): 28px
 * Level 3 (depth 2): 44px
 * Level 4+ (depth 3+): 52-56px max
 */
export function getTreeIndentation(depth: number): number {
  if (depth <= 0) return 12;
  if (depth === 1) return 28;
  if (depth === 2) return 44;
  return Math.min(56, 44 + (depth - 2) * 6);
}

/**
 * Formats a clean, non-redundant presentation label for child category nodes.
 * e.g. Under "Thuế TNCN", "Luật thuế TNCN" -> "Luật / Bộ luật", "Nghị định thuế TNCN" -> "Nghị định".
 * Does NOT mutate original database names.
 */
export function formatCategoryDisplayLabel(
  name: string,
  parentName?: string | null,
  depth = 0
): string {
  if (!name) return '';
  if (depth === 0 || !parentName) return name;

  const clean = name.trim();
  const lowerName = clean.toLowerCase();
  const lowerParent = parentName.toLowerCase().trim();

  // If child is a typed subcategory containing the parent theme
  if (
    (lowerName.startsWith('luật ') || lowerName.startsWith('bộ luật ')) &&
    (lowerName.includes(lowerParent) || lowerParent.includes(lowerName.replace(/^(luật|bộ luật)\s+/i, '')) || lowerParent.includes('thuế') || lowerParent.includes('kế toán') || lowerParent.includes('kiểm toán'))
  ) {
    return 'Luật / Bộ luật';
  }

  if (
    lowerName.startsWith('nghị định ') &&
    (lowerName.includes(lowerParent) || lowerParent.includes(lowerName.replace(/^nghị định\s+/i, '')) || lowerParent.includes('thuế') || lowerParent.includes('kế toán') || lowerParent.includes('kiểm toán'))
  ) {
    return 'Nghị định';
  }

  if (
    lowerName.startsWith('thông tư ') &&
    (lowerName.includes(lowerParent) || lowerParent.includes(lowerName.replace(/^thông tư\s+/i, '')) || lowerParent.includes('thuế') || lowerParent.includes('kế toán') || lowerParent.includes('kiểm toán'))
  ) {
    return 'Thông tư';
  }

  if (
    lowerName.startsWith('công văn ') &&
    (lowerName.includes(lowerParent) || lowerParent.includes(lowerName.replace(/^công văn(\s+hướng\s+dẫn)?\s+/i, '')) || lowerParent.includes('thuế') || lowerParent.includes('kế toán') || lowerParent.includes('kiểm toán'))
  ) {
    return 'Công văn hướng dẫn';
  }

  if (
    lowerName.startsWith('quyết định ') &&
    (lowerName.includes(lowerParent) || lowerParent.includes(lowerName.replace(/^quyết định\s+/i, '')) || lowerParent.includes('thuế') || lowerParent.includes('kế toán') || lowerParent.includes('kiểm toán'))
  ) {
    return 'Quyết định';
  }

  if (
    lowerName.startsWith('chuẩn mực ') &&
    (lowerName.includes(lowerParent) || lowerParent.includes(lowerName.replace(/^chuẩn mực\s+/i, '')) || lowerParent.includes('kế toán') || lowerParent.includes('kiểm toán'))
  ) {
    return 'Chuẩn mực';
  }

  return clean;
}
/**
 * Returns all descendant category IDs under a given parent category (including self).
 */
export function getDescendantCategoryIds(categoryId: string, categories: Category[]): string[] {
  if (categoryId.includes('__type__')) {
    return [categoryId];
  }

  const childMap = new Map<string, string[]>();

  function register(cats: Category[]) {
    for (const c of cats) {
      if (c.parent_id) {
        const list = childMap.get(c.parent_id) || [];
        list.push(c.id);
        childMap.set(c.parent_id, list);
      }
      if (c.children && c.children.length > 0) {
        register(c.children);
      }
    }
  }
  register(categories);

  const result: string[] = [categoryId];
  const queue: string[] = [categoryId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = childMap.get(curr);
    if (children) {
      for (const childId of children) {
        if (!result.includes(childId)) {
          result.push(childId);
          queue.push(childId);
        }
      }
    }
  }
  return result;
}

/**
 * Maps specific child category names or slugs to document types.
 * Allows type-specific child categories (e.g. Luật thuế GTGT) to resolve documents of that type.
 */
export function getCategoryDocumentType(category: Category): string | null {
  if (category.id.includes('__type__')) {
    return category.id.split('__type__')[1];
  }
  const slug = (category.slug || '').toLowerCase();
  const name = (category.name || '').toLowerCase();
  if (slug.endsWith('-luat') || name.startsWith('luật') || name.startsWith('bộ luật')) return 'luat';
  if (slug.endsWith('-nghi-dinh') || name.startsWith('nghị định')) return 'nghi_dinh';
  if (slug.endsWith('-thong-tu') || name.startsWith('thông tư')) return 'thong_tu';
  if (slug.endsWith('-cong-van') || name.startsWith('công văn')) return 'cong_van';
  if (slug.endsWith('-quyet-dinh') || name.startsWith('quyết định')) return 'quyet_dinh';
  if (slug.endsWith('-chuan-muc') || name.startsWith('chuẩn mực')) return 'chuan_muc';
  return null;
}

