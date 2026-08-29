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
 *
 * Search strategy (in order):
 * 1. Exact text match on heading-like elements (strong, h2, h3, p)
 * 2. Partial match for "Điều X" patterns
 */
export function scrollToTocItem(
  container: HTMLElement,
  item: TocItem,
  opts: { behavior?: ScrollBehavior; block?: ScrollLogicalPosition } = {}
): HTMLElement | null {
  const { behavior = 'smooth', block = 'start' } = opts;

  const targetEl = findTocElement(container, item);
  if (targetEl) {
    // Scroll the container scroll-parent, not the page
    const scrollParent = getScrollParent(container);
    if (scrollParent && scrollParent !== document.documentElement) {
      const containerRect = scrollParent.getBoundingClientRect();
      const elRect = targetEl.getBoundingClientRect();
      const offset = elRect.top - containerRect.top + scrollParent.scrollTop - 72; // 72px toolbar clearance
      scrollParent.scrollTo({ top: Math.max(0, offset), behavior });
    } else {
      targetEl.scrollIntoView({ behavior, block });
    }

    // Briefly highlight the target
    targetEl.classList.add('toc-scroll-target');
    setTimeout(() => targetEl.classList.remove('toc-scroll-target'), 2000);
  }
  return targetEl;
}

function findTocElement(container: HTMLElement, item: TocItem): HTMLElement | null {
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>('strong, b, h1, h2, h3, h4, p, div')
  );

  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const anchorNorm = normalize(item.anchorText);

  // 1. Exact or starts-with match
  for (const el of candidates) {
    const text = normalize(el.textContent || '');
    if (text === anchorNorm || anchorNorm.startsWith(text.slice(0, 20))) {
      // Avoid containers that hold many children (likely a wrapper div)
      if (el.children.length < 4) return el;
    }
  }

  // 2. For articles: match "Điều X" prefix
  if (item.type === 'article' && item.articleNumber) {
    const pattern = new RegExp(`^\\s*Điều\\s+${item.articleNumber}\\b`, 'i');
    for (const el of candidates) {
      if (pattern.test(el.textContent || '')) {
        if (el.children.length < 4) return el;
      }
    }
  }

  // 3. For chapters: match the chapter label prefix
  if (item.type !== 'article') {
    const titleWords = item.anchorText.split(/\s+/).slice(0, 3).join('\\s+');
    const chapPattern = new RegExp(`^\\s*${titleWords}`, 'i');
    for (const el of candidates) {
      if (chapPattern.test(el.textContent || '')) {
        if (el.children.length < 4) return el;
      }
    }
  }

  return null;
}

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (/auto|scroll/.test(style.overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
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
