'use client';

/**
 * ReaderContextPanel.tsx
 * Side panel that shows either Table of Contents (TOC) or Notes
 * alongside the document content — content is NEVER unmounted.
 *
 * Desktop: fixed-width right panel (300–360px)
 * Tablet: overlay drawer from right
 * Mobile: full-height drawer (parent controls this via CSS/classname)
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  ChevronDown,
  ChevronRight,
  StickyNote,
  ListTree,
  Search,
  Trash2,
  Plus,
  AlertCircle,
  Loader2,
  MessageSquare,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { sanitizeNoteContent } from '@/lib/annotation-engine';
import type { TocItem, ReaderPanelMode, DocumentAnnotation, AnnotationColor } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReaderContextPanelProps {
  mode: ReaderPanelMode;
  onClose: () => void;

  // TOC
  tocItems: TocItem[];
  activeTocId: string | null;
  onTocItemClick: (item: TocItem) => void;
  tocCount: number;

  // Notes / Annotations
  annotations: DocumentAnnotation[];
  annotationsLoading: boolean;
  annotationsError: string | null;
  onNoteClick: (ann: DocumentAnnotation) => void;
  onAddNote: (noteContent: string) => void;
  onDeleteAnnotation: (id: string) => void;
  notesCount: number;
  hasFullText: boolean;

  // Current user id (to show edit controls only for own notes)
  currentUserId?: string;
}

// ─── TOC Panel ────────────────────────────────────────────────────────────────

interface TocPanelProps {
  items: TocItem[];
  activeId: string | null;
  onItemClick: (item: TocItem) => void;
}

function TocPanel({ items, activeId, onItemClick }: TocPanelProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active item into view within the panel
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeId]);

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter items — chapters always shown; articles filtered by search
  const searchNorm = search.trim().toLowerCase();
  const filteredItems = searchNorm
    ? items.filter((item) => {
        if (item.type !== 'article') return true;
        return (
          item.title.toLowerCase().includes(searchNorm) ||
          (item.articleNumber && item.articleNumber.includes(searchNorm))
        );
      })
    : items;

  const itemsWithParent = useMemo(() => {
    const result: Array<{ item: TocItem; parentChapterId: string | null }> = [];
    let chapterId: string | null = null;
    for (const item of filteredItems) {
      if (item.type !== 'article') {
        chapterId = item.id;
        result.push({ item, parentChapterId: null });
      } else {
        result.push({ item, parentChapterId: chapterId });
      }
    }
    return result;
  }, [filteredItems]);

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-12 text-center">
        <div className="space-y-2">
          <ListTree className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-medium text-slate-600">Mục lục chưa khả dụng</p>
          <p className="text-xs text-slate-400">
            Hệ thống chỉ trích xuất mục lục từ cấu trúc thực tế khi có toàn văn hợp lệ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm số Điều..."
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
            aria-label="Tìm nhanh điều khoản"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-slate-400 hover:text-slate-600"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* TOC tree */}
      <nav
        aria-label="Mục lục văn bản"
        className="flex-1 overflow-y-auto py-1.5 space-y-0.5"
      >
        {itemsWithParent.map(({ item, parentChapterId }) => {
          if (item.type !== 'article') {
            const isCollapsed = collapsed.has(item.id);
            const isActiveChapter = item.id === activeId;
            return (
              <div key={item.id} className="pt-1">
                <button
                  onClick={() => toggleCollapse(item.id)}
                  title={item.title}
                  className={cn(
                    'w-full min-h-[34px] flex items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold rounded-md transition-colors cursor-pointer',
                    isActiveChapter
                      ? 'bg-blue-50 text-blue-900 font-bold border-l-[3px] border-blue-600'
                      : 'text-slate-900 bg-slate-50/80 hover:bg-slate-100'
                  )}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className="truncate">{item.title}</span>
                </button>
              </div>
            );
          }

          // Article
          const parentCollapsed = parentChapterId ? collapsed.has(parentChapterId) : false;
          if (parentCollapsed && !searchNorm) return null;

          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={isActive ? activeRef : undefined}
              onClick={() => onItemClick(item)}
              title={item.title}
              aria-current={isActive ? 'location' : undefined}
              className={cn(
                'w-full min-h-[32px] text-left px-3 pl-8 py-1 text-[13px] transition-colors flex items-center gap-2 rounded-md cursor-pointer',
                isActive
                  ? 'bg-blue-50 text-blue-900 font-semibold border-l-[3px] border-blue-600 pl-[29px] shadow-2xs'
                  : 'text-slate-700 font-normal hover:bg-blue-50/40 hover:text-blue-950'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  isActive ? 'bg-blue-600' : 'bg-slate-400 opacity-50'
                )}
              />
              <span className="truncate leading-tight">{item.title}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ─── Notes Panel ─────────────────────────────────────────────────────────────

interface NotesPanelProps {
  annotations: DocumentAnnotation[];
  isLoading: boolean;
  error: string | null;
  hasFullText: boolean;
  currentUserId?: string;
  onNoteClick: (ann: DocumentAnnotation) => void;
  onAddNote: (content: string, visibility?: 'private' | 'team' | 'organization') => void;
  onDeleteAnnotation: (id: string) => void;
}

function NotesPanel({
  annotations,
  isLoading,
  error,
  hasFullText,
  currentUserId,
  onNoteClick,
  onAddNote,
  onDeleteAnnotation,
}: NotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<'private' | 'team' | 'organization'>('private');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'private' | 'team' | 'organization'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAnnotations = useMemo(() => {
    if (filterVisibility === 'all') return annotations;
    return annotations.filter((a) => a.visibility === filterVisibility);
  }, [annotations, filterVisibility]);

  const notes = filteredAnnotations.filter((a) => a.type === 'note');
  const highlights = filteredAnnotations.filter((a) => a.type === 'highlight');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newNote.trim();
    if (!content || isSubmitting) return;
    setIsSubmitting(true);
    onAddNote(sanitizeNoteContent(content), noteVisibility);
    setNewNote('');
    setIsSubmitting(false);
  };

  const handleExportNotes = () => {
    if (annotations.length === 0) return;
    let md = `# BẢNG TỔNG HỢP GHI CHÚ & TRÍCH DẪN PHÁP LÝ\n\n`;
    md += `*Thời gian xuất: ${new Date().toLocaleString('vi-VN')}*\n\n---\n\n`;

    annotations.forEach((ann, idx) => {
      md += `### ${idx + 1}. ${ann.type === 'note' ? '📝 Ghi chú' : '🖍 Highlight'} [${ann.visibility.toUpperCase()}]\n`;
      if (ann.anchor.exactText) {
        md += `> "${ann.anchor.exactText}"\n\n`;
      }
      if (ann.noteContent) {
        md += `**Nội dung:** ${ann.noteContent}\n\n`;
      }
      md += `*Ngày tạo: ${new Date(ann.createdAt).toLocaleDateString('vi-VN')}*\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ghi-chu-phap-ly-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Add note form */}
      <div className="px-3 py-3 border-b border-slate-100 flex-shrink-0">
        {!hasFullText ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-1">
            <p className="font-medium text-slate-700">Chưa thể tạo ghi chú neo đoạn</p>
            <p>Văn bản chưa có toàn văn. Bạn vẫn có thể tạo ghi chú chung cho văn bản này.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Ghi chú mới
              </label>
              {/* Visibility Selector */}
              <div className="flex items-center gap-1 text-[10px]">
                <select
                  value={noteVisibility}
                  onChange={(e) => setNoteVisibility(e.target.value as 'private' | 'team' | 'organization')}
                  className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 font-medium outline-none cursor-pointer"
                >
                  <option value="private">🔒 Cá nhân</option>
                  <option value="team">👥 Đội nhóm</option>
                  <option value="organization">🏢 Doanh nghiệp</option>
                </select>
              </div>
            </div>
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Nhận xét, điều cần lưu ý hoặc hướng xử lý nghiệp vụ..."
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 resize-none"
              aria-label="Nội dung ghi chú"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {noteVisibility === 'private' ? 'Chỉ bạn xem được' : noteVisibility === 'team' ? 'Phòng ban xem được' : 'Toàn tổ chức xem được'}
              </span>
              <button
                type="submit"
                disabled={!newNote.trim() || isSubmitting}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Lưu ghi chú
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Filter Tabs & Export Action */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1">
          {(
            [
              { id: 'all', label: 'Tất cả' },
              { id: 'private', label: 'Cá nhân' },
              { id: 'team', label: 'Nhóm' },
              { id: 'organization', label: 'Tổ chức' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterVisibility(tab.id)}
              className={cn(
                'px-1.5 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer',
                filterVisibility === tab.id
                  ? 'bg-white text-blue-900 font-semibold shadow-2xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {annotations.length > 0 && (
          <button
            onClick={handleExportNotes}
            className="text-[10.5px] text-slate-500 hover:text-blue-700 flex items-center gap-0.5 transition-colors cursor-pointer font-medium"
            title="Xuất bảng tổng hợp ghi chú ra Markdown"
          >
            <Download className="w-3 h-3" />
            <span>Xuất</span>
          </button>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {notes.length === 0 && highlights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-200" />
            <p className="text-xs text-slate-500">Chưa có ghi chú nào trong mục này</p>
          </div>
        ) : (
          <>
            {notes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Ghi chú ({notes.length})
                </h4>
                {notes.map((ann) => (
                  <NoteCard
                    key={ann.id}
                    annotation={ann}
                    isOwn={!currentUserId || ann.userId === currentUserId || ann.userId.startsWith('guest_')}
                    onClick={() => onNoteClick(ann)}
                    onDelete={() => onDeleteAnnotation(ann.id)}
                  />
                ))}
              </div>
            )}

            {highlights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-2">
                  Highlight ({highlights.length})
                </h4>
                {highlights.map((ann) => (
                  <NoteCard
                    key={ann.id}
                    annotation={ann}
                    isOwn={!currentUserId || ann.userId === currentUserId || ann.userId.startsWith('guest_')}
                    onClick={() => onNoteClick(ann)}
                    onDelete={() => onDeleteAnnotation(ann.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


// ─── Note Card ────────────────────────────────────────────────────────────────

const COLOR_LABEL: Record<AnnotationColor, string> = {
  yellow: 'bg-amber-50/90 border-amber-200 hover:border-amber-300 text-slate-900',
  green: 'bg-emerald-50/90 border-emerald-200 hover:border-emerald-300 text-slate-900',
  pink: 'bg-rose-50/90 border-rose-200 hover:border-rose-300 text-slate-900',
  blue: 'bg-sky-50/90 border-sky-200 hover:border-sky-300 text-slate-900',
  purple: 'bg-purple-50/90 border-purple-200 hover:border-purple-300 text-slate-900',
};

const ANCHOR_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  active: { label: '', cls: '' },
  reanchored: { label: '↻ Đã neo lại', cls: 'text-blue-600' },
  orphaned: { label: '⚠ Mất neo', cls: 'text-red-500' },
  deleted: { label: '', cls: '' },
};

function NoteCard({
  annotation: ann,
  isOwn,
  onClick,
  onDelete,
}: {
  annotation: DocumentAnnotation;
  isOwn: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const statusInfo = ANCHOR_STATUS_LABEL[ann.anchorStatus] ?? { label: '', cls: '' };

  return (
    <div
      id={`note-card-${ann.id}`}
      className={cn(
        'group relative p-2.5 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        ann.color && ann.color in COLOR_LABEL ? COLOR_LABEL[ann.color] : 'bg-slate-50 border-slate-200'
      )}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      aria-label={`Ghi chú: ${ann.anchor.exactText.slice(0, 60)}`}
    >
      {/* Anchor excerpt */}
      {ann.anchor.exactText && (
        <p className="text-[10px] text-slate-500 italic border-l-2 border-slate-300 pl-2 mb-1.5 line-clamp-2">
          &ldquo;{ann.anchor.exactText.slice(0, 100)}&rdquo;
        </p>
      )}

      {/* Note content */}
      {ann.noteContent && (
        <p className="text-slate-800 leading-relaxed line-clamp-3">{ann.noteContent}</p>
      )}

      {/* Footer */}
      {/* Footer */}
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span>{new Date(ann.updatedAt).toLocaleDateString('vi-VN')}</span>
          {statusInfo.label && (
            <span className={statusInfo.cls}>{statusInfo.label}</span>
          )}
          <span className="text-slate-300">·</span>
          <span className="text-[9.5px] px-1 py-0.2 rounded font-medium bg-white/70 border border-slate-200/60 text-slate-600">
            {ann.visibility === 'team' ? '👥 Nhóm' : ann.visibility === 'organization' ? '🏢 Tổ chức' : '🔒 Cá nhân'}
          </span>
        </div>
        {isOwn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-red-400 hover:text-red-600 rounded transition-opacity cursor-pointer"
            aria-label="Xóa ghi chú"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function ReaderContextPanel({
  mode,
  onClose,
  tocItems,
  activeTocId,
  onTocItemClick,
  tocCount,
  annotations,
  annotationsLoading,
  annotationsError,
  onNoteClick,
  onAddNote,
  onDeleteAnnotation,
  notesCount,
  hasFullText,
  currentUserId,
}: ReaderContextPanelProps) {
  // Keyboard: Esc closes panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const title = mode === 'toc' ? 'Mục lục' : 'Ghi chú';
  const Icon = mode === 'toc' ? ListTree : StickyNote;

  return (
    <aside
      className={cn(
        'reader-context-panel',
        'flex flex-col bg-white border-l border-slate-200',
        'w-[320px] min-w-[280px] max-w-[420px]',
        'h-full overflow-hidden',
        'flex-shrink-0',
        // Mobile: full-width overlay handled by parent
        'animate-in slide-in-from-right-2 duration-200'
      )}
      aria-label={title}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {title}
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            ({mode === 'toc' ? tocCount : notesCount})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-md transition-colors"
          aria-label={`Đóng ${title}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Panel Body */}
      {mode === 'toc' ? (
        <TocPanel
          items={tocItems}
          activeId={activeTocId}
          onItemClick={onTocItemClick}
        />
      ) : (
        <NotesPanel
          annotations={annotations}
          isLoading={annotationsLoading}
          error={annotationsError}
          hasFullText={hasFullText}
          currentUserId={currentUserId}
          onNoteClick={onNoteClick}
          onAddNote={onAddNote}
          onDeleteAnnotation={onDeleteAnnotation}
        />
      )}
    </aside>
  );
}
