/**
 * annotation-engine.ts
 * Client-side annotation overlay engine for the legal document reader.
 *
 * Principles:
 * - NEVER modifies the original HTML string or normalizedContent
 * - Applies annotations as a DOM overlay layer AFTER content is rendered
 * - Uses text-anchor matching (exactText + prefix/suffix) for resilience
 * - Separates search highlights from user annotations
 * - XSS-sanitizes all user-supplied note content via DOMPurify
 */

import DOMPurify from 'dompurify';
import type { DocumentAnnotation, AnnotationAnchor, AnnotationAnchorStatus, AnnotationColor } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ANNOTATION_MARK_ATTR = 'data-annotation-id';
export const ANNOTATION_MARK_CLASS = 'reader-annotation-mark';
export const ANNOTATION_NOTE_MARKER_CLASS = 'reader-note-marker';

const COLOR_CLASSES: Record<AnnotationColor, string> = {
  yellow: 'annotation-yellow',
  green: 'annotation-green',
  pink: 'annotation-pink',
  blue: 'annotation-blue',
  purple: 'annotation-purple',
};

// ─────────────────────────────────────────────────────────────────────────────
// XSS Sanitization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitize user-supplied note content.
 * Allows only a safe subset of inline tags — no scripts, no style, no forms.
 */
