/**
 * toc-utils.ts
 *
 * Table of Contents extractor, DOM locator, smooth container scroll engine,
 * and IntersectionObserver-based reading position tracker.
 */

import type { TocItem } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Extract TOC from HTML
// ─────────────────────────────────────────────────────────────────────────────

/** Lines that are AI summary headings, not legal structure — must be filtered out */
const AI_HEADING_PATTERNS = [
  /tóm tắt/i,
  /điểm mới cốt lõi/i,
  /tác động đến/i,
  /lộ trình áp dụng/i,
  /nghĩa vụ tuân thủ/i,
  /hành động cần thực hiện/i,
  /cảnh báo rủi ro/i,
  /đối tượng áp dụng/i,
  /hiệu lực thi hành/i,
];
const isAiHeading = (line: string) => {
  // If line begins with genuine legal heading markers (Điều, Chương, Phần, Mục, Phụ lục), never filter it out
  if (/^(?:Điều\s+\d+|Chương\s+[IVXLCDM\d]+|Phần\s+[IVXLCDM\d]+|Mục\s+\d+|Phụ\s+lục\s*[\dIVX\-a-zA-Z\/]*)/i.test(line)) {
    return false;
  }
  return AI_HEADING_PATTERNS.some((p) => p.test(line));
};
/**
 * Normalise a line of text: trim and collapse internal whitespace.
 */
const normLine = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Extract TOC items from a raw HTML string.
 * Only extracts genuine legal structure: Phần, Chương, Mục, Phụ lục, Điều.
 * Never uses AI summary headings.
 */
