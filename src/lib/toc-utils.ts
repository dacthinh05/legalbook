/**
 * toc-utils.ts
 * Table of Contents utilities for the legal document reader.
 *
 * Responsibilities:
 * - extractToc: parse HTML string → stable TocItem[]
 * - scrollToTocItem: scroll viewport to a specific TOC item
 * - createTocObserver: IntersectionObserver that tracks active TOC item while scrolling
 */

import type { TocItem } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Extract TOC from HTML
// ─────────────────────────────────────────────────────────────────────────────

/** Lines that are AI summary headings, not legal structure — must be filtered out */
const AI_HEADING_PATTERNS = [
  /^Tóm tắt/i,
  /^Điểm mới/i,
  /^Tác động/i,
  /^Hành động/i,
  /^\d+\.\s*(Tóm tắt|Điểm mới|Tác động|Hành động|Quy định chung|Các điểm)/i,
];

const isAiHeading = (line: string) => AI_HEADING_PATTERNS.some((p) => p.test(line));

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

  // Strip tags and split into lines
  const lines = htmlContent
    .replace(/<br\s*[/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split('\n')
    .map(normLine)
    .filter(Boolean);

  for (const line of lines) {
    if (line.length > 160 || isAiHeading(line)) continue;

    // Phần / Chương / Mục / Phụ lục
    const chapterMatch = line.match(
      /^(Phần\s+[IVXLCDM\d]+|Chương\s+[IVXLCDM\d]+|Mục\s+\d+|Phụ\s+lục\s*[\dIVX]*)[.:)\\s]*(.*)/i
    );
    if (chapterMatch) {
      const prefix = chapterMatch[1].trim();
      const suffix = (chapterMatch[2] || '').trim();
      const isAppendix = /^Phụ\s+lục/i.test(prefix);
      const isSection = /^Mục\s+/i.test(prefix);
      items.push({
        id: `toc-ch-${idx++}`,
        title: suffix ? `${prefix}. ${suffix}` : prefix,
        type: isAppendix ? 'appendix' : isSection ? 'section' : 'chapter',
        level: 0,
        anchorText: line.slice(0, 120),
      });
      continue;
    }

    // Điều X
    const articleMatch = line.match(/^(Điều\s+(\d+[a-z]?))[.:)\\s]*(.*)/i);
    if (articleMatch) {
      items.push({
        id: `toc-art-${idx++}`,
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
 * Find the best DOM element for a TocItem and scroll the viewport to it.
 */
export function scrollToTocItem(
  container: HTMLElement,
  item: TocItem,
  opts: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition } = {}
): HTMLElement | null {
  const { behavior = 'smooth', block = 'start' } = opts;

  const targetEl = findTocElement(container, item);
  if (targetEl) {
    // Find the scrollable viewport container (reader-viewport)
    const scrollParent = getScrollParent(targetEl) || getScrollParent(container);

    if (scrollParent && scrollParent !== document.documentElement && scrollParent !== document.body) {
      const containerRect = scrollParent.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();
      // Leave 72px clearance for the sticky reader toolbar
      const offsetTop = elRect.top - containerRect.top + scrollParent.scrollTop - 72;
      scrollParent.scrollTo({
        top: Math.max(0, offsetTop),
        behavior,
      });
    } else {
      targetEl.scrollIntoView({ behavior, block });
    }

    // Briefly highlight the target
    targetEl.classList.remove('toc-scroll-target');
    void targetEl.offsetWidth; // trigger reflow for smooth re-animation
    targetEl.classList.add('toc-scroll-target');
    setTimeout(() => targetEl.classList.remove('toc-scroll-target'), 2500);
  }
  return targetEl;
}

export function findTocElement(container: HTMLElement, item: TocItem): HTMLElement | null {
  if (!container || !item) return null;

  // 1. Direct ID lookups for Articles
  if (item.type === 'article' && item.articleNumber) {
    const num = item.articleNumber.toLowerCase().trim();
    const byId =
      container.querySelector(`#dieu-${num}`) ||
      container.querySelector(`#article-${num}`) ||
      container.querySelector(`[id^="dieu-${num}"]`) ||
      container.querySelector(`[data-article="${num}"]`);
    if (byId) return byId as HTMLElement;
  }

  // 2. Direct ID lookups for Chapters / Sections / Appendices
  if (item.type !== 'article') {
    const chapMatch = (item.title || item.anchorText).match(/^(Chương|Phần|Mục|Phụ\s+lục)\s+([IVXLCDM\d]+)/i);
    if (chapMatch) {
      const prefix = chapMatch[1].toLowerCase().replace(/\s+/g, '-');
      const num = chapMatch[2].toLowerCase().trim();
      const byId =
        container.querySelector(`#${prefix}-${num}`) ||
        container.querySelector(`[id^="${prefix}-${num}"]`);
      if (byId) return byId as HTMLElement;
    }
  }

  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, strong, b, p, div.legal-chapter-block, .legal-article-title, .legal-chapter-title, .legal-chapter-num'
    )
  );

  // 3. Regex match for Articles: "Điều X."
  if (item.type === 'article' && item.articleNumber) {
    const pattern = new RegExp(`^\\s*Điều\\s+${item.articleNumber}[.:\\s]`, 'i');
    for (const el of candidates) {
      if (pattern.test(el.textContent || '')) {
        return el;
      }
    }
  }

  // 4. Regex match for Chapters / Sections / Appendices
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

  // 5. Exact text or starts-with match
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

export function getScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll' || parent.classList.contains('reader-viewport')) {
      return parent;
    }
    parent = parent.parentElement;
  }
  const viewport = el.closest('.reader-viewport') as HTMLElement | null;
  if (viewport) return viewport;
  return document.querySelector('.reader-viewport') as HTMLElement | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// IntersectionObserver — active TOC tracking
// ─────────────────────────────────────────────────────────────────────────────

export interface TocObserverOptions {
  container: HTMLElement;         // the scrollable viewport
  contentEl: HTMLElement;         // the element containing document text
  tocItems: TocItem[];
  onActiveChange: (id: string | null) => void;
}

/**
 * Creates an IntersectionObserver that watches TOC anchor elements and fires
 * `onActiveChange` with the id of the topmost visible TocItem.
 *
 * Returns a cleanup function to disconnect the observer.
 */
export function createTocObserver({
  container,
  contentEl,
  tocItems,
  onActiveChange,
}: TocObserverOptions): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};

  // Map: element → tocItem id
  const elToId = new Map<Element, string>();
  const visibleSet = new Set<string>();

  // Find the DOM element for each TocItem and register it
  for (const item of tocItems) {
    const el = findTocElement(contentEl, item);
    if (el) elToId.set(el, item.id);
  }

  const pickActive = () => {
    if (visibleSet.size === 0) {
      onActiveChange(null);
      return;
    }
    // Among visible items, pick the one that appears first in tocItems order
    const ordered = tocItems.filter((t) => visibleSet.has(t.id));
    onActiveChange(ordered[0]?.id ?? null);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const id = elToId.get(entry.target);
        if (!id) continue;
        if (entry.isIntersecting) {
          visibleSet.add(id);
        } else {
          visibleSet.delete(id);
        }
      }
      pickActive();
    },
    {
      root: container,
      // Fire when heading enters top 30% of viewport
      rootMargin: '-8px 0px -70% 0px',
      threshold: 0,
    }
  );

  elToId.forEach((_, el) => observer.observe(el));

  return () => observer.disconnect();
}
