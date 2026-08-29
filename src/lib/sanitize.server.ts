/**
 * LegalBook Server-Side HTML Sanitizer
 * 
 * Powered by DOMPurify and JSDOM for headless Node.js environments
 * (server scripts, document import pipelines, test runners).
 */

import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP, isSafeUrl } from './sanitize';

const jsdomWindow = new JSDOM('<!DOCTYPE html><html><body></body></html>').window;
const serverPurify = DOMPurify(jsdomWindow as unknown as Window & typeof globalThis);

serverPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
    const href = node.getAttribute('href');
    if (href && !isSafeUrl(href)) {
      node.removeAttribute('href');
    }
  }
});

export function sanitizeHtmlServer(rawHtml: string | null | undefined): string {
  if (!rawHtml) return '';
  return serverPurify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
  });
}
