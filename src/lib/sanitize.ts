/**
 * LegalBook Client-Bundle Safe HTML Sanitization & Safe Highlighting Module
 * 
 * Powered by DOMPurify (pure browser-safe, zero Node-only jsdom dependencies).
 * In browser runtime: uses full DOMPurify HTML5 parser engine.
 * In SSR runtime: strictly fails closed by escaping all markup (zero raw HTML in SSR).
 */

import DOMPurify from 'dompurify';

// Explicit tag allowlist for legal document content
export const ALLOWED_TAGS = [
  // Structure & Headings
  'div',
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'br',
  'section',
  'article',
  // Typography & Formatting
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'sub',
  'sup',
  'small',
  'mark',
  'code',
  'pre',
  'blockquote',
  'cite',
  'q',
  'abbr',
  // Lists
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  // Tables
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  // Links
  'a',
];

// Global and element-specific allowed attributes
export const ALLOWED_ATTR = [
  'id',
  'class',
  'title',
  'aria-label',
  'aria-hidden',
  'aria-expanded',
  'role',
  'href',
  'target',
  'rel',
  'colspan',
  'rowspan',
  'scope',
  'headers',
  'align',
  'border',
  'cellpadding',
  'cellspacing',
  'start',
  'type',
  'reversed',
];

// Allowed URI schemes (rejects javascript:, vbscript:, data:, blob:, file:)
export const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/**
 * Decodes all HTML entities (named, numeric decimal, and numeric hex)
 * into plain text characters to defeat obfuscated scheme bypasses (e.g. &#x6a;avascript:).
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return '';

  let decoded = str;

  // 1. Decode numeric hex entities: &#x6a; or &#X6A;
  decoded = decoded.replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
    try {
      const code = parseInt(hex, 16);
      return code > 0 ? String.fromCharCode(code) : '';
    } catch {
      return '';
    }
  });

  // 2. Decode numeric decimal entities: &#106;
  decoded = decoded.replace(/&#([0-9]+);?/g, (_, dec) => {
    try {
      const code = parseInt(dec, 10);
      return code > 0 ? String.fromCharCode(code) : '';
    } catch {
      return '';
    }
  });

  // 3. Decode common named entities
  const namedEntities: Record<string, string> = {
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&apos;': "'",
    '&nbsp;': ' ',
    '&Tab;': '',
    '&NewLine;': '',
  };

  for (const [entity, char] of Object.entries(namedEntities)) {
    decoded = decoded.replaceAll(entity, char);
  }

  return decoded;
}

/**
 * Validates whether a URL attribute value is safe.
 * Decodes entity encoding and strips control/whitespace characters before checking.
 */
export function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl) return false;

  const decoded = decodeHtmlEntities(rawUrl);
  const clean = decoded.replace(/[\x00-\x20\x7F-\x9F\u00A0\u2000-\u200B\u2028\u2029]/g, '').trim().toLowerCase();

  if (clean.length === 0) return false;

  // Relative links and hash anchors are safe
  if (clean.startsWith('#') || clean.startsWith('/') || clean.startsWith('./') || clean.startsWith('../')) {
    return true;
  }

  // Explicitly reject dangerous schemes
  if (
    clean.startsWith('javascript:') ||
    clean.startsWith('vbscript:') ||
    clean.startsWith('data:') ||
    clean.startsWith('blob:') ||
    clean.startsWith('file:')
  ) {
    return false;
  }

  try {
    const parsed = new URL(clean, 'https://example.com');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:' || parsed.protocol === 'tel:';
  } catch {
    return false;
  }
}

/**
 * Escapes raw strings for safe insertion into HTML text contexts.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escapes special characters for use in regular expressions.
 */
export function escapeRegex(str: string): string {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Primary HTML Sanitization function.
 * In browser: uses native DOMPurify bound to window.
 * In SSR runtime (no DOM window): strictly fails closed with escapeHtml to prevent
 * raw untrusted markup from ever reaching the server-rendered HTML response.
 */
export function sanitizeHtml(rawHtml: string | null | undefined): string {
  if (!rawHtml) return '';

  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    const purify = typeof DOMPurify === 'function' ? (DOMPurify as unknown as (w: Window) => typeof DOMPurify)(window) : DOMPurify;
    return purify.sanitize(rawHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOWED_URI_REGEXP,
    });
  }

  // Strict SSR fail-closed: escape everything so no raw tags execute before hydration
  return escapeHtml(rawHtml);
}

/**
 * Highlights search keywords in sanitized HTML safely without tag disruption or XSS injection.
 */
export function highlightHtml(
  rawHtml: string | null | undefined,
  query: string | null | undefined
): { html: string; matchCount: number } {
  // 1. Sanitize FIRST via DOMPurify
  const clean = sanitizeHtml(rawHtml);
  if (!clean) return { html: '<p class="text-slate-400 italic">Chưa có nội dung văn bản.</p>', matchCount: 0 };
  if (!query || !query.trim()) return { html: clean, matchCount: 0 };

  const trimmedQuery = query.trim();
  const escapedQuery = escapeRegex(trimmedQuery);
  const regex = new RegExp(`(${escapedQuery})`, 'gi');

  let matchCount = 0;
  // Tokenize by HTML tags: only replace matches in non-tag text tokens
  const parts = clean.split(/(<[^>]+>)/g);
  const result = parts.map((part) => {
    if (part.startsWith('<') && part.endsWith('>')) {
      return part;
    }
    const matches = part.match(regex);
    if (matches) {
      matchCount += matches.length;
      return part.replace(
        regex,
        '<mark class="search-highlight bg-amber-200 text-amber-950 font-medium px-0.5 rounded-xs">$1</mark>'
      );
    }
    return part;
  });

  return {
    html: result.join(''),
    matchCount,
  };
}