export function extractToc(htmlContent: string | null | undefined): TocItem[] {
  if (!htmlContent) return [];

  const items: TocItem[] = [];
  let idx = 0;

  // Strip block tags and split into lines cleanly
  const lines = htmlContent
    .replace(/<(?:p|div|h[1-6]|section|article|br)[^>]*>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map(normLine)
    .filter(Boolean);

  for (const line of lines) {
    if (line.length > 160 || isAiHeading(line)) continue;

    // Phần / Chương / Mục / Phụ lục
    const chapterMatch = line.match(
      /^(Phần\s+(?:thứ\s+[a-zđ]+|[IVXLCDM]+|\d+)\b|Chương\s+(?:[IVXLCDM]+|\d+)\b|Mục\s+\d+\b|Phụ\s+lục\s*[\dIVX\-a-zA-Z\/]*)(?:[.:)\s]+(.*)|$)/i
    );
    if (chapterMatch) {
      const prefix = chapterMatch[1].trim();
      const suffix = (chapterMatch[2] || '').trim();
      const isAppendix = /^Phụ\s+lục/i.test(prefix);
      const isSection = /^Mục\s+/i.test(prefix);
      const isPart = /^Phần\s+/i.test(prefix);

      const prefixMatch = prefix.match(/^([^\s]+)\s+([\dIVX\-a-zA-Z\/]+)/i);
      let targetId = `chuong-${idx}`;
      if (prefixMatch) {
        const typeKey = isAppendix ? 'phu-luc' : isSection ? 'muc' : isPart ? 'phan' : 'chuong';
        const numKey = prefixMatch[2].toLowerCase().replace(/\s+/g, '-').replace(/đ/g, 'd');
        targetId = `${typeKey}-${numKey}`;
      }

      items.push({
        id: `toc-ch-${idx++}`,
        targetId,
        title: suffix ? `${prefix}. ${suffix}` : prefix,
        type: isAppendix ? 'appendix' : isSection ? 'section' : 'chapter',
        level: 0,
        anchorText: line.slice(0, 120),
      });
      continue;
    }

    // Điều X
    const articleMatch = line.match(/^(Điều\s+(\d+[a-z]?))[.:)\s]*(.*)/i);
    if (articleMatch) {
      const artNum = articleMatch[2].toLowerCase();
      items.push({
        id: `toc-art-${idx++}`,
        targetId: `dieu-${artNum}`,
        title: line.slice(0, 120),
        type: 'article',
        level: 1,
        articleNumber: articleMatch[2],
        anchorText: line.slice(0, 120),
      });
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scroll viewport to a TOC item
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finds the best DOM element for a TocItem and smoothly scrolls the document scroll container to it.
 */
export function scrollToTocItem(
  container: HTMLElement,
  item: TocItem,
  opts: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition; stickyOffset?: number } = {}
): HTMLElement | null {
  const { behavior = 'smooth', stickyOffset = 72 } = opts;
  const targetEl = findTocElement(container, item);
  if (!targetEl) return null;

  // Find the actual scrollable viewport container (.reader-viewport)
  const docObj = targetEl.ownerDocument || (typeof document !== 'undefined' ? document : null);
  let viewport = getScrollParent(targetEl) || getScrollParent(container);
  if (!viewport || (docObj && (viewport === docObj.body || viewport === docObj.documentElement))) {
    viewport = docObj?.querySelector('.reader-viewport') as HTMLElement | null;
  }

  if (viewport && typeof (viewport as HTMLElement).scrollTo === 'function') {
    const containerRect = viewport.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const nextTop = viewport.scrollTop + (targetRect.top - containerRect.top) - stickyOffset;

    viewport.scrollTo({
      top: Math.max(0, nextTop),
      behavior,
    });
  } else if (typeof targetEl.scrollIntoView === 'function') {
    targetEl.scrollIntoView({ behavior, block: 'start' });
  }
  // Flash highlight animation on target heading
  targetEl.classList.remove('is-navigation-target', 'toc-scroll-target');
  void targetEl.offsetWidth; // trigger reflow for smooth re-animation
  targetEl.classList.add('is-navigation-target', 'toc-scroll-target');
  setTimeout(() => {
    targetEl.classList.remove('is-navigation-target', 'toc-scroll-target');
  }, 1500);

  return targetEl;
}

/**
 * Finds the target DOM element for a TocItem in the document DOM.
 */
export function findTocElement(container: HTMLElement, item: TocItem): HTMLElement | null {
  if (!container || !item) return null;
  const docObj = container.ownerDocument || (typeof document !== 'undefined' ? document : null);

  // 1. Direct lookup by targetId if present
  if (item.targetId) {
    const byTargetId =
      container.querySelector(`#${item.targetId}`) ||
      docObj?.getElementById(item.targetId);
    if (byTargetId) return byTargetId as HTMLElement;
  }

  // 2. Direct ID lookups for Articles
  if (item.type === 'article' && item.articleNumber) {
    const num = item.articleNumber.toLowerCase().trim();
    const byId =
      container.querySelector(`#dieu-${num}`) ||
      container.querySelector(`#dieu_${num}`) ||
      container.querySelector(`#article-${num}`) ||
      container.querySelector(`[id^="dieu-${num}"]`) ||
      container.querySelector(`[data-article="${num}"]`) ||
      docObj?.getElementById(`dieu-${num}`) ||
      docObj?.getElementById(`dieu_${num}`);
    if (byId) return byId as HTMLElement;
  }

  // 3. Direct ID lookups for Chapters / Sections / Appendices
  if (item.type !== 'article') {
    const chapMatch = (item.title || item.anchorText).match(/^(Chương|Phần|Mục|Phụ\s+lục)\s+([IVXLCDM\d]+)/i);
    if (chapMatch) {
      const prefix = chapMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/đ/g, 'd');
      const num = chapMatch[2].toLowerCase().trim();
      const byId =
        container.querySelector(`#${prefix}-${num}`) ||
        container.querySelector(`[id^="${prefix}-${num}"]`) ||
        docObj?.getElementById(`${prefix}-${num}`);
      if (byId) return byId as HTMLElement;
    }
  }

  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, strong, b, p, div.legal-chapter-block, .legal-article-title, .legal-chapter-title, .legal-chapter-num'
    )
  );

  // 4. Regex match for Articles: "Điều X."
  if (item.type === 'article' && item.articleNumber) {
    const pattern = new RegExp(`^\\s*Điều\\s+${item.articleNumber}[.:\\s]`, 'i');
    for (const el of candidates) {
      if (pattern.test(el.textContent || '')) {
        return el;
      }
    }
  }

  // 5. Regex match for Chapters / Sections / Appendices
  if (item.type !== 'article') {
    const chapMatch = (item.title || item.anchorText).match(/^(Chương|Phần|Mục|Phụ\s+lục)\s+([IVXLCDM\d]+)/i);
    if (chapMatch) {
      const chapPrefix = new RegExp(`^\\s*${chapMatch[1]}\\s+${chapMatch[2]}\\b`, 'i');
      for (const el of candidates) {
        if (chapPrefix.test(el.textContent || '')) {
          return el;
        }
      }
    }
  }

  // 6. Exact text or starts-with match
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const anchorNorm = normalize(item.anchorText || item.title);

  for (const el of candidates) {
    const text = normalize(el.textContent || '');
    if (text === anchorNorm || (anchorNorm.length >= 10 && text.startsWith(anchorNorm.slice(0, 30)))) {
      return el;
    }
  }

  return null;
}

