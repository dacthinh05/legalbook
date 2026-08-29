/**
 * provision-resolver.ts
 * 
 * Stable Provision Identity, Triple Context Anchor Matching,
 * and Non-Destructive DOM Effect Overlay Engine for LegalBook.
 */

import type { DocumentProvision, ProvisionAnchor, LegalEffect, LegalEffectType } from '@/types';

export const LEGAL_EFFECT_MARK_ATTR = 'data-legal-effect-id';
export const LEGAL_EFFECT_CLASS = 'legal-effect-mark';

/**
 * Strips HTML into clean text.
 */
function cleanText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates simple SHA-like 32-bit checksum hash string for text content.
 */
export function computeContentHash(text: string): string {
  let hash = 0;
  const str = text.trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Normalizes document number for stable keys.
 * e.g. "132/2020/NĐ-CP" -> "132_2020_nd_cp"
 */
function normalizeDocSlug(docNumber: string): string {
  if (!docNumber) return 'doc';
  return docNumber
    .replace(/[đĐ]/g, (m) => (m === 'đ' ? 'd' : 'D'))
    .toLowerCase()
    .replace(/[^\w\d]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
/**
 * Extracts and decomposes legal HTML into semantic DocumentProvisions with immutable stable keys.
 */
export function extractDocumentProvisions(
  documentId: string,
  documentNumber: string,
  htmlContent: string
): DocumentProvision[] {
  if (!htmlContent) return [];

  const docSlug = normalizeDocSlug(documentNumber);
  const provisions: DocumentProvision[] = [];

  // Match Article headings: <h2>Điều 1...</h2> or <p><strong>Điều 1...</strong></p>
  const articleRegex = /(?:<h[1-6][^>]*>|<p[^>]*>\s*<strong>|<strong>|<p[^>]*>)\s*((?:Điều|Chương|Phần|Mục|Phụ lục)\s+[\dIVXLCDM\w\.\-]+[^<\n]{0,120})/gi;
  const matches: Array<{ index: number; fullHeading: string; label: string }> = [];
  let match;

  while ((match = articleRegex.exec(htmlContent)) !== null) {
    const rawHeading = match[1] || '';
    const fullHeading = rawHeading.replace(/<[^>]*>/g, '').trim();
    const label = fullHeading.replace(/[\.:].*$/, '').trim();
    if (label && label.length > 2) {
      matches.push({
        index: match.index,
        fullHeading,
        label,
      });
    }
  }

  let currentChapter = '';
  let chapterIndex = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const nextIndex = i + 1 < matches.length ? matches[i + 1].index : htmlContent.length;
    const sectionHtml = htmlContent.slice(m.index, nextIndex);
    const contentText = cleanText(sectionHtml);
    const contentHash = computeContentHash(contentText);

    const isChapter = /Chương\s+[IVXLCDM\d]+/i.test(m.label);
    const isArticle = /Điều\s+\d+[a-z]?/i.test(m.label);
    const isAppendix = /Phụ\s+lục/i.test(m.label);

    let provType: DocumentProvision['provisionType'] = 'section';
    let stableKey = '';
    let normalizedPath = '';

    if (isChapter) {
      provType = 'chapter';
      const chMatch = m.label.match(/Chương\s+([IVXLCDM\d]+)/i);
      const chNum = chMatch ? chMatch[1].toLowerCase() : `${chapterIndex++}`;
      currentChapter = `ch_${chNum}`;
      stableKey = `${docSlug}/${currentChapter}`;
      normalizedPath = `chuong_${chNum}`;
    } else if (isArticle) {
      provType = 'article';
      const artMatch = m.label.match(/Điều\s+(\d+[a-z]?)/i);
      const artNum = artMatch ? artMatch[1].toLowerCase() : `${i}`;
      const pathPrefix = currentChapter ? `${currentChapter}/` : '';
      stableKey = `${docSlug}/${pathPrefix}art_${artNum}`;
      normalizedPath = `${currentChapter ? `${currentChapter}/` : ''}dieu_${artNum}`;
    } else if (isAppendix) {
      provType = 'appendix';
      stableKey = `${docSlug}/appendix_${i}`;
      normalizedPath = `phu_luc_${i}`;
    } else {
      stableKey = `${docSlug}/sec_${i}`;
      normalizedPath = `muc_${i}`;
    }

    const provId = `prov-${documentId.slice(0, 8)}-${stableKey.replace(/\//g, '_')}`;

    provisions.push({
      id: provId,
      documentId,
      provisionType: provType,
      numberLabel: m.label,
      headingTitle: m.fullHeading,
      normalizedPath,
      stableKey,
      orderIndex: i + 1,
      contentText,
      contentHash,
    });
  }

  return provisions;
}

/**
 * Escapes regex characters.
 */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolves exact DOM Range for a given ProvisionAnchor using Triple Context Matching.
 */
export function resolveProvisionAnchor(
  container: HTMLElement,
  anchor: ProvisionAnchor
): Range | null {
  if (!anchor.exactText || !anchor.exactText.trim()) return null;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  let fullText = '';
  const offsets: { node: Text; start: number }[] = [];
  for (const tn of textNodes) {
    offsets.push({ node: tn, start: fullText.length });
    fullText += tn.nodeValue || '';
  }

  const targetText = anchor.exactText.trim();

  // 1. Direct exact match
  let exactStart = fullText.indexOf(targetText);
  if (exactStart !== -1) {
    return buildRange(offsets, exactStart, exactStart + targetText.length);
  }

  // 2. Case-insensitive match
  exactStart = fullText.toLowerCase().indexOf(targetText.toLowerCase());
  if (exactStart !== -1) {
    return buildRange(offsets, exactStart, exactStart + targetText.length);
  }

  // 3. Triplet Prefix + Exact + Suffix search
  if (anchor.prefixText || anchor.suffixText) {
    const escapedPrefix = anchor.prefixText ? escapeRegex(anchor.prefixText.trim()).replace(/\s+/g, '\\s+') : '';
    const escapedTarget = escapeRegex(targetText).replace(/\s+/g, '\\s+');
    const escapedSuffix = anchor.suffixText ? escapeRegex(anchor.suffixText.trim()).replace(/\s+/g, '\\s+') : '';

    try {
      const pattern = `${escapedPrefix}\\s*(${escapedTarget})\\s*${escapedSuffix}`;
      const regex = new RegExp(pattern, 'i');
      const match = fullText.match(regex);
      if (match && match.index !== undefined) {
        // Adjust for prefix length
        const prefixOffset = match[0].indexOf(match[1]);
        const start = match.index + prefixOffset;
        const end = start + match[1].length;
        return buildRange(offsets, start, end);
      }
    } catch {}
  }

  // 4. Whitespace-tolerant regex search
  try {
    const loosePattern = escapeRegex(targetText).replace(/\s+/g, '\\s+');
    const looseRegex = new RegExp(loosePattern, 'i');
    const match = fullText.match(looseRegex);
    if (match && match.index !== undefined) {
      return buildRange(offsets, match.index, match.index + match[0].length);
    }
  } catch {}

  return null;
}

function buildRange(
  offsets: { node: Text; start: number }[],
  start: number,
  end: number
): Range | null {
  try {
    const range = document.createRange();
    let startSet = false;
    for (let i = 0; i < offsets.length; i++) {
      const { node, start: nodeStart } = offsets[i];
      const nodeEnd = nodeStart + (node.nodeValue?.length ?? 0);

      if (!startSet && start >= nodeStart && start < nodeEnd) {
        range.setStart(node, start - nodeStart);
        startSet = true;
      }
      if (startSet && end >= nodeStart && end <= nodeEnd) {
        range.setEnd(node, end - nodeStart);
        return range;
      }
    }
  } catch {}
  return null;
}

/**
 * Returns distinct styling classes according to the legal effect category & type.
 */
export function getEffectVisualClass(effectType: LegalEffectType, reviewStatus: string = 'verified'): string {
  const isPending = reviewStatus !== 'verified';
  const pendingModifier = isPending ? 'border-dashed opacity-85' : '';

  switch (effectType) {
    case 'amends':
    case 'replaces':
    case 'repeals':
    case 'partially_repeals':
    case 'suspends':
      return `legal-effect-amends bg-rose-100/90 text-rose-950 border-b-2 border-rose-500 hover:bg-rose-200/90 ${pendingModifier}`;
    case 'supplements':
    case 'extends':
      return `legal-effect-supplements bg-purple-100/90 text-purple-950 border-b-2 border-purple-500 hover:bg-purple-200/90 ${pendingModifier}`;
    case 'corrects':
      return `legal-effect-corrects bg-emerald-100/90 text-emerald-950 border-b-2 border-emerald-500 hover:bg-emerald-200/90 ${pendingModifier}`;
    case 'guides':
    case 'implements':
    case 'references':
    default:
      return `legal-effect-guides bg-sky-50 text-sky-950 border-b-2 border-dashed border-sky-500 hover:bg-sky-100/90 ${pendingModifier}`;
  }
}

/**
 * Non-destructively applies LegalEffect overlays into the DOM container.
 */
export function applyLegalEffectOverlay(
  container: HTMLElement,
  effects: LegalEffect[]
): { appliedCount: number; orphanedCount: number } {
  removeLegalEffectOverlay(container);

  let appliedCount = 0;
  let orphanedCount = 0;

  for (const effect of effects) {
    if (!effect.anchor) continue;

    const range = resolveProvisionAnchor(container, effect.anchor);
    if (!range) {
      orphanedCount++;
      continue;
    }

    try {
      const visualClass = getEffectVisualClass(effect.effectType, effect.reviewStatus);
      const mark = document.createElement('mark');
      mark.setAttribute(LEGAL_EFFECT_MARK_ATTR, effect.id);
      mark.className = `${LEGAL_EFFECT_CLASS} ${visualClass} cursor-pointer rounded-xs px-0.5 transition-all`;
      mark.setAttribute(
        'title',
        `${effect.legalCitation} — Nhấn để xem chi tiết tác động pháp lý`
      );

      if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        const fragment = range.extractContents();
        mark.appendChild(fragment);
        range.insertNode(mark);
        appliedCount++;
      } else {
        // Multi-node safe wrapping
        const textNodes: Text[] = [];
        const walker = document.createTreeWalker(
          range.commonAncestorContainer,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => (range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
          }
        );
        let node: Node | null;
        while ((node = walker.nextNode())) {
          textNodes.push(node as Text);
        }

        for (const textNode of textNodes) {
          const nodeRange = document.createRange();
          const isStart = textNode === range.startContainer;
          const isEnd = textNode === range.endContainer;
          const startOffset = isStart ? range.startOffset : 0;
          const endOffset = isEnd ? range.endOffset : (textNode.nodeValue?.length ?? 0);

          if (startOffset < endOffset) {
            nodeRange.setStart(textNode, startOffset);
            nodeRange.setEnd(textNode, endOffset);
            const m = mark.cloneNode(false) as HTMLElement;
            const fragment = nodeRange.extractContents();
            m.appendChild(fragment);
            nodeRange.insertNode(m);
          }
        }
        appliedCount++;
      }
    } catch {
      orphanedCount++;
    }
  }

  return { appliedCount, orphanedCount };
}

/**
 * Idempotently removes all legal effect marks, restoring raw DOM.
 */
export function removeLegalEffectOverlay(container: HTMLElement) {
  const marks = container.querySelectorAll(`[${LEGAL_EFFECT_MARK_ATTR}]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  });
}
