'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { LegalDocument } from '@/types';
import { highlightHtml } from '@/lib/sanitize';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';
import { ChevronRight } from 'lucide-react';

interface HTMLViewerProps {
  document: LegalDocument;
  fontSize: number;
  searchQuery: string;
  showOutline: boolean;
  onOutlineClose?: () => void;
  onMatchesCountChange?: (count: number) => void;
}

interface OutlineItem {
  id: string;
  title: string;
  level: number;
}

export function HTMLViewer({
  document: doc,
  fontSize,
  searchQuery,
  showOutline,
  onOutlineClose,
  onMatchesCountChange,
}: HTMLViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract outline from html content (H2, H3, strong Điều/Chương)
  const outline = useMemo<OutlineItem[]>(() => {
    if (!doc.html_content) return [];
    const items: OutlineItem[] = [];

    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return items;
    }

    try {
      const parser = new DOMParser();
      const docDom = parser.parseFromString(doc.html_content, 'text/html');
      const headings = docDom.querySelectorAll('h2, h3, h4, p > strong');
      headings.forEach((el, idx) => {
        const text = el.textContent?.trim() || '';
        if (
          text.startsWith('Tóm tắt') ||
          text.startsWith('Điểm mới') ||
          text.startsWith('Tác động') ||
          text.match(/^\d+\.\s*(Tóm tắt|Điểm mới|Tác động|Hành động|Quy định chung|Các điểm)/i)
        ) {
          return;
        }

        if (
          text.startsWith('Điều ') ||
          text.startsWith('Chương ') ||
          text.startsWith('Phần ') ||
          text.startsWith('Mục ') ||
          text.startsWith('Phụ lục') ||
          (el.tagName === 'H2' && text.length > 5 && text.length < 120)
        ) {
          items.push({
            id: `sec-${idx}`,
            title: text,
            level: el.tagName === 'H2' || text.startsWith('Chương ') || text.startsWith('Phần ') ? 1 : el.tagName === 'H3' || text.startsWith('Điều ') ? 2 : 3,
          });
        }
      });
    } catch {
      // Fallback
    }

    return items;
  }, [doc.html_content]);

  // Highlight search keywords in html content
  // Highlight search keywords in sanitized HTML content
  const { html: processedHtml, matchCount } = useMemo(() => {
    if (!doc.html_content) {
      return { html: '<p class="text-slate-400 italic">Chưa có nội dung văn bản.</p>', matchCount: 0 };
    }
    
    const formatted = formatLegalHtmlContent(doc.html_content, doc);

    // Insert anchor tags to headings so outline can jump to them
    let idx = 0;
    const htmlWithAnchors = formatted.replace(/(<h[1234][^>]*>|<p[^>]*><strong>(?:Điều|Chương|Phần)[^<]*<\/strong>)/gi, (match) => {
      const anchor = `<span id="sec-${idx}" class="scroll-mt-4"></span>`;
      idx++;
      return anchor + match;
    });

    return highlightHtml(htmlWithAnchors, searchQuery);
  }, [doc, searchQuery]);

  useEffect(() => {
    onMatchesCountChange?.(matchCount);
  }, [matchCount, onMatchesCountChange]);

  const scrollToSection = (id: string) => {
    const el = contentRef.current?.querySelector(`#${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden relative bg-white">
      {/* Table of contents outline sidebar */}
      {showOutline && outline.length > 0 && (
        <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0 animate-slide-in">
          <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">Mục lục điều, khoản</span>
            {onOutlineClose && (
              <button
                onClick={onOutlineClose}
                className="text-gray-400 hover:text-gray-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {outline.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-gray-200 transition-colors flex items-start gap-1 text-gray-700 ${
                  item.level === 1
                    ? 'font-semibold text-blue-900 bg-white border border-gray-200/60 shadow-2xs'
                    : item.level === 2
                    ? 'pl-4 font-medium'
                    : 'pl-6 text-gray-500'
                }`}
              >
                <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5 text-gray-400" />
                <span className="truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Document Content Container */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto reader-viewport"
      >
        <div className="document-page">
          <div
            className="document-content select-text"
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        </div>
      </div>
    </div>
  );
}
