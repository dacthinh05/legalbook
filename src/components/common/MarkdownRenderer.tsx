'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Validates link protocol against common XSS vectors (e.g. javascript:, data:, vbscript:).
 * Only allows http:, https:, mailto:, tel:, or relative paths / hash anchors.
 */
export function isSafeLinkUrl(url: string): boolean {
  if (!url) return false;
  const trimmed = url.trim().toLowerCase();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return true;
  }
  return false;
}

/**
 * Parses inline Markdown recursively:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code: `code`
 * - Links: [label](url) with protocol validation
 */
export function renderInlineMarkdown(text: string, keyPrefix = 'inline'): ReactNode[] {
  if (!text) return [];

  // Match token patterns:
  // 1. Link: [text](url)
  // 2. Bold: **text** or __text__
  // 3. Italic: *text* or _text_
  // 4. Code: `text`
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (!part) return null;

    // Link: [label](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const [, label, url] = match;
        const safe = isSafeLinkUrl(url);
        if (safe) {
          return (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
            >
              {renderInlineMarkdown(label, `${key}-lbl`)}
            </a>
          );
        }
        // Unsafe protocol fallback: render label safely as text without anchor href
        return (
          <span key={key} className="text-slate-800 font-medium">
            {renderInlineMarkdown(label, `${key}-lbl`)}
          </span>
        );
      }
    }

    // Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      const inner = part.slice(2, -2);
      return (
        <strong key={key} className="font-bold text-slate-950">
          {renderInlineMarkdown(inner, `${key}-b`)}
        </strong>
      );
    }

    // Code: `text`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const inner = part.slice(1, -1);
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 bg-slate-200/80 text-blue-900 rounded font-mono text-[11px] font-semibold"
        >
          {inner}
        </code>
      );
    }

    // Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      const inner = part.slice(1, -1);
      return (
        <em key={key} className="italic text-slate-800">
          {renderInlineMarkdown(inner, `${key}-em`)}
        </em>
      );
    }

    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Lightweight, robust zero-dependency React Markdown Renderer.
 * Supports paragraphs, multi-level headers (# to #####), bullet/ordered lists, blockquotes,
 * fenced code blocks (```), tables, and secure rich inline text.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentTable: string[] | null = null;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = '';

  const flushList = (key: string) => {
    if (!currentList) return;
    const isOrdered = currentList.type === 'ol';
    blocks.push(
      isOrdered ? (
        <ol key={key} className="space-y-1 my-1.5 pl-1">
          {currentList.items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="font-mono text-blue-700 font-semibold text-[11px] shrink-0 mt-0.5">
                {i + 1}.
              </span>
              <div className="flex-1 leading-relaxed">{renderInlineMarkdown(item, `${key}-li-${i}`)}</div>
            </li>
          ))}
        </ol>
      ) : (
        <ul key={key} className="space-y-1 my-1.5 pl-1">
          {currentList.items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-blue-500 font-bold text-xs shrink-0 select-none">•</span>
              <div className="flex-1 leading-relaxed">{renderInlineMarkdown(item, `${key}-li-${i}`)}</div>
            </li>
          ))}
        </ul>
      )
    );
    currentList = null;
  };

  const flushTable = (key: string) => {
    if (!currentTable || currentTable.length < 2) {
      if (currentTable) {
        currentTable.forEach((row, rIdx) => {
          blocks.push(<p key={`${key}-p-${rIdx}`}>{renderInlineMarkdown(row, `${key}-tr-${rIdx}`)}</p>);
        });
      }
      currentTable = null;
      return;
    }

    const rows = currentTable.map((r) =>
      r
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
    );

    const headerRow = rows[0] || [];
    const dataRows = rows.slice(2); // Skip separator row

    blocks.push(
      <div key={key} className="my-2 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
        <table className="min-w-full text-xs text-left">
          <thead className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-200">
            <tr>
              {headerRow.map((th, thIdx) => (
                <th key={thIdx} className="px-2.5 py-1.5">
                  {renderInlineMarkdown(th, `${key}-th-${thIdx}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
            {dataRows.map((tr, trIdx) => (
              <tr key={trIdx} className="hover:bg-slate-50">
                {tr.map((td, tdIdx) => (
                  <td key={tdIdx} className="px-2.5 py-1.5">
                    {renderInlineMarkdown(td, `${key}-td-${trIdx}-${tdIdx}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // ── Fenced code blocks ``` ──
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push(
          <div
            key={`code-block-${i}`}
            className="my-2 rounded-lg bg-slate-900 text-slate-100 p-3 overflow-x-auto font-mono text-[11px] leading-relaxed shadow-2xs"
          >
            {codeLanguage && (
              <div className="text-[9.5px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800 pb-1 mb-2">
                {codeLanguage}
              </div>
            )}
            <pre className="whitespace-pre">{codeLines.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeLines = [];
        codeLanguage = '';
      } else {
        // Start code block
        if (currentList) flushList(`list-${i}`);
        if (currentTable) flushTable(`table-${i}`);
        inCodeBlock = true;
        codeLanguage = trimmed.slice(3).trim();
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(rawLine);
      continue;
    }

    // ── Table detection ──
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (currentList) flushList(`list-${i}`);
      if (!currentTable) currentTable = [];
      currentTable.push(trimmed);
      continue;
    } else if (currentTable) {
      flushTable(`table-${i}`);
    }

    // Empty line
    if (!trimmed) {
      if (currentList) flushList(`list-${i}`);
      continue;
    }

    // ── Headings (1:1 mapping: #->h1, ##->h2, ###->h3, ####->h4, #####->h5, ######->h6) ──
    if (trimmed.startsWith('###### ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <h6 key={`h6-${i}`} className="font-semibold text-slate-700 text-xs mt-1.5 mb-1">
          {renderInlineMarkdown(trimmed.slice(7), `h6-${i}`)}
        </h6>
      );
      continue;
    }
    if (trimmed.startsWith('##### ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <h5 key={`h5-${i}`} className="font-bold text-slate-800 text-xs mt-2 mb-1 flex items-center gap-1">
          {renderInlineMarkdown(trimmed.slice(6), `h5-${i}`)}
        </h5>
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <h4 key={`h4-${i}`} className="font-bold text-slate-900 text-xs mt-2.5 mb-1 flex items-center gap-1">
          {renderInlineMarkdown(trimmed.slice(5), `h4-${i}`)}
        </h4>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <h3 key={`h3-${i}`} className="font-bold text-slate-950 text-xs mt-3 mb-1.5 flex items-center gap-1.5 text-blue-950">
          {renderInlineMarkdown(trimmed.slice(4), `h3-${i}`)}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <h2 key={`h2-${i}`} className="font-bold text-slate-950 text-sm mt-3.5 mb-2 flex items-center gap-1.5 text-blue-900 border-b border-slate-200/70 pb-1">
          {renderInlineMarkdown(trimmed.slice(3), `h2-${i}`)}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('# ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <h1 key={`h1-${i}`} className="font-bold text-slate-950 text-base mt-4 mb-2 flex items-center gap-1.5 text-blue-950 border-b border-slate-200 pb-1">
          {renderInlineMarkdown(trimmed.slice(2), `h1-${i}`)}
        </h1>
      );
      continue;
    }

    // ── Blockquote ──
    if (trimmed.startsWith('> ')) {
      if (currentList) flushList(`list-${i}`);
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-3 border-blue-500 bg-blue-50/60 pl-3 py-1.5 text-slate-700 italic my-1.5 rounded-r text-xs leading-relaxed"
        >
          {renderInlineMarkdown(trimmed.slice(2), `quote-${i}`)}
        </blockquote>
      );
      continue;
    }

    // ── Bullet list: - or * or + ──
    if (/^[-*+]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*+]\s+/, '');
      if (currentList && currentList.type !== 'ul') flushList(`list-${i}`);
      if (!currentList) currentList = { type: 'ul', items: [] };
      currentList.items.push(itemText);
      continue;
    }

    // ── Numbered list: 1. or 2. ──
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      if (currentList && currentList.type !== 'ol') flushList(`list-${i}`);
      if (!currentList) currentList = { type: 'ol', items: [] };
      currentList.items.push(itemText);
      continue;
    }

    // Default: regular paragraph
    if (currentList) flushList(`list-${i}`);
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed my-1">
        {renderInlineMarkdown(rawLine, `p-${i}`)}
      </p>
    );
  }

  if (inCodeBlock) {
    blocks.push(
      <div
        key="code-block-end"
        className="my-2 rounded-lg bg-slate-900 text-slate-100 p-3 overflow-x-auto font-mono text-[11px] leading-relaxed shadow-2xs"
      >
        <pre className="whitespace-pre">{codeLines.join('\n')}</pre>
      </div>
    );
  }
  if (currentList) flushList(`list-end`);
  if (currentTable) flushTable(`table-end`);

  return (
    <div className={cn('space-y-1 leading-relaxed text-xs', className)}>
      {blocks}
    </div>
  );
}
