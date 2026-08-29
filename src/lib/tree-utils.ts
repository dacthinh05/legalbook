import type { Category } from "@/types";

export interface FlattenedTreeNode {
  category: Category;
  depth: number;
  hasChildren: boolean;
  parentId: string | null;
}

/**
 * Finds all ancestor IDs for a given category ID by traversing up the parent links.
 */
export function getAncestorCategoryIds(categoryId: string, categories: Category[]): string[] {
  const ancestorIds: string[] = [];
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

  let current = map.get(categoryId);
  while (current && current.parent_id) {
    ancestorIds.push(current.parent_id);
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
 * Calculates standard indentation based on node depth (level).
 * Base: 12px, Step: 20px
 * Level 0: 12px
 * Level 1: 32px
 * Level 2: 52px
 * Level 3: 72px
 */
export function getTreeIndentation(depth: number): number {
  return 12 + depth * 20;
}

/**
 * Returns all descendant category IDs under a given parent category (including self).
 */
export function getDescendantCategoryIds(categoryId: string, categories: Category[]): string[] {
  const ids: string[] = [categoryId];
  function collect(cats: Category[]) {
    for (const c of cats) {
      if (c.parent_id && ids.includes(c.parent_id)) {
        if (!ids.includes(c.id)) ids.push(c.id);
      }
      if (c.children && c.children.length > 0) {
        collect(c.children);
      }
    }
  }
  collect(categories);
  return ids;
}

/**
 * Maps specific child category names or slugs to document types.
 * Allows type-specific child categories (e.g. Luật thuế GTGT) to resolve documents of that type.
 */
export function getCategoryDocumentType(category: Category): string | null {
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