/**
 * Resolves the parent scrollable container element.
 */
export function getScrollParent(el: HTMLElement): HTMLElement | null {
  const docObj = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const winObj = (docObj && docObj.defaultView) || (typeof window !== 'undefined' ? window : null);

  let parent = el.parentElement;
  while (parent && docObj && parent !== docObj.body && parent !== docObj.documentElement) {
    const style = winObj ? winObj.getComputedStyle(parent) : null;
    const overflowY = style ? style.overflowY : '';
    if (overflowY === 'auto' || overflowY === 'scroll' || parent.classList.contains('reader-viewport')) {
      return parent;
    }
    parent = parent.parentElement;
  }
  const viewport = el.closest ? (el.closest('.reader-viewport') as HTMLElement | null) : null;
  if (viewport) return viewport;
  return docObj?.querySelector('.reader-viewport') as HTMLElement | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IntersectionObserver — active TOC tracking
// ─────────────────────────────────────────────────────────────────────────────

export interface TocObserverOptions {
  container: HTMLElement; // the scrollable viewport (.reader-viewport)
  contentEl: HTMLElement; // the element containing document text
  tocItems: TocItem[];
  onActiveChange: (id: string | null) => void;
}

/**
 * Creates an IntersectionObserver that watches TOC anchor elements and fires
 * `onActiveChange` with the id of the currently read provision.
 */
export function createTocObserver({
  container,
  contentEl,
  tocItems,
  onActiveChange,
}: TocObserverOptions): () => void {
  const winObj = (container.ownerDocument && container.ownerDocument.defaultView) || (typeof window !== 'undefined' ? window : null);
  const ObserverClass = (winObj && winObj.IntersectionObserver) || (typeof IntersectionObserver !== 'undefined' ? IntersectionObserver : null);

  if (!ObserverClass || !container || !contentEl) return () => {};

  // Map: element → tocItem id & TocItem
  const elToId = new Map<Element, string>();
  const idToEl = new Map<string, Element>();

  for (const item of tocItems) {
    const el = findTocElement(contentEl, item);
    if (el) {
      elToId.set(el, item.id);
      idToEl.set(item.id, el);
    }
  }

  const visibleItems = new Set<string>();

  const pickActive = () => {
    // When at the very top of document, clear active or pick first item if visible
    if (container.scrollTop < 50) {
      if (visibleItems.has(tocItems[0]?.id)) {
        onActiveChange(tocItems[0].id);
      } else {
        onActiveChange(null);
      }
      return;
    }

    if (visibleItems.size > 0) {
      // Pick the item closest to top of viewport
      let bestId: string | null = null;
      let minDistance = Infinity;
      const containerRect = container.getBoundingClientRect();

      for (const id of visibleItems) {
        const el = idToEl.get(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top - containerRect.top);
          if (dist < minDistance) {
            minDistance = dist;
            bestId = id;
          }
        }
      }
      if (bestId) {
        onActiveChange(bestId);
        return;
      }
    }

    // Fallback when scrolling between long provisions: find last provision above the viewport top
    const containerRect = container.getBoundingClientRect();
    let lastAboveId: string | null = null;

    for (const item of tocItems) {
      const el = idToEl.get(item.id);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= containerRect.top + 100) {
          lastAboveId = item.id;
        } else {
          break;
        }
      }
    }

    onActiveChange(lastAboveId);
  };

  const observer = new ObserverClass(
    (entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        const id = elToId.get(entry.target);
        if (!id) continue;
        if (entry.isIntersecting) {
          visibleItems.add(id);
        } else {
          visibleItems.delete(id);
        }
      }
      pickActive();
    },
    {
      root: container,
      rootMargin: '-8% 0px -75% 0px',
      threshold: [0, 0.25],
    }
  );

  elToId.forEach((_, el) => observer.observe(el));

  // Also listen to scroll end for fast manual flick scrolls
  const handleScroll = () => {
    pickActive();
  };
  container.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    observer.disconnect();
    container.removeEventListener('scroll', handleScroll);
  };
}
