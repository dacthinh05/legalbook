/**
 * Navigation History & Multi-Hop Breadcrumb Trail Engine
 * 
 * Manages atomic synchronization between:
 * 1. Active Legal Document selection
 * 2. In-app Quick Return Trail (A -> B -> C -> Back B -> Back A)
 * 3. HTML5 Browser History API (pushState & popstate)
 */

import type { LegalDocument } from '@/types';

export interface NavigationHistoryItem {
  docId: string;
  docNumber?: string;
  title: string;
  targetNodeId?: string;
  tab?: 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';
}

export interface NavigationStatePayload {
  docId: string;
  navTarget?: {
    targetNodeId?: string;
    locationLabel?: string;
    query?: string;
    tab?: 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';
  } | null;
  historyTrail: NavigationHistoryItem[];
}

export interface NavigationTransitionResult {
  nextDocId: string;
  nextSearchTarget: {
    targetNodeId?: string;
    locationLabel?: string;
    query?: string;
    tab?: 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';
  } | null;
  nextTrail: NavigationHistoryItem[];
}

/**
 * Computes next navigation trail when user selects/navigates to a new document
 */
export function computeNextNavigationTrail(
  currentDocId: string | null,
  targetDocId: string,
  allDocs: LegalDocument[],
  currentTrail: NavigationHistoryItem[],
  currentHash?: string
): NavigationHistoryItem[] {
  if (!currentDocId || currentDocId === targetDocId) {
    return currentTrail;
  }

  const prevDoc = allDocs.find(
    (d) => d.id === currentDocId || d.document_number === currentDocId
  );

  const cleanHash = currentHash?.replace(/^#/, '');

  const newItem: NavigationHistoryItem = {
    docId: currentDocId,
    docNumber: prevDoc?.document_number || undefined,
    title: prevDoc?.title || 'Văn bản trước',
    targetNodeId: cleanHash || undefined,
  };

  // Keep up to 15 history steps
  return [...currentTrail.slice(-14), newItem];
}

/**
 * Handles popstate transition restoring doc, search target, and trail atomically
 */
export function handlePopStateTransition(
  state: Partial<NavigationStatePayload> | null | undefined,
  urlSearch: string,
  urlHash: string
): NavigationTransitionResult | null {
  const params = new URLSearchParams(urlSearch);
  const urlDoc = params.get('doc');
  const cleanHash = urlHash ? urlHash.replace(/^#/, '') : undefined;

  // 1. If state object has explicit docId & historyTrail
  if (state && state.docId) {
    return {
      nextDocId: state.docId,
      nextSearchTarget: state.navTarget || (cleanHash ? { targetNodeId: cleanHash } : null),
      nextTrail: Array.isArray(state.historyTrail) ? state.historyTrail : [],
    };
  }

  // 2. If state is empty but URL has ?doc=... (e.g. initial direct link or external bookmark)
  if (urlDoc) {
    return {
      nextDocId: urlDoc,
      nextSearchTarget: cleanHash ? { targetNodeId: cleanHash } : null,
      nextTrail: [],
    };
  }

  return null;
}

/**
 * Formats a clean human-readable label for the Quick Return button
 */
export function formatQuickBackLabel(item?: NavigationHistoryItem | null): string {
  if (!item) return '';
  if (item.docNumber) return item.docNumber;
  if (item.title) {
    return item.title.length > 28 ? `${item.title.slice(0, 25)}...` : item.title;
  }
  return 'Văn bản trước';
}
