/**
 * count-utils.ts
 *
 * Client-side utility for computing category document counts that are
 * consistent with the data source used by DocumentList and TopicOverview.
 *
 * Rule:
 *   Sidebar count for the active category = documents.length (exact, from same source).
 *   Non-active categories: no badge shown (avoids stale embedded-data counts).
 */

import type { Category } from '@/types';

/**
 * Returns all descendant category IDs for a given category (inclusive).
 */
export function getDescendantIds(categoryId: string, allCategories: Category[]): Set<string> {
  const result = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const cat of allCategories) {
      if (cat.parent_id && result.has(cat.parent_id) && !result.has(cat.id)) {
        result.add(cat.id);
        changed = true;
      }
    }
  }
  return result;
}

/**
 * Returns whether a given category is an ancestor of the target category.
 */
export function isAncestorOf(
  potentialAncestorId: string,
  targetCategoryId: string,
  allCategories: Category[]
): boolean {
  const descendants = getDescendantIds(potentialAncestorId, allCategories);
  return descendants.has(targetCategoryId) && potentialAncestorId !== targetCategoryId;
}