export function sanitizeNoteContent(raw: string): string {
  if (typeof window === 'undefined') {
    // SSR: strip all markup
    return raw.replace(/<[^>]+>/g, '');
  }
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p', 'span'],
    ALLOWED_ATTR: [],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Anchor Resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the best DOM Range for an annotation anchor.
 *
 * Strategy:
 * 1. Walk all text nodes inside `container`
 * 2. Concatenate text to find `prefix + exactText + suffix`
 * 3. Return a Range spanning exactly `exactText`
 *
 * Returns null if not found (anchor is orphaned).
 */
export function findAnchorRange(
  container: HTMLElement,
  anchor: AnnotationAnchor
): Range | null {
  if (!anchor.exactText || !anchor.exactText.trim()) return null;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  if (textNodes.length === 0) return null;

  // Build fullText and character offsets directly from DOM text nodes
  let fullText = '';
  const offsets: { node: Text; start: number }[] = [];
  for (const tn of textNodes) {
    offsets.push({ node: tn, start: fullText.length });
    fullText += tn.nodeValue || '';
  }

  const targetText = anchor.exactText.trim();

  // 1. Fast Path: Direct exact substring search on raw fullText
  let exactStart = fullText.indexOf(targetText);
  if (exactStart !== -1) {
    const range = buildRange(offsets, exactStart, exactStart + targetText.length);
    if (range) return range;
  }

  // 2. Case-insensitive exact substring search
  exactStart = fullText.toLowerCase().indexOf(targetText.toLowerCase());
  if (exactStart !== -1) {
    const range = buildRange(offsets, exactStart, exactStart + targetText.length);
    if (range) return range;
  }

  // 3. Cross-block whitespace-flexible regex search (supports 0 or more whitespace between block elements)
  try {
    const escapedPattern = escapeRegex(targetText).replace(/\s+/g, '[\\s\\u00a0]*');
    const regex = new RegExp(escapedPattern, 'i');
    const match = fullText.match(regex);
    if (match && match.index !== undefined) {
      const range = buildRange(offsets, match.index, match.index + match[0].length);
      if (range) return range;
    }
  } catch {}

  // 4. Token sequence search fallback (words separated by arbitrary non-word chars)
  try {
    const words = targetText.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const tokenPattern = words.map(w => escapeRegex(w)).join('[\\s\\S]{0,10}?');
      const tokenRegex = new RegExp(tokenPattern, 'i');
      const match = fullText.match(tokenRegex);
      if (match && match.index !== undefined) {
        const range = buildRange(offsets, match.index, match.index + match[0].length);
        if (range) return range;
      }
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
    let endSet = false;

    for (let i = 0; i < offsets.length; i++) {
      const { node, start: nodeStart } = offsets[i];
      const nodeLength = node.nodeValue?.length ?? 0;
      const nodeEnd = nodeStart + nodeLength;

      if (!startSet && start >= nodeStart && (start < nodeEnd || (start === nodeEnd && i === offsets.length - 1))) {
        range.setStart(node, Math.min(start - nodeStart, nodeLength));
        startSet = true;
      }

      if (startSet && end >= nodeStart && end <= nodeEnd) {
        range.setEnd(node, Math.min(end - nodeStart, nodeLength));
        endSet = true;
        break;
      }
    }

    if (startSet && !endSet && offsets.length > 0) {
      const lastNode = offsets[offsets.length - 1].node;
      range.setEnd(lastNode, lastNode.nodeValue?.length ?? 0);
      endSet = true;
    }

    if (startSet && endSet) {
      return range;
    }
  } catch {
    // DOM range errors
  }
  return null;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply Annotations to DOM
// ─────────────────────────────────────────────────────────────────────────────

export interface ApplyAnnotationsResult {
  applied: string[];    // annotation IDs successfully applied
  orphaned: string[];   // annotation IDs that could not be anchored
}

/**
 * Apply all annotations as `<mark>` overlays into `container`.
 * Does NOT modify the original HTML string.
 * Idempotent: removes previous marks before re-applying.
 */
export function applyAnnotations(
  container: HTMLElement,
  annotations: DocumentAnnotation[]
): ApplyAnnotationsResult {
  // 1. Remove all existing annotation marks
  removeAnnotationMarks(container);

  const applied: string[] = [];
  const orphaned: string[] = [];

  for (const ann of annotations) {
    if (ann.anchorStatus === 'deleted') continue;

    const range = findAnchorRange(container, ann.anchor);
    if (!range) {
      orphaned.push(ann.id);
      continue;
    }

    try {
      wrapRange(range, ann);
      applied.push(ann.id);
    } catch {
      orphaned.push(ann.id);
    }
  }

  return { applied, orphaned };
}

function wrapRange(range: Range, ann: DocumentAnnotation) {
  const className = [
    ANNOTATION_MARK_CLASS,
    COLOR_CLASSES[ann.color ?? 'yellow'],
    ann.type === 'note' ? 'has-note' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const createMark = () => {
    const mark = document.createElement('mark');
    mark.setAttribute(ANNOTATION_MARK_ATTR, ann.id);
    mark.className = className;
    if (ann.noteContent) {
      mark.setAttribute('data-note', ann.noteContent.slice(0, 200));
      mark.setAttribute('title', ann.noteContent.slice(0, 120));
    }
    return mark;
  };

  if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
    const mark = createMark();
    const fragment = range.extractContents();
    mark.appendChild(fragment);
    range.insertNode(mark);
    return;
  }

  // Multi-node range wrapper: collect all intersecting text nodes safely
  const textNodes: { node: Text; startOffset: number; endOffset: number }[] = [];
  const root = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
    ? range.commonAncestorContainer.parentNode || range.commonAncestorContainer
    : range.commonAncestorContainer;

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT
  );

  let cur: Node | null;
  while ((cur = walker.nextNode())) {
    const textNode = cur as Text;
    try {
      if (range.intersectsNode(textNode)) {
        const isStart = textNode === range.startContainer;
        const isEnd = textNode === range.endContainer;
        const len = textNode.nodeValue?.length ?? 0;
        const s = isStart ? Math.min(range.startOffset, len) : 0;
        const e = isEnd ? Math.min(range.endOffset, len) : len;
        if (s < e) {
          textNodes.push({ node: textNode, startOffset: s, endOffset: e });
        }
      }
    } catch {}
  }

  // Wrap collected nodes
  for (const { node: textNode, startOffset, endOffset } of textNodes) {
    try {
      const nodeRange = document.createRange();
      nodeRange.setStart(textNode, startOffset);
      nodeRange.setEnd(textNode, endOffset);
      const mark = createMark();
      const fragment = nodeRange.extractContents();
      mark.appendChild(fragment);
      nodeRange.insertNode(mark);
    } catch {}
  }
}

/**
 * Remove all annotation marks from container, restoring plain text.
 */
export function removeAnnotationMarks(container: HTMLElement) {
  const marks = container.querySelectorAll(`[${ANNOTATION_MARK_ATTR}]`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (parent) {
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
      parent.normalize();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Annotation from Browser Selection
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildAnnotationOptions {
  documentId: string;
  userId: string;
  contentVersion: string;
  type: 'highlight' | 'note';
  color?: AnnotationColor;
  noteContent?: string;
}

/**
 * Build a DocumentAnnotation from the current browser Selection.
 * Returns null if no text is selected or selection is outside `container`.
 */
export function buildAnnotationFromSelection(
  selection: Selection,
  container: HTMLElement,
  options: BuildAnnotationOptions
): Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'> | null {
  if (!selection || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);

  // Allow selection if commonAncestor is in container OR if start/end intersects container
  const isInside =
    container.contains(range.commonAncestorContainer) ||
    container.contains(range.startContainer) ||
    container.contains(range.endContainer);

  if (!isInside) return null;

  const exactText = selection.toString().trim();
  if (!exactText || exactText.length < 2) return null;

  // Build context (20 chars before and after)
  const fullText = container.textContent ?? '';
  const absStart = getAbsoluteOffset(container, range.startContainer, range.startOffset);
  const prefix = fullText.slice(Math.max(0, absStart - 20), absStart);
  const suffix = fullText.slice(absStart + exactText.length, absStart + exactText.length + 20);

  return {
    documentId: options.documentId,
    userId: options.userId,
    anchor: {
      exactText,
      prefix: prefix || undefined,
      suffix: suffix || undefined,
      startOffset: absStart,
      endOffset: absStart + exactText.length,
      contentVersion: options.contentVersion,
    },
    type: options.type,
    color: options.color ?? 'yellow',
    noteContent: options.noteContent ? sanitizeNoteContent(options.noteContent) : undefined,
    visibility: 'private',
    anchorStatus: 'active' as AnnotationAnchorStatus,
    nodeId: undefined,
  };
}

function getAbsoluteOffset(container: HTMLElement, node: Node, offset: number): number {
  let total = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) {
      return total + offset;
    }
    if (node.nodeType !== Node.TEXT_NODE && node.contains?.(current)) {
      return total;
    }
    total += (current.nodeValue ?? '').length;
  }
  return total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-anchor
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to re-anchor an annotation after a content version change.
 * Returns the updated anchor status.
 *
 * - If text is still found: status → 'reanchored'
 * - If not found: status → 'orphaned'
 */
export function reanchorAnnotation(
  container: HTMLElement,
  annotation: DocumentAnnotation,
  newContentVersion: string
): { status: AnnotationAnchorStatus; updatedAnchor?: AnnotationAnchor } {
  const range = findAnchorRange(container, annotation.anchor);
  if (!range) {
    return { status: 'orphaned' };
  }

  return {
    status: 'reanchored',
    updatedAnchor: {
      ...annotation.anchor,
      contentVersion: newContentVersion,
    },
  };
}
