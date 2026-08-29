'use client';

/**
 * SelectionToolbar.tsx
 * Floating toolbar that appears when user selects text in the document.
 *
 * Actions: Tô vàng | Ghi chú | Sao chép | Sao chép liên kết
 *
 * Rules:
 * - Only shows inside the document content area
 * - Positions itself above the selection (flips below if near top of viewport)
 * - Never covers the selected text
 * - Accessible: keyboard operable, not icon-only
 * - Disabled entirely when hasFullText is false
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Highlighter, MessageSquarePlus, Copy, Link } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AnnotationColor } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface SelectionToolbarProps {
  /** The element that contains the document text. */
  contentContainerRef: React.RefObject<HTMLElement | null>;
  hasFullText: boolean;
  onHighlight: (color: AnnotationColor) => void;
  onAddNote: () => void;
  onCopy: () => void;
  onCopyLink: () => void;
}

// ─── Color picker ────────────────────────────────────────────────────────────

const COLORS: { color: AnnotationColor; label: string; bg: string }[] = [
  { color: 'yellow', label: 'Vàng nhạt', bg: 'bg-amber-300' },
  { color: 'green', label: 'Xanh lá', bg: 'bg-emerald-400' },
  { color: 'pink', label: 'Hồng nhạt', bg: 'bg-rose-300' },
  { color: 'blue', label: 'Xanh dương', bg: 'bg-sky-300' },
  { color: 'purple', label: 'Tím nhạt', bg: 'bg-purple-300' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function SelectionToolbar({
  contentContainerRef,
  hasFullText,
  onHighlight,
  onAddNote,
  onCopy,
  onCopyLink,
}: SelectionToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [showColors, setShowColors] = useState(false);
  const [copied, setCopied] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const hide = useCallback(() => {
    setVisible(false);
    setShowColors(false);
  }, []);

  // Listen for selection changes and viewport/container scroll
  useEffect(() => {
    if (!hasFullText) return;

    const updatePosition = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        setTimeout(() => {
          const sel2 = window.getSelection();
          if (!sel2 || sel2.isCollapsed) hide();
        }, 150);
        return;
      }

      const container = contentContainerRef.current;
      if (!container) return;

      const range = sel.getRangeAt(0);
      if (!container.contains(range.startContainer) && !container.contains(range.endContainer)) {
        hide();
        return;
      }

      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        hide();
        return;
      }

      const toolbar = toolbarRef.current;
      const toolbarHeight = toolbar?.offsetHeight || 38;
      const toolbarWidth = toolbar?.offsetWidth || 280;

      // Fixed positioning coordinates (relative to viewport)
      let top = rect.top - toolbarHeight - 10;
      let left = rect.left + rect.width / 2 - toolbarWidth / 2;

      // Flip below if too close to top of viewport
      if (top < 56) {
        top = rect.bottom + 10;
      }

      // Clamp horizontal to stay safely inside screen margins
      const margin = 12;
      left = Math.max(margin, Math.min(left, window.innerWidth - toolbarWidth - margin));

      setPosition({ top, left });
      setVisible(true);
    };

    document.addEventListener('selectionchange', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('selectionchange', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [hasFullText, contentContainerRef, hide]);

  // Hide on click outside toolbar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        hide();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [hide]);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyLink = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    hide();
  };

  const handleHighlight = (color: AnnotationColor) => {
    onHighlight(color);
    setShowColors(false);
    hide();
  };

  if (!visible || !hasFullText) return null;

  return (
    <div
      ref={toolbarRef}
      role="toolbar"
      aria-label="Công cụ chú thích"
      className={cn(
        'fixed z-50 flex items-center gap-0.5',
        'bg-slate-900 text-white rounded-lg shadow-xl px-1.5 py-1',
        'text-xs select-none',
        'animate-in fade-in zoom-in-95 duration-100'
      )}
      style={{ top: position.top, left: position.left }}
    >
      {/* Highlight button */}
      <div className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
          title="Tô màu"
          aria-label="Tô màu đoạn văn"
          aria-expanded={showColors}
        >
          <Highlighter className="w-3.5 h-3.5 text-amber-400" />
          <span>Tô màu</span>
        </button>

        {/* Color picker */}
        {showColors && (
          <div className="absolute bottom-full mb-1.5 left-0 bg-slate-800 border border-slate-700 rounded-lg p-2 flex items-center gap-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            {COLORS.map(({ color, label, bg }) => (
              <button
                key={color}
                onClick={() => handleHighlight(color)}
                className={cn(
                  'w-5 h-5 rounded-full border-2 border-transparent hover:border-white transition-all hover:scale-110',
                  bg
                )}
                title={label}
                aria-label={label}
              />
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-white/20 mx-0.5" aria-hidden />

      {/* Add note */}
      <button
        onClick={() => { onAddNote(); hide(); }}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        title="Thêm ghi chú"
        aria-label="Thêm ghi chú vào đoạn này"
      >
        <MessageSquarePlus className="w-3.5 h-3.5 text-blue-400" />
        <span>Ghi chú</span>
      </button>

      <div className="w-px h-5 bg-white/20 mx-0.5" aria-hidden />

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        title="Sao chép"
        aria-label="Sao chép văn bản đã chọn"
      >
        <Copy className="w-3.5 h-3.5" />
        <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
      </button>

      {/* Copy link */}
      <button
        onClick={handleCopyLink}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/10 transition-colors"
        title="Sao chép liên kết"
        aria-label="Sao chép liên kết đến vị trí này"
      >
        <Link className="w-3.5 h-3.5" />
        <span>Sao chép liên kết</span>
      </button>
    </div>
  );
}
