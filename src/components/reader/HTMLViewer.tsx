'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import type { LegalDocument } from '@/types';
import { highlightHtml } from '@/lib/sanitize';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';
import { linkLegalCitations } from '@/lib/legal-engine/citation-linker';
import { DEMO_DOCUMENTS } from '@/lib/demo-data';
import { ChevronRight, ExternalLink, X, BookOpen } from 'lucide-react';
import { CitationPreviewPopover, type CitationPreviewData } from './CitationPreviewPopover';
import { extractStructuredArticles } from '@/lib/diff-engine';

interface HTMLViewerProps {
  document: LegalDocument;
  fontSize: number;
  searchQuery: string;
  showOutline: boolean;
  allDocuments?: LegalDocument[];
  onOutlineClose?: () => void;
  onMatchesCountChange?: (count: number) => void;
  onNavigateToDocument?: (docId: string, targetNodeId?: string) => void;
  onOpenDiff?: (docA: LegalDocument, docB: LegalDocument) => void;
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
  allDocuments,
  onOutlineClose,
  onMatchesCountChange,
  onNavigateToDocument,
  onOpenDiff,
}: HTMLViewerProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const docCorpus = useMemo(() => allDocuments || (DEMO_DOCUMENTS as unknown as LegalDocument[]), [allDocuments]);
  const [hoverCitation, setHoverCitation] = useState<CitationPreviewData | null>(null);
  const [transcludedSnippets, setTranscludedSnippets] = useState<Array<{ id: string; docNumber: string; title: string; excerpt: string; docId: string }>>([]);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    const withCitations = linkLegalCitations(formatted, docCorpus).html;

    // Insert anchor tags to headings so outline can jump to them
    let idx = 0;
    const htmlWithAnchors = withCitations.replace(/(<h[1234][^>]*>|<p[^>]*><strong>(?:Điều|Chương|Phần)[^<]*<\/strong>)/gi, (match) => {
      const anchor = `<span id="sec-${idx}" class="scroll-mt-4"></span>`;
      idx++;
      return anchor + match;
    });

    return highlightHtml(htmlWithAnchors, searchQuery);
  }, [doc, searchQuery, docCorpus]);

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
        onMouseOver={(e) => {
          const target = (e.target as HTMLElement).closest('.legal-citation-link, .legal-citation-badge') as HTMLElement | null;
          if (target) {
            const docId = target.getAttribute('data-doc-id');
            const docNum = target.getAttribute('data-doc-number') || '';
            const provId = target.getAttribute('data-provision-id') || undefined;
            const rawText = target.innerText || docNum;
            const rect = target.getBoundingClientRect();

            const targetDoc = docId ? docCorpus.find((d) => d.id === docId) : docCorpus.find((d) => d.document_number?.toLowerCase() === docNum.toLowerCase());

            if (targetDoc) {
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
              hoverTimerRef.current = setTimeout(() => {
                setHoverCitation({
                  documentId: targetDoc.id,
                  documentNumber: targetDoc.document_number || docNum,
                  targetDocument: targetDoc,
                  targetProvisionId: provId,
                  rawText,
                  anchorRect: rect,
                });
              }, 180);
            }
          }
        }}
        onMouseLeave={() => {
          if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        }}
        onClick={(e) => {
          const target = (e.target as HTMLElement).closest('.legal-citation-link') as HTMLElement | null;
          if (target) {
            e.preventDefault();
            const docId = target.getAttribute('data-doc-id');
            const provId = target.getAttribute('data-provision-id') || undefined;
            if (docId && onNavigateToDocument) {
              onNavigateToDocument(docId, provId);
            }
          }
        }}
      >
        <div className="document-page">
          {/* Inline Transclusion Callout Blocks */}
          {transcludedSnippets.length > 0 && (
            <div className="mb-6 space-y-3">
              {transcludedSnippets.map((snip) => (
                <div
                  key={snip.id}
                  className="p-4 bg-purple-50/70 border-2 border-purple-300 rounded-xl shadow-xs space-y-2 text-xs animate-in fade-in slide-in-from-top-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-purple-700 text-white font-bold rounded text-[10.5px]">
                        {snip.docNumber}
                      </span>
                      <span className="font-bold text-purple-950 truncate max-w-md">{snip.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {onNavigateToDocument && (
                        <button
                          onClick={() => onNavigateToDocument(snip.docId)}
                          className="text-purple-700 hover:text-purple-900 font-semibold text-[11px] flex items-center gap-1"
                        >
                          <span>Xem toàn văn</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => setTranscludedSnippets((prev) => prev.filter((s) => s.id !== snip.id))}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded"
                        title="Đóng khối nhúng"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-700 font-serif leading-relaxed text-[12px] bg-white p-3 rounded-lg border border-purple-200/60">
                    {snip.excerpt}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div
            className="document-content select-text"
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        </div>
      </div>

      {/* Live Hover Preview Popover */}
      {hoverCitation && (
        <CitationPreviewPopover
          data={hoverCitation}
          onClose={() => setHoverCitation(null)}
          onNavigate={(targetId, provId) => {
            onNavigateToDocument?.(targetId, provId);
            setHoverCitation(null);
          }}
          onOpenDiff={onOpenDiff}
          onTransclude={(targetId, provId) => {
            const targetDoc = docCorpus.find((d) => d.id === targetId);
            if (targetDoc) {
              let excerpt = targetDoc.summary_main || targetDoc.title;
              if (provId && targetDoc.html_content) {
                const arts = extractStructuredArticles(targetDoc.html_content);
                const provNumMatch = provId.replace('dieu-', '');
                const matched = arts.find(
                  (a) =>
                    a.id === provId ||
                    (a.number !== undefined && a.number.toString() === provNumMatch) ||
                    a.title.toLowerCase().includes(`điều ${provNumMatch}`)
                );
                if (matched) excerpt = `${matched.title}: ${matched.body}`;
              }
              const snipId = `trans-${Date.now()}`;
              setTranscludedSnippets((prev) => [
                {
                  id: snipId,
                  docNumber: targetDoc.document_number || targetDoc.title,
                  title: targetDoc.title,
                  excerpt,
                  docId: targetDoc.id,
                },
                ...prev,
              ]);
            }
          }}
          currentDocument={doc}
        />
      )}
    </div>
  );
}
