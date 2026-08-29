'use client';

import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  Check,
  Bookmark,
  ArrowLeft,
  MoreHorizontal,
  Printer,
  Download,
  Share2,
  Search,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  ExternalLink,
  RotateCcw,
  RotateCw,
  FileText,
  FileWarning,
  Maximize2,
  Minimize2,
  Upload,
  ShieldCheck,
  Info,
  ListTree,
  StickyNote,
  Sparkles,
  X,
} from 'lucide-react';
import {
  cn,
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_COLORS,
  DOCUMENT_TYPE_LABELS,
  getEffectiveStatus,
  formatDate,
  formatShortTitle,
  getTvplSourceUrl,
  getVerificationBreakdown,
} from '@/lib/utils';
import { getDocumentTopicName } from '@/lib/legal-feed-utils';
import { DEMO_CATEGORIES } from '@/lib/demo-data';
import { highlightHtml, isSafeUrl } from '@/lib/sanitize';
import { formatLegalHtmlContent } from '@/lib/legal-formatter';
import type { LegalDocument, ReaderPanelMode, TocItem, DocumentRelation, AnnotationColor, LegalEffect } from '@/types';
import { ContentQualityValidator } from '@/lib/quality/content-validator';
import { LegalHierarchyTree } from './LegalHierarchyTree';
import { useLocalStorageNumber } from '@/lib/useLocalStorage';
import { getDocumentRelations } from '@/lib/demo-data';
import { extractToc, scrollToTocItem, createTocObserver } from '@/lib/toc-utils';
import { buildAnnotationFromSelection, sanitizeNoteContent } from '@/lib/annotation-engine';
import { useAnnotations } from '@/lib/useAnnotations';
import { DocumentUndoManager } from '@/lib/undo-engine';
import { ReaderContextPanel } from './ReaderContextPanel';
import { LegalAiChatPanel } from './LegalAiChatPanel';
import { SelectionToolbar } from './SelectionToolbar';
import { HighlightLayer } from './HighlightLayer';
import { LegalEffectPanel } from './LegalEffectPanel';
import { PointInTimeSelector } from './PointInTimeSelector';
import { LegalEffectOverlay } from './LegalEffectOverlay';
import { getDocumentLegalEffects } from '@/lib/legal-effects/demo-effects';
import { calculatePointInTimeStats } from '@/lib/legal-effects/timeline-engine';
import { AiSummaryModal } from './AiSummaryModal';
import { createClient } from '@/lib/supabase/client';
// ─── Types ────────────────────────────────────────────────────────────────────

/** Main content tabs — Mục lục and Ghi chú are context panels */
type TabType = 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';

interface DocumentReaderProps {
  document: LegalDocument;
  isRead: boolean;
  isBookmarked: boolean;
  onMarkRead: () => void;
  onToggleBookmark: () => void;
  onSelectRelatedDocument: (id: string) => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  onBack?: () => void;
  initialSearchQuery?: string;
  targetNodeId?: string;
  initialTab?: TabType;
  initialPanel?: ReaderPanelMode;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_SIZE_PRESETS = [13, 14, 16, 18, 20, 22, 24];
const CONTENT_WIDTH_PRESETS = [
  { label: '780px', value: 780 },
  { label: '820px', value: 820 },
  { label: '920px', value: 920 },
];
const LINE_HEIGHT_PRESETS = [
  { label: 'Gọn (1.6)', value: 1.6 },
  { label: 'Tiêu chuẩn (1.75)', value: 1.75 },
  { label: 'Thoáng (2.0)', value: 2.0 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentReader({
  document: doc,
  isRead,
  isBookmarked,
  onMarkRead,
  onToggleBookmark,
  onSelectRelatedDocument,
  onFullscreen,
  isFullscreen,
  onBack,
  initialSearchQuery,
  targetNodeId,
  initialTab,
  initialPanel = 'closed',
  isFocusMode = false,
  onToggleFocusMode,
}: DocumentReaderProps) {
  // ── Display state ──────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<TabType>(
    (initialTab as TabType) || 'noidung'
  );
  const [panelMode, setPanelMode] = useState<ReaderPanelMode>(initialPanel);

  const [fontSize, setFontSize] = useLocalStorageNumber('lb_reader_font_size', 16, 13, 24);
  const [contentWidth, setContentWidth] = useLocalStorageNumber(
    'lb_reader_content_width',
    820,
    700,
    1100
  );
  const [lineHeight, setLineHeight] = useState<number>(1.75);
  const [searchInputValue, setSearchInputValue] = useState<string>(initialSearchQuery || '');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>(initialSearchQuery || '');
  const [activeMatchIndex, setActiveMatchIndex] = useState<number>(0);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [pdfZoomMode, setPdfZoomMode] = useState<'FitH' | 'Fit' | '125' | '150'>('FitH');
  const [selectedPdfFileIndex, setSelectedPdfFileIndex] = useState<number>(0);
  const [quickViewDocId, setQuickViewDocId] = useState<string | null>(null);
  const showQuickViewPdf = quickViewDocId === doc.id;
  const [showAiSummaryModal, setShowAiSummaryModal] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────

  const viewportRef = useRef<HTMLDivElement>(null);   // the scrollable viewport
  const contentRef = useRef<HTMLDivElement>(null);    // the document text container
  const readerRootRef = useRef<HTMLDivElement>(null);
  const fontSizeMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [contentReady, setContentReady] = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────

  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
    });
  }, []);

  // ── Quality & Relations ────────────────────────────────────────────────

  const qualityResult = useMemo(
    () =>
      ContentQualityValidator.validate({
        htmlContent: doc.html_content,
        title: doc.title,
        documentNumber: doc.document_number,
        documentType: doc.document_type,
        summaryMain: doc.summary_main,
        summaryNewPoints: doc.summary_new_points,
        hasAttachedFiles: Boolean(doc.files && doc.files.length > 0),
      }),
    [doc]
  );

  const hasFullText =
    qualityResult.status !== 'invalid' &&
    !qualityResult.isFakeOrPlaceholder &&
    Boolean(doc.html_content);

  const relationsRaw = getDocumentRelations(doc.id);
  const asSource: DocumentRelation[] = Array.isArray(relationsRaw)
    ? relationsRaw.filter((r) => r.source_document_id === doc.id)
    : relationsRaw?.as_source || [];
  const asTarget: DocumentRelation[] = Array.isArray(relationsRaw)
    ? relationsRaw.filter((r) => r.target_document_id === doc.id)
    : relationsRaw?.as_target || [];
  const relationsCount = asSource.length + asTarget.length;
  const replacementSource = asSource.find((r) => r.relation_type === 'thay_the');

  // ── Title Normalization ────────────────────────────────────────────────
  const displayTitle = useMemo(() => {
    return formatShortTitle(doc.title, doc.document_type, doc.document_number);
  }, [doc.title, doc.document_number, doc.document_type]);

  const topicName = useMemo(() => {
    return getDocumentTopicName(doc.id, DEMO_CATEGORIES);
  }, [doc.id]);

  // ── Legal Effects & Point In Time ──────────────────────────────────────
  const [selectedPointInTimeDate, setSelectedPointInTimeDate] = useState('2026-08-29');
  const [showLegalEffectsOverlay, setShowLegalEffectsOverlay] = useState(true);
  const [activeLegalEffect, setActiveLegalEffect] = useState<LegalEffect | null>(null);

  const documentLegalEffects = useMemo(() => getDocumentLegalEffects(doc.id), [doc.id]);
  const activePointInTimeStats = useMemo(
    () => calculatePointInTimeStats(documentLegalEffects, selectedPointInTimeDate),
    [documentLegalEffects, selectedPointInTimeDate]
  );

  // ── TOC ───────────────────────────────────────────────────────────────
  const tocItems: TocItem[] = useMemo(
    () => (hasFullText ? extractToc(doc.html_content) : []),
    [hasFullText, doc.html_content]
  );
  const [activeTocId, setActiveTocId] = useState<string | null>(null);
  // IntersectionObserver-based TOC active tracking
  useEffect(() => {
    if (!contentRef.current || !viewportRef.current || tocItems.length === 0) return;
    const cleanup = createTocObserver({
      container: viewportRef.current,
      contentEl: contentRef.current,
      tocItems,
      onActiveChange: setActiveTocId,
    });
    return cleanup;
  }, [tocItems, contentReady]);

  // ── Annotations ────────────────────────────────────────────────────────

  const contentVersion = doc.updated_at;
  const {
    annotations,
    isLoading: annotationsLoading,
    error: annotationsError,
    addAnnotation,
    deleteAnnotation,
    restoreAnnotation,
    reanchorAnnotation: reanchorAnnotationHook,
  } = useAnnotations({ documentId: doc.id, contentVersion });

  // ── Undo / Redo Engine (Ctrl+Z / Ctrl+Y) ──────────────────────────────────
  const undoManagerRef = useRef<DocumentUndoManager>(new DocumentUndoManager());
  const [canUndoState, setCanUndoState] = useState(false);
  const [canRedoState, setCanRedoState] = useState(false);
  const [undoToast, setUndoToast] = useState<{ message: string; actionText?: string; onAction?: () => void } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | number | undefined>(undefined);

  const updateUndoRedoState = useCallback(() => {
    setCanUndoState(undoManagerRef.current.canUndo());
    setCanRedoState(undoManagerRef.current.canRedo());
  }, []);

  const showToast = useCallback((message: string, actionText?: string, onAction?: () => void) => {
    clearTimeout(toastTimeoutRef.current);
    setUndoToast({ message, actionText, onAction });
    toastTimeoutRef.current = setTimeout(() => {
      setUndoToast(null);
    }, 3500);
  }, []);

  const executeUndoRef = useRef<() => Promise<void>>(async () => {});
  const executeRedoRef = useRef<() => Promise<void>>(async () => {});

  const executeUndo = useCallback(async () => {
    const action = undoManagerRef.current.undo();
    if (!action) return;

    if (action.type === 'add_annotation') {
      await deleteAnnotation(action.annotation.id);
    } else if (action.type === 'delete_annotation') {
      await restoreAnnotation(action.annotation);
    } else if (action.type === 'update_annotation' && action.previousAnnotation) {
      await restoreAnnotation(action.previousAnnotation);
    }

    updateUndoRedoState();
    showToast(`Đã hoàn tác: ${action.description}`, 'Làm lại', () => {
      void executeRedoRef.current();
    });
  }, [deleteAnnotation, restoreAnnotation, updateUndoRedoState, showToast]);

  const executeRedo = useCallback(async () => {
    const action = undoManagerRef.current.redo();
    if (!action) return;

    if (action.type === 'add_annotation') {
      await restoreAnnotation(action.annotation);
    } else if (action.type === 'delete_annotation') {
      await deleteAnnotation(action.annotation.id);
    } else if (action.type === 'update_annotation') {
      await restoreAnnotation(action.annotation);
    }

    updateUndoRedoState();
    showToast(`Đã làm lại: ${action.description}`, 'Hoàn tác', () => {
      void executeUndoRef.current();
    });
  }, [deleteAnnotation, restoreAnnotation, updateUndoRedoState, showToast]);

  useEffect(() => {
    executeUndoRef.current = executeUndo;
    executeRedoRef.current = executeRedo;
  }, [executeUndo, executeRedo]);

  const handleDeleteAnnotationWithUndo = useCallback(
    async (id: string) => {
      const target = annotations.find((a) => a.id === id);
      if (target) {
        undoManagerRef.current.pushAction({
          type: 'delete_annotation',
          description: target.type === 'note' ? 'Xóa ghi chú' : 'Xóa highlight',
          annotation: target,
        });
        updateUndoRedoState();
        showToast(
          target.type === 'note' ? 'Đã xóa ghi chú' : 'Đã xóa highlight',
          'Hoàn tác (Ctrl+Z)',
          () => executeUndo()
        );
      }
      await deleteAnnotation(id);
    },
    [annotations, deleteAnnotation, updateUndoRedoState, showToast, executeUndo]
  );

  const notesCount = annotations.filter((a) => a.type === 'note').length;
  const highlightCount = annotations.filter((a) => a.type === 'highlight').length;
  const totalAnnotationsCount = notesCount + highlightCount;
  // ── Debounce Search Input ───────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInputValue.trim();
      setDebouncedSearchQuery(trimmed.length >= 2 ? trimmed : '');
      setActiveMatchIndex(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInputValue]);

  // ── Rendered HTML with 2-Column Administrative Letterhead & Styling ─────
  const renderedHtml = useMemo(() => {
    if (!doc.html_content) return null;
    const formatted = formatLegalHtmlContent(doc.html_content, doc);
    const { html } = highlightHtml(formatted, debouncedSearchQuery);
    return html;
  }, [doc, debouncedSearchQuery]);

  // Track and highlight active search match in DOM
  useEffect(() => {
    if (!contentRef.current || !debouncedSearchQuery) {
      setTotalMatches(0);
      return;
    }
    const marks = contentRef.current.querySelectorAll<HTMLElement>('mark.search-highlight, mark:not(.reader-annotation-mark)');
    setTotalMatches(marks.length);

    marks.forEach((m, idx) => {
      if (idx === activeMatchIndex) {
        m.classList.add('active-search-match');
        m.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        m.classList.remove('active-search-match');
      }
    });
  }, [debouncedSearchQuery, activeMatchIndex, renderedHtml]);

  const handleNextSearchMatch = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % totalMatches);
  }, [totalMatches]);

  const handlePrevSearchMatch = useCallback(() => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  }, [totalMatches]);

  const handleClearSearch = useCallback(() => {
    setSearchInputValue('');
    setDebouncedSearchQuery('');
    setActiveMatchIndex(0);
    setTotalMatches(0);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchInputValue.trim();
      if (trimmed && trimmed !== debouncedSearchQuery) {
        setDebouncedSearchQuery(trimmed);
        setActiveMatchIndex(0);
      } else if (totalMatches > 0) {
        if (e.shiftKey) {
          handlePrevSearchMatch();
        } else {
          handleNextSearchMatch();
        }
      }
    } else if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  // Mark content as ready after HTML mounts
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (renderedHtml) {
      t = setTimeout(() => setContentReady(true), 100);
    } else {
      t = setTimeout(() => setContentReady(false), 0);
    }
    return () => clearTimeout(t);
  }, [renderedHtml]);

  // ── Panel helpers ──────────────────────────────────────────────────────

  const togglePanel = useCallback(
    (mode: Exclude<ReaderPanelMode, 'closed'>) => {
      setPanelMode((prev) => (prev === mode ? 'closed' : mode));
    },
    []
  );

  // ── Scroll to target on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!targetNodeId && !initialSearchQuery) return;
    const timeout = setTimeout(() => {
      if (!contentRef.current) return;
      let targetEl: HTMLElement | null = null;

      if (targetNodeId) {
        targetEl = contentRef.current.querySelector(`#${targetNodeId}`);
      }
      if (!targetEl && targetNodeId?.startsWith('dieu-')) {
        const num = targetNodeId.replace('dieu-', '');
        const els = contentRef.current.querySelectorAll('strong, h2, h3, p');
        for (const h of els) {
          if (new RegExp(`^\\s*Điều\\s+${num}\\b`, 'i').test(h.textContent || '')) {
            targetEl = h as HTMLElement;
            break;
          }
        }
      }
      if (!targetEl && initialSearchQuery) {
        targetEl = contentRef.current.querySelector('mark');
      }

      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('toc-scroll-target');
        setTimeout(() => targetEl?.classList.remove('toc-scroll-target'), 2000);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [doc.id, targetNodeId, initialSearchQuery]);


  // ── Close menus on outside click ───────────────────────────────────────

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fontSizeMenuRef.current && !fontSizeMenuRef.current.contains(e.target as Node))
        setShowFontSizeMenu(false);
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node))
        setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Font size handlers ─────────────────────────────────────────────────

  const handleFontSizeChange = useCallback(
    (delta: number) => setFontSize((prev) => Math.max(13, Math.min(24, prev + delta))),
    [setFontSize]
  );
  const handleSetExactFontSize = (size: number) => {
    setFontSize(Math.max(13, Math.min(24, size)));
    setShowFontSizeMenu(false);
  };
  const handleResetDefaults = useCallback(() => {
    setFontSize(16);
    setContentWidth(820);
    setLineHeight(1.75);
    setShowFontSizeMenu(false);
  }, [setFontSize, setContentWidth]);

  // Ctrl+=/- keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') { e.preventDefault(); handleFontSizeChange(1); }
        else if (e.key === '-') { e.preventDefault(); handleFontSizeChange(-1); }
        else if (e.key === '0') { e.preventDefault(); handleResetDefaults(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleFontSizeChange, handleResetDefaults]);

  // ── Scroll utilities ───────────────────────────────────────────────────

  const [isScrolledHeader, setIsScrolledHeader] = useState(false);

  const handleScroll = () => {
    if (viewportRef.current) {
      const top = viewportRef.current.scrollTop;
      setShowBackToTop(top > 300);
      setIsScrolledHeader(top > 120);
    }
  };
  const scrollToTop = () => viewportRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  // ── Share / Copy ───────────────────────────────────────────────────────

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setShowMoreMenu(false);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── TOC click ─────────────────────────────────────────────────────────

  const handleTocClick = useCallback(
    (item: TocItem) => {
      setActiveTocId(item.id);

      if (activeTab !== 'noidung') {
        setActiveTab('noidung');
      }

      const performScroll = () => {
        if (!contentRef.current) return;
        scrollToTocItem(contentRef.current, item);
        if (item.articleNumber) {
          window.history.pushState(null, '', `#article-${item.articleNumber}`);
        }
      };

      if (activeTab !== 'noidung') {
        setTimeout(performScroll, 80);
      } else {
        performScroll();
      }
    },
    [activeTab]
  );

  // ── Note click ─────────────────────────────────────────────────────────

  const handleNoteClick = useCallback(
    (ann: (typeof annotations)[0]) => {
      if (!contentRef.current) return;
      const mark = contentRef.current.querySelector(
        `[data-annotation-id="${ann.id}"]`
      );
      if (mark) {
        mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash animation
        mark.classList.add('ring-2', 'ring-blue-500', 'ring-offset-1');
        setTimeout(() => mark.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-1'), 1500);
      }
    },
    []
  );

  // ── Selection toolbar handlers ─────────────────────────────────────────

  const handleHighlight = useCallback(
    async (color: AnnotationColor = 'yellow') => {
      if (!contentRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
      const effectiveUserId = currentUserId || 'guest_user';
      const draft = buildAnnotationFromSelection(sel, contentRef.current, {
        documentId: doc.id,
        userId: effectiveUserId,
        contentVersion,
        type: 'highlight',
        color,
      });
      if (draft) {
        const created = await addAnnotation({ ...draft, anchorStatus: 'active' });
        if (created) {
          undoManagerRef.current.pushAction({
            type: 'add_annotation',
            description: 'Tô màu đoạn văn',
            annotation: created,
          });
          updateUndoRedoState();
          showToast('Đã tô màu đoạn văn', 'Hoàn tác (Ctrl+Z)', () => executeUndo());
        }
      }
      sel.removeAllRanges();
    },
    [currentUserId, doc.id, contentVersion, addAnnotation, updateUndoRedoState, showToast, executeUndo]
  );

  const handleAddNoteFromSelection = useCallback(async () => {
    if (!contentRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
    const effectiveUserId = currentUserId || 'guest_user';
    const draft = buildAnnotationFromSelection(sel, contentRef.current, {
      documentId: doc.id,
      userId: effectiveUserId,
      contentVersion,
      type: 'note',
      color: 'yellow',
    });
    if (draft) {
      setPanelMode('notes');
      const created = await addAnnotation({ ...draft, anchorStatus: 'active' });
      if (created) {
        undoManagerRef.current.pushAction({
          type: 'add_annotation',
          description: 'Tạo ghi chú mới',
          annotation: created,
        });
        updateUndoRedoState();
        showToast('Đã tạo ghi chú', 'Hoàn tác (Ctrl+Z)', () => executeUndo());
      }
    }
    sel.removeAllRanges();
  }, [currentUserId, doc.id, contentVersion, addAnnotation, updateUndoRedoState, showToast, executeUndo]);

  const handleCopySelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel) navigator.clipboard.writeText(sel.toString());
  }, []);

  const handleCopySelectionLink = useCallback(() => {
    const sel = window.getSelection();
    if (!sel) return;
    const text = sel.toString().slice(0, 80);
    const url = `${window.location.href.split('#')[0]}#selection=${encodeURIComponent(text)}`;
    navigator.clipboard.writeText(url);
  }, []);

  const handleAddNoteFromPanel = useCallback(
    async (noteContent: string, visibility: 'private' | 'team' | 'organization' = 'private') => {
      const effectiveUserId = currentUserId || 'guest_user';
      const sanitized = sanitizeNoteContent(noteContent);
      await addAnnotation({
        documentId: doc.id,
        userId: effectiveUserId,
        anchor: {
          exactText: '',
          contentVersion,
        },
        type: 'note',
        color: 'yellow',
        noteContent: sanitized,
        visibility,
        anchorStatus: 'active',
      });
    },
    [currentUserId, doc.id, contentVersion, addAnnotation]
  );

  // Handle clicking on highlight marks inside the document content
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const handleMarkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest('[data-annotation-id]') as HTMLElement | null;
      if (!mark) return;

      const annId = mark.getAttribute('data-annotation-id');
      if (annId) {
        setPanelMode('notes');
        setTimeout(() => {
          const card = document.getElementById(`note-card-${annId}`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            card.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => card.classList.remove('ring-2', 'ring-blue-500'), 1500);
          }
        }, 120);
      }
    };

    container.addEventListener('click', handleMarkClick);
    return () => container.removeEventListener('click', handleMarkClick);
  }, []);

  // Keyboard Shortcuts: Press H to highlight, Ctrl+Z to undo, Ctrl+Y / Ctrl+Shift+Z to redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) {
          executeRedo();
        } else {
          executeUndo();
        }
        return;
      }

      // Redo: Ctrl+Y / Cmd+Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        executeRedo();
        return;
      }

      // Fast Highlight: H
      if (e.key === 'h' || e.key === 'H') {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

        const container = contentRef.current;
        if (!container) return;

        try {
          const range = sel.getRangeAt(0);
          if (container.contains(range.startContainer) || container.contains(range.endContainer)) {
            e.preventDefault();
            handleHighlight('yellow');
          }
        } catch {}
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleHighlight, executeUndo, executeRedo]);
  const handleOrphaned = useCallback((ids: string[]) => {
    console.warn('[Reader] Orphaned annotations:', ids);
  }, []);

  const handleReanchor = useCallback(
    async (id: string, updatedAnchor: (typeof annotations)[0]['anchor']) => {
      await reanchorAnnotationHook(id, updatedAnchor);
    },
    [reanchorAnnotationHook]
  );

  const tvplUrl = getTvplSourceUrl(doc);
  const hasPdfUrl = Boolean(doc.files?.some((f) => f.file_type === 'pdf'));

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={readerRootRef}
      className="document-reader flex-1 flex flex-col h-full bg-slate-100 overflow-hidden select-text text-slate-900"
      style={{
        '--reader-font-size': `${fontSize}px`,
        '--reader-line-height': lineHeight,
        '--reader-content-width': `${contentWidth}px`,
        '--reader-background': '#f8fafc',
      } as React.CSSProperties}
    >
      <div className="reader-workspace flex flex-1 overflow-hidden h-full">
        {/* ── Scrollable Document Viewport (Centered Canvas) ── */}
        <div
          ref={viewportRef}
          onScroll={handleScroll}
          className={cn(
            "reader-viewport flex-1 overflow-y-auto relative min-w-0 flex flex-col",
            activeTab === 'banggoc' ? 'p-0 flex flex-col h-full overflow-hidden bg-slate-900/5' : ''
          )}
        >
      {/* ================================================================
          1. DOCUMENT HEADER (Standardized Spacing & Refined Actions)
          ================================================================ */}
      <header className="px-4 sm:px-6 py-2 sm:py-2.5 border-b border-slate-200 bg-white shrink-0 shadow-2xs">
        {/* Dòng 1: Breadcrumb + Số hiệu (trái) + Trạng thái & Actions (phải) */}
        <div className="flex items-center justify-between gap-2.5 mb-1.5 min-w-0">
          {/* Breadcrumb + Document Number */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 min-w-0 truncate">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 p-1 -ml-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors shrink-0 cursor-pointer font-medium"
                title="Quay lại danh sách / Trang chủ"
                aria-label="Quay lại danh sách hoặc trang chủ"
              >
                <ArrowLeft className="w-4 h-4 text-blue-700 shrink-0" />
                <span className="hidden sm:inline text-xs font-semibold text-blue-900">Trang chủ</span>
                <span className="text-slate-300 hidden sm:inline">/</span>
              </button>
            )}
            <span className="text-slate-500 font-medium truncate">{topicName || 'Pháp luật'}</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500 font-medium truncate">{DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}</span>
            {doc.document_number && (
              <>
                <span className="text-slate-300">/</span>
                <span className="font-mono text-blue-900 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/80 truncate">
                  {doc.document_number}
                </span>
              </>
            )}
          </div>

          {/* Actions & Status Badges */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Status Badge */}
            {(() => {
              const effStatus = getEffectiveStatus(doc);
              return (
                <span className={cn('px-2 py-0.5 rounded text-[11px] font-semibold border', DOCUMENT_STATUS_COLORS[effStatus])}>
                  {DOCUMENT_STATUS_LABELS[effStatus]}
                </span>
              );
            })()}

            {/* Verification status badge with tooltip */}
            {(() => {
              const breakdown = getVerificationBreakdown(doc);
              return (
                <div className="relative group">
                  <button
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors flex items-center gap-1 cursor-help',
                      breakdown.primaryBadge.badgeColor
                    )}
                    title={breakdown.primaryBadge.tooltip}
                  >
                    <span>{breakdown.primaryBadge.label}</span>
                    <Info className="w-3 h-3 opacity-60" />
                  </button>
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 hidden group-hover:block group-focus-within:block text-xs space-y-2 animate-in fade-in duration-150">
                    <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-700">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                      Trạng thái đối chiếu dữ liệu
                    </div>
                    <div className="space-y-1.5 text-[11px]">
                      {[
                        { label: 'Thuộc tính:', info: breakdown.metadata },
                        { label: 'Toàn văn:', info: breakdown.content },
                        { label: 'Nguồn dữ liệu:', info: breakdown.source },
                        { label: 'Quan hệ pháp lý:', info: breakdown.relationship },
                      ].map(({ label, info }) => (
                        <div key={label} className="flex items-center justify-between p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-500">{label}</span>
                          <span className={cn('px-1.5 py-0.2 rounded font-semibold text-[10px]', info.badgeColor)}>
                            {info.label.replace(/^[^:]+:\s*/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Read status button */}
            <button
              onClick={onMarkRead}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors cursor-pointer',
                isRead
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              )}
              title={isRead ? 'Đã đọc — Nhấn để đánh dấu chưa đọc' : 'Nhấn để đánh dấu đã đọc'}
              aria-label={isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
            >
              <Check className={cn('w-3.5 h-3.5', isRead ? 'text-emerald-600 stroke-[2.5]' : 'text-slate-400')} />
              <span className="hidden sm:inline">{isRead ? 'Đã đọc' : 'Chưa đọc'}</span>
            </button>

            {/* Bookmark button */}
            <button
              onClick={onToggleBookmark}
              className={cn(
                'p-1.5 rounded border transition-colors cursor-pointer',
                isBookmarked
                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                  : 'text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-100'
              )}
              title={isBookmarked ? 'Bỏ lưu văn bản' : 'Lưu văn bản'}
              aria-label={isBookmarked ? 'Bỏ lưu văn bản' : 'Lưu văn bản'}
            >
              <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
            </button>

            {/* Focus Mode action */}
            {onToggleFocusMode && (
              <button
                onClick={onToggleFocusMode}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded border text-xs font-medium transition-colors cursor-pointer hidden md:inline-flex',
                  isFocusMode
                    ? 'bg-blue-700 text-white border-blue-700 font-semibold'
                    : 'text-slate-700 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-100'
                )}
                title={isFocusMode ? 'Thoát tập trung (Esc hoặc F)' : 'Tập trung đọc (F)'}
                aria-label={isFocusMode ? 'Thoát tập trung đọc' : 'Tập trung đọc'}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{isFocusMode ? 'Thoát tập trung' : 'Tập trung'}</span>
              </button>
            )}

            {/* Overflow menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tác vụ khác"
                aria-label="Tác vụ khác"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 text-xs animate-in fade-in duration-100">
                  {onToggleFocusMode && (
                    <button
                      onClick={() => { onToggleFocusMode(); setShowMoreMenu(false); }}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 md:hidden cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isFocusMode ? 'Thoát tập trung' : 'Tập trung đọc'}</span>
                    </button>
                  )}
                  {onFullscreen && (
                    <button
                      onClick={() => { onFullscreen(); setShowMoreMenu(false); }}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-slate-500" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-500" />}
                      <span>{isFullscreen ? 'Thu nhỏ cửa sổ đọc' : 'Toàn màn hình trình duyệt'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => { window.print(); setShowMoreMenu(false); }}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>In văn bản</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sao chép liên kết</span>
                  </button>
                  {doc.files && doc.files.length > 0 && (
                    <a
                      href={doc.files[0].file_url}
                      download={doc.files[0].original_filename}
                      onClick={() => setShowMoreMenu(false)}
                      className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>Tải tệp gốc ({doc.files[0].file_type.toUpperCase()})</span>
                    </a>
                  )}
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      alert('Đã gửi thông báo kiểm tra đến Ban biên tập.');
                      setShowMoreMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-slate-500 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                  >
                    <FileWarning className="w-3.5 h-3.5 text-slate-400" />
                    <span>Báo lỗi nội dung</span>
                  </button>
                </div>
              )}
            </div>
            {copied && (
              <span className="text-xs text-emerald-600 font-medium animate-in fade-in">
                Đã chép link
              </span>
            )}
          </div>
        </div>

        {/* Dòng 2: Tiêu đề văn bản (Max 2 dòng, line-clamp-2) */}
        <div className="py-0.5 min-w-0">
          <h1
            className="text-[15px] sm:text-[16px] md:text-[17px] font-bold text-slate-950 leading-snug line-clamp-2 break-words"
            title={doc.title}
          >
            {displayTitle}
          </h1>
        </div>

        {/* Dòng 3: Metadata gọn gàng (Ngày ban hành → Ngày hiệu lực · Cơ quan · Người ký · Nguồn ↗) */}
        <div className="flex items-center gap-x-2.5 gap-y-1 text-xs text-slate-600 flex-wrap pt-0.5 leading-normal">
          {doc.issued_date && (
            <span className="whitespace-nowrap text-slate-700 font-medium">
              {formatDate(doc.issued_date)}
              {doc.effective_date && (
                <>
                  <span className="text-slate-400 font-normal mx-1">→</span>
                  <strong className="text-slate-900 font-semibold">{formatDate(doc.effective_date)}</strong>
                </>
              )}
            </span>
          )}

          {doc.issuing_body && (
            <>
              <span className="text-slate-300">·</span>
              <span className="whitespace-nowrap text-slate-700">{doc.issuing_body}</span>
            </>
          )}

          {doc.signer && (
            <>
              <span className="text-slate-300">·</span>
              <span className="whitespace-nowrap text-slate-600">{doc.signer}</span>
            </>
          )}

          <span className="text-slate-300">·</span>
          <a
            href={tvplUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-blue-700 hover:text-blue-900 font-medium hover:underline ml-auto sm:ml-0"
            title="Mở nguồn chính thức Thư Viện Pháp Luật"
          >
            <span>Nguồn</span>
            <ExternalLink className="w-3 h-3 text-blue-600" />
          </a>
        </div>
      </header>

      {/* Point In Time Legal Effect Sub-bar */}
      {activeTab === 'noidung' && (
        <PointInTimeSelector
          issuedDate={doc.issued_date}
          selectedDate={selectedPointInTimeDate}
          onSelectDate={setSelectedPointInTimeDate}
          showOverlay={showLegalEffectsOverlay}
          onToggleShowOverlay={() => setShowLegalEffectsOverlay((prev) => !prev)}
          activeEffectsCount={activePointInTimeStats.totalActiveEffects}
          totalEffectsCount={documentLegalEffects.length}
        />
      )}
      {/* ================================================================
          2. STICKY TOOLBAR (Compact 44-48px)
          ================================================================ */}
      <div className="sticky top-0 z-20 px-3.5 sm:px-6 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0 min-h-[44px] max-h-[50px] shadow-2xs">
        {/* Left: Main content tabs */}
        <div className="flex items-center gap-1.5 py-1 overflow-x-auto scrollbar-none min-w-0">
          {isScrolledHeader && doc.document_number && (
            <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/80 shrink-0 hidden sm:inline-block animate-in fade-in duration-150">
              {doc.document_number}
            </span>
          )}
          {(
            [
              { id: 'noidung', label: 'Nội dung' },
              {
                id: 'banggoc',
                label: 'Bản gốc',
                badge: hasPdfUrl ? 'PDF' : undefined,
                badgeClass: 'text-blue-700 bg-blue-50 px-1 py-0.2 rounded text-[9.5px] border border-blue-200 font-sans',
              },
              {
                id: 'quanhe',
                label: 'Quan hệ',
                badge: relationsCount > 0 ? relationsCount : undefined,
                badgeClass: 'text-blue-600',
              },
              { id: 'thongtin', label: 'Tóm tắt' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1 cursor-pointer',
                activeTab === tab.id
                  ? 'bg-slate-100 text-blue-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <span>{tab.label}</span>
              {'badge' in tab && tab.badge !== undefined && (
                <span className={cn('text-[10px] font-mono font-bold', tab.badgeClass)}>
                  ({tab.badge})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right: Search + Panels + Compact Typography Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 py-1 shrink-0 ml-auto">
          {/* Desktop in-document search */}
          <div className="relative hidden md:flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm trong văn bản..."
              className={cn(
                'pl-7 py-1 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-md text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all',
                searchInputValue ? 'pr-20 w-44 lg:w-56' : 'pr-2 w-28 lg:w-36 focus:w-48'
              )}
            />
            {/* Match Navigation Controls */}
            {searchInputValue && (
              <div className="absolute right-1 flex items-center gap-0.5 text-[10.5px]">
                {debouncedSearchQuery && totalMatches > 0 ? (
                  <>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-200/80">
                      {activeMatchIndex + 1}/{totalMatches}
                    </span>
                    <button
                      onClick={handlePrevSearchMatch}
                      className="p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 rounded cursor-pointer"
                      title="Kết quả trước (Shift + Enter)"
                      aria-label="Kết quả trước"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleNextSearchMatch}
                      className="p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/80 rounded cursor-pointer"
                      title="Kết quả tiếp (Enter)"
                      aria-label="Kết quả tiếp"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </>
                ) : debouncedSearchQuery && totalMatches === 0 ? (
                  <span className="text-[10px] text-slate-400 font-mono px-1">0/0</span>
                ) : null}

                <button
                  onClick={handleClearSearch}
                  className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded cursor-pointer"
                  title="Xóa tìm kiếm (Esc)"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Search button for mobile / compact view */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tìm trong văn bản"
            aria-label="Tìm trong văn bản"
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Legal AI Q&A Assistant Toggle */}
          {activeTab === 'noidung' && (
            <button
              type="button"
              onClick={() => togglePanel('ai')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs',
                panelMode === 'ai'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 text-blue-900 border-blue-200/90 hover:border-blue-300 hover:bg-blue-100/70'
              )}
              title="Trợ lý Pháp lý AI (Hỏi đáp & Tóm tắt với Gemini 2.5)"
              aria-label="Trợ lý Pháp lý AI"
              aria-pressed={panelMode === 'ai'}
            >
              <Sparkles className={cn('w-3.5 h-3.5 shrink-0', panelMode === 'ai' ? 'text-white' : 'text-blue-600')} />
              <span className="hidden sm:inline">Hỏi đáp AI</span>
            </button>
          )}

          {/* AI Document Summary Quick Action */}
          <button
            type="button"
            onClick={() => setShowAiSummaryModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 text-amber-950 border-amber-300/90 hover:border-amber-400"
            title="Tóm tắt toàn văn văn bản bằng AI (Điểm mới, Lộ trình, Căn cứ Điều/Khoản)"
            aria-label="Tóm tắt AI"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="hidden sm:inline">Tóm tắt AI</span>
          </button>

          {/* TOC context panel toggle */}
          {activeTab === 'noidung' && (
            <button
              onClick={() => togglePanel('toc')}
              className={cn(
                'flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                panelMode === 'toc'
                  ? 'bg-slate-100 text-blue-900 border-slate-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
              )}
              title="Mục lục điều khoản"
              aria-label={`Mục lục ${tocItems.length > 0 ? `(${tocItems.length})` : ''}`}
              aria-pressed={panelMode === 'toc'}
            >
              <ListTree className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Mục lục</span>
              {tocItems.length > 0 && (
                <span className="text-[10px] font-mono text-slate-500">
                  {tocItems.length}
                </span>
              )}
            </button>
          )}
          {/* Notes context panel toggle */}
          {activeTab === 'noidung' && (
            <button
              onClick={() => togglePanel('notes')}
              className={cn(
                'flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer',
                panelMode === 'notes'
                  ? 'bg-slate-100 text-blue-900 border-slate-300 font-semibold'
                  : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
              )}
              title="Ghi chú và highlight"
              aria-label={`Ghi chú ${totalAnnotationsCount > 0 ? `(${totalAnnotationsCount})` : ''}`}
              aria-pressed={panelMode === 'notes'}
            >
              <StickyNote className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Ghi chú</span>
              {totalAnnotationsCount > 0 && (
                <span className="text-[10px] font-mono text-amber-600 font-bold">
                  {totalAnnotationsCount}
                </span>
              )}
            </button>
          )}

          {/* Undo / Redo Toolbar buttons */}
          <div className="hidden sm:flex items-center bg-white border border-slate-200/90 rounded-md p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={executeUndo}
              disabled={!canUndoState}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Hoàn tác thao tác trên văn bản (Ctrl + Z)"
              aria-label="Hoàn tác (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={executeRedo}
              disabled={!canRedoState}
              className="p-1 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-slate-100 transition-colors cursor-pointer"
              title="Làm lại thao tác trên văn bản (Ctrl + Y)"
              aria-label="Làm lại (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Unified Typography & Display Popover [Aa] */}
          <div className="relative shrink-0" ref={fontSizeMenuRef}>
            <button
              onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs',
                showFontSizeMenu
                  ? 'bg-blue-50 text-blue-900 border-blue-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              )}
              title="Tùy chỉnh cỡ chữ và giao diện đọc (Aa)"
              aria-label="Tùy chỉnh cỡ chữ và giao diện đọc"
              aria-expanded={showFontSizeMenu}
            >
              <span className="font-serif text-sm font-bold leading-none">Aa</span>
              <span className="text-[11px] font-mono text-slate-500 font-normal hidden xs:inline">
                {fontSize}px
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showFontSizeMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-3.5 z-50 text-xs space-y-3.5 animate-in fade-in duration-100">
                {/* 1. Cỡ chữ (Font size) */}
                <div>
                  <div className="flex items-center justify-between text-slate-700 mb-1.5">
                    <span className="font-semibold text-slate-900">Cỡ chữ văn bản</span>
                    <span className="font-mono text-slate-500 font-semibold">{fontSize}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFontSizeChange(-1)}
                      disabled={fontSize <= 13}
                      className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-30 font-semibold text-xs transition-colors cursor-pointer"
                      title="Giảm cỡ chữ (A-)"
                    >
                      A-
                    </button>
                    <input
                      type="range"
                      min="13"
                      max="24"
                      value={fontSize}
                      onChange={(e) => handleSetExactFontSize(Number(e.target.value))}
                      className="flex-1 accent-blue-600 cursor-pointer"
                      aria-label="Thanh trượt cỡ chữ"
                    />
                    <button
                      onClick={() => handleFontSizeChange(1)}
                      disabled={fontSize >= 24}
                      className="px-2.5 py-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-30 font-semibold text-xs transition-colors cursor-pointer"
                      title="Tăng cỡ chữ (A+)"
                    >
                      A+
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-1 pt-1.5">
                    {FONT_SIZE_PRESETS.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => handleSetExactFontSize(sz)}
                        className={cn(
                          'flex-1 py-0.5 text-[10.5px] font-mono rounded border transition-colors cursor-pointer text-center',
                          fontSize === sz
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                            : 'border-slate-100 text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        )}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Độ rộng trang giấy (Content Width) */}
                <div>
                  <span className="font-semibold text-slate-900 block mb-1.5">Độ rộng trang</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CONTENT_WIDTH_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setContentWidth(p.value)}
                        className={cn(
                          'py-1 px-1.5 border rounded text-center text-[11px] transition-colors cursor-pointer',
                          contentWidth === p.value
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Khoảng cách dòng (Line Height) */}
                <div>
                  <span className="font-semibold text-slate-900 block mb-1.5">Giãn dòng</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LINE_HEIGHT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setLineHeight(p.value)}
                        className={cn(
                          'py-1 px-1.5 border rounded text-center text-[11px] transition-colors cursor-pointer',
                          lineHeight === p.value
                            ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        )}
                      >
                        {p.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reset button */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <button
                    onClick={handleResetDefaults}
                    className="text-slate-500 hover:text-slate-800 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Đặt lại mặc định</span>
                  </button>
                  <button
                    onClick={() => setShowFontSizeMenu(false)}
                    className="px-2.5 py-0.5 bg-slate-900 text-white rounded text-[11px] font-semibold hover:bg-slate-800 cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile search bar */}
      {showMobileSearch && (
        <div className="sm:hidden px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 shrink-0 animate-in slide-in-from-top-1 duration-150">
          <div className="relative flex-1 flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInputValue}
              onChange={(e) => setSearchInputValue(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Tìm trong văn bản..."
              className={cn(
                'w-full pl-7 py-1 bg-white border border-slate-200 rounded text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500',
                searchInputValue ? 'pr-20' : 'pr-2'
              )}
              autoFocus
            />
            {searchInputValue && (
              <div className="absolute right-1 flex items-center gap-0.5 text-[10.5px]">
                {debouncedSearchQuery && totalMatches > 0 ? (
                  <>
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                      {activeMatchIndex + 1}/{totalMatches}
                    </span>
                    <button
                      onClick={handlePrevSearchMatch}
                      className="p-0.5 text-slate-600 hover:text-slate-900 rounded"
                      title="Kết quả trước"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={handleNextSearchMatch}
                      className="p-0.5 text-slate-600 hover:text-slate-900 rounded"
                      title="Kết quả tiếp"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </>
                ) : debouncedSearchQuery && totalMatches === 0 ? (
                  <span className="text-[10px] text-slate-400 font-mono px-1">0/0</span>
                ) : null}

                <button
                  onClick={handleClearSearch}
                  className="p-0.5 text-slate-400 hover:text-slate-700 rounded"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

          {/* ── TAB: NOIDUNG ── */}
          <div className={activeTab === 'noidung' ? '' : 'hidden'}>
            <div className="document-page">
              <div
                className="document-content select-text"
                style={{ maxWidth: `${contentWidth}px` }}
              >
                {/* Replacement notice */}
                {replacementSource && (
                  <div className="mb-6 p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r text-xs text-amber-900 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      Văn bản có quy định thay thế mới
                    </div>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      {replacementSource.notes || 'Văn bản đã có quy định thay thế mới có hiệu lực.'}
                    </p>
                  </div>
                )}

                {/* No content state */}
                {!hasFullText || !renderedHtml ? (
                  <div className="py-12 px-4 sm:px-6 max-w-2xl mx-auto space-y-6">
                    <div className="p-8 bg-slate-50 border border-slate-200/90 rounded-2xl text-center space-y-5 shadow-xs">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-xs font-semibold">
                        <FileWarning className="w-4 h-4 text-amber-700" />
                        Chưa có toàn văn
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-slate-950">
                          Hệ thống hiện chỉ có tiêu đề và bản tóm tắt của văn bản này.
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
                          Nội dung gốc chưa được tải hoặc chưa trích xuất thành công.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2 text-xs">
                        {onBack && (
                          <button
                            onClick={onBack}
                            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Về Trang chủ & Danh sách</span>
                          </button>
                        )}
                        {tvplUrl && (
                          <a href={tvplUrl} target="_blank" rel="noreferrer" className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                            <span>Mở nguồn gốc</span>
                          </a>
                        )}
                        <a href="/admin/upload" className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-slate-600" />
                          <span>Tải Word/PDF lên</span>
                        </a>
                        <button
                          onClick={() => alert('Đã gửi yêu cầu trích xuất lại.')}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
                          <span>Trích xuất lại</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        Chưa thể highlight vì văn bản chưa có toàn văn.
                        Bạn vẫn có thể tạo ghi chú chung cho văn bản này bằng cách mở panel Ghi chú.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Quality banners */}
                    {qualityResult.isScanNeedingOcr && (
                      <div className="mb-6 p-3.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <span className="font-bold block">PDF là bản scan và chưa được OCR</span>
                          <span className="text-[11px] text-purple-700">Tệp đính kèm chứa hình ảnh scan chưa được số hóa đầy đủ.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasPdfUrl && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('banggoc')}
                              className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold rounded text-xs shrink-0 cursor-pointer transition-colors"
                            >
                              Xem Bản Gốc →
                            </button>
                          )}
                          <a href="/admin/upload" className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded text-xs shrink-0">
                            Kích hoạt OCR
                          </a>
                        </div>
                      </div>
                    )}
                    {qualityResult.status === 'partial' && (
                      <div className="mb-6 p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r text-xs text-amber-900 flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            Nội dung chưa đầy đủ — Đang đối chiếu với bản gốc
                          </div>
                          <p className="text-amber-800 text-[11px] leading-relaxed">
                            Bản số hóa hiện tại có thể thiếu một số phụ lục hoặc biểu mẫu.
                          </p>
                        </div>
                        {hasPdfUrl && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('banggoc')}
                            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold rounded text-xs shrink-0 cursor-pointer transition-colors"
                          >
                            Đối chiếu Bản Gốc (PDF) →
                          </button>
                        )}
                      </div>
                    )}
                    {qualityResult.status === 'complete' &&
                      doc.review_status !== 'published' &&
                      doc.content_status !== 'verified' && (
                        <div className="mb-4 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800">Bản trích xuất tự động — chưa kiểm duyệt</span>
                            <span className="text-slate-400">· Vui lòng đối chiếu với bản gốc khi áp dụng pháp lý.</span>
                          </div>
                          {hasPdfUrl && (
                            <button
                              type="button"
                              onClick={() => setActiveTab('banggoc')}
                              className="text-blue-700 hover:text-blue-900 font-semibold cursor-pointer underline shrink-0"
                            >
                              Xem Bản Gốc →
                            </button>
                          )}
                        </div>
                      )}
                    {/* Actual document body */}
                    <div
                      ref={contentRef}
                      className="select-text"
                      style={{
                        fontSize: `var(--reader-font-size)`,
                        lineHeight: `var(--reader-line-height)`,
                      }}
                      dangerouslySetInnerHTML={{ __html: renderedHtml }}
                    />

                    {/* Highlight layer */}
                    <HighlightLayer
                      containerRef={contentRef}
                      annotations={annotations}
                      contentVersion={contentVersion}
                      isReady={contentReady}
                      onOrphaned={handleOrphaned}
                      onReanchor={handleReanchor}
                    />

                    {/* Legal effect overlay layer */}
                    <LegalEffectOverlay
                      containerRef={contentRef}
                      effects={documentLegalEffects}
                      showOverlay={showLegalEffectsOverlay}
                      selectedDate={selectedPointInTimeDate}
                      isReady={contentReady}
                      onEffectClick={(eff) => {
                        setActiveLegalEffect(eff);
                        setPanelMode('closed');
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
          {/* ── TAB: BẢN GỐC (PDF / TỆP GỐC) ── */}
          {activeTab === 'banggoc' && (() => {
            const pdfFiles = doc.files?.filter((f) => f.file_type === 'pdf') ?? [];
            const allFiles = doc.files ?? [];
            const hasPdf = pdfFiles.length > 0;
            const currentPdf = pdfFiles[selectedPdfFileIndex] || pdfFiles[0];
            const primaryPdfUrl = currentPdf?.file_url;
            const pdfHashParam = pdfZoomMode === 'FitH'
              ? '#view=FitH'
              : pdfZoomMode === 'Fit'
                ? '#view=Fit'
                : `#zoom=${pdfZoomMode}`;
            const finalPdfUrl = primaryPdfUrl ? `${primaryPdfUrl}${pdfHashParam}` : '';

            return (
              <div className="flex-1 flex flex-col h-full w-full bg-slate-900/5 overflow-hidden">
                <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap z-10 shadow-sm border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono uppercase text-[10.5px] font-bold shrink-0">
                      {currentPdf?.file_type?.toUpperCase() || 'PDF'}
                    </span>
                    <span className="text-slate-200 font-medium truncate max-w-[200px] sm:max-w-[320px]" title={currentPdf?.original_filename || doc.title}>
                      {currentPdf?.original_filename || `${doc.document_number || 'Van-ban'}.pdf`}
                    </span>

                    {pdfFiles.length > 1 && (
                      <select
                        value={selectedPdfFileIndex}
                        onChange={(e) => setSelectedPdfFileIndex(Number(e.target.value))}
                        className="bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-0.5 text-[11px] outline-none"
                      >
                        {pdfFiles.map((f, idx) => (
                          <option key={f.id} value={idx}>
                            Tệp {idx + 1}: {f.original_filename}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    {hasPdf && (
                      <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setPdfZoomMode('FitH')}
                          className={cn(
                            'px-2 py-1 rounded transition-colors font-medium',
                            pdfZoomMode === 'FitH' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
                          )}
                          title="Tự động vừa chiều ngang để đọc chữ to và rõ nhất"
                        >
                          Vừa chiều rộng
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfZoomMode('125')}
                          className={cn(
                            'px-2 py-1 rounded transition-colors font-medium',
                            pdfZoomMode === '125' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
                          )}
                          title="Phóng to 125%"
                        >
                          125%
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfZoomMode('150')}
                          className={cn(
                            'px-2 py-1 rounded transition-colors font-medium hidden sm:inline-block',
                            pdfZoomMode === '150' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
                          )}
                          title="Phóng to 150%"
                        >
                          150%
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfZoomMode('Fit')}
                          className={cn(
                            'px-2 py-1 rounded transition-colors font-medium hidden md:inline-block',
                            pdfZoomMode === 'Fit' ? 'bg-blue-600 text-white font-semibold' : 'text-slate-300 hover:text-white'
                          )}
                          title="Hiển thị vừa toàn bộ trang"
                        >
                          Toàn trang
                        </button>
                      </div>
                    )}

                    {primaryPdfUrl && isSafeUrl(primaryPdfUrl) && (
                      <a
                        href={primaryPdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded flex items-center gap-1 text-[11px] font-medium transition-colors"
                        title="Mở tệp PDF trong tab riêng của trình duyệt"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mở tab mới</span>
                      </a>
                    )}

                    {primaryPdfUrl && (
                      <a
                        href={primaryPdfUrl}
                        download={currentPdf?.original_filename || 'document.pdf'}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded flex items-center gap-1 text-[11px] font-medium transition-colors"
                        title="Tải tệp PDF về máy tính"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Tải về</span>
                      </a>
                    )}

                    {onFullscreen && (
                      <button
                        type="button"
                        onClick={onFullscreen}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded flex items-center gap-1 text-[11px] font-semibold transition-colors shadow-xs"
                        title={isFullscreen ? 'Thu nhỏ cửa sổ đọc' : 'Phóng to toàn màn hình'}
                      >
                        {isFullscreen ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5" />
                            <span>Thu nhỏ</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Toàn màn hình</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border-b border-slate-200 px-3 sm:px-4 py-1.5 flex items-center justify-between text-xs text-slate-600 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-[11px] text-slate-500">Nguồn dữ liệu:</span>
                    <a
                      href={tvplUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-semibold text-blue-700 hover:underline flex items-center gap-1 truncate"
                    >
                      <span>Thư Viện Pháp Luật</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                  {allFiles.length > 0 && (
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <span>Định dạng: <strong className="text-slate-800 uppercase">{currentPdf?.file_type || 'PDF'}</strong></span>
                      {allFiles.find(f => f.file_type === 'docx') && (
                        <a
                          href={allFiles.find(f => f.file_type === 'docx')?.file_url}
                          download={allFiles.find(f => f.file_type === 'docx')?.original_filename}
                          className="text-emerald-700 hover:underline font-semibold flex items-center gap-0.5"
                        >
                          <Download className="w-3 h-3" /> Tải Word (.docx)
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {hasPdf ? (
                  <div className="flex-1 w-full h-full min-h-[550px] bg-slate-200 relative overflow-hidden">
                    {isSafeUrl(primaryPdfUrl) ? (
                      <iframe
                        key={finalPdfUrl}
                        src={finalPdfUrl}
                        className="w-full h-full border-0 absolute inset-0"
                        title="Bản gốc PDF"
                        allow="fullscreen"
                      />
                    ) : (
                      <p className="text-slate-400 text-center py-8">Tệp PDF không khả dụng</p>
                    )}
                  </div>
                ) : showQuickViewPdf && tvplUrl ? (
                  /* ── Quick-view inline: embed TVPL via Google Docs Viewer ── */
                  <div className="flex-1 w-full h-full min-h-[550px] relative overflow-hidden bg-slate-200">
                    <div className="absolute top-0 left-0 right-0 z-10 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-amber-800">
                        <FileWarning className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-medium">Đang xem qua liên kết Thư Viện Pháp Luật — chưa lưu trữ nội bộ</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={tvplUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-white border border-amber-300 text-amber-800 rounded text-[11px] font-medium flex items-center gap-1 hover:bg-amber-50 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Mở tab riêng
                        </a>
                        <button
                          type="button"
                          onClick={() => setQuickViewDocId(null)}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded text-[11px] font-medium hover:bg-slate-50 transition-colors"
                        >
                          Đóng
                        </button>
                      </div>
                    </div>
                    <iframe
                      src={`https://docs.google.com/viewer?url=${encodeURIComponent(tvplUrl)}&embedded=true`}
                      className="w-full h-full border-0 absolute inset-0 pt-10"
                      title="Bản gốc văn bản pháp luật"
                      allow="fullscreen"
                      onError={() => {
                        /* fallback handled below */
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-3xl mx-auto border border-slate-200 rounded-xl p-8 bg-white shadow-xs text-center space-y-4">
                      <FileWarning className="w-10 h-10 text-amber-500 mx-auto" />
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Chưa có tệp PDF gốc lưu trữ cho văn bản này</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          Bạn có thể xem nhanh bản gốc ngay trong ứng dụng, hoặc mở trực tiếp trên Thư Viện Pháp Luật.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                        {tvplUrl && (
                          <button
                            type="button"
                            onClick={() => setQuickViewDocId(doc.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Tải nhanh &amp; Xem bản gốc</span>
                          </button>
                        )}
                        <a
                          href={tvplUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Mở trên Thư Viện Pháp Luật</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── TAB: QUAN HỆ ── */}
          {activeTab === 'quanhe' && (
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 select-text">
              <LegalHierarchyTree document={doc} onSelectDocument={onSelectRelatedDocument} />
            </div>
          )}

          {/* ── TAB: TÓM TẮT ── */}
          {activeTab === 'thongtin' && (() => {
            const summaryGuard = ContentQualityValidator.canGenerateAiSummary(doc);
            const hasSummaryFields = Boolean(
              doc.summary_main || doc.summary_new_points || doc.summary_accounting_impact || doc.summary_actions_needed
            );
            return (
              <div className="document-page my-4">
                <div className="p-6 md:p-8 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Tóm tắt & Tác động nghiệp vụ</h3>
                    <span className="text-[11px] text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 font-semibold">Tóm tắt hỗ trợ — cần đối chiếu văn bản gốc</span>
                  {/* AI Summary Interactive Action Banner */}
                  <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl text-white shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                          AI Powered
                        </span>
                        <h4 className="font-bold text-sm text-white">Tóm tắt Chuyên sâu Văn bản này</h4>
                      </div>
                      <p className="text-xs text-blue-200">
                        Tự động phân tích điểm mới, đối tượng áp dụng, lộ trình thi hành và rủi ro tuân thủ bằng AI.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAiSummaryModal(true)}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Mở Bản Tóm Tắt AI</span>
                    </button>
                  </div>
                  </div>
                  {!summaryGuard.allowed && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block">Không đủ toàn văn để tạo tóm tắt đáng tin cậy</span>
                        <p className="text-[11px] text-amber-800 leading-relaxed">Văn bản này hiện chưa có toàn văn hợp lệ. Nội dung tóm tắt mang tính định hướng tham khảo.</p>
                      </div>
                    </div>
                  )}
                  {hasSummaryFields ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {[
                        { title: '1. Tóm tắt nội dung chính', content: doc.summary_main },
                        { title: '2. Điểm mới nổi bật', content: doc.summary_new_points },
                        { title: '3. Tác động Kế toán & Kiểm toán', content: doc.summary_accounting_impact || doc.summary_audit_impact },
                        { title: '4. Hành động cần thực hiện', content: doc.summary_actions_needed },
                      ].map(({ title, content }) => (
                        <div key={title} className="p-3.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                          <h4 className="font-semibold text-xs text-slate-900">{title}</h4>
                          <p className="text-xs text-slate-700 leading-relaxed">{content || 'Đang cập nhật.'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs">Chưa có bản tóm tắt trích yếu cho văn bản này.</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Back to top */}
          {showBackToTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-6 right-6 p-2.5 bg-slate-900 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all z-40"
              title="Lên đầu trang"
              aria-label="Lên đầu trang"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ── Context Panel (TOC / Notes) ── */}
        {panelMode !== 'closed' && activeTab === 'noidung' && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 md:hidden"
              onClick={() => setPanelMode('closed')}
              aria-hidden
            />
            <div className="relative z-30 md:z-auto md:relative flex-shrink-0">
              {panelMode === 'ai' ? (
                <LegalAiChatPanel
                  document={doc}
                  onClose={() => setPanelMode('closed')}
                  onCitationClick={(artNum?: string) => {
                    if (artNum) {
                      const digits = artNum.replace(/[^\d]/g, '');
                      const el =
                        document.getElementById(`dieu-${digits}`) ||
                        document.getElementById(`dieu_${digits}`) ||
                        Array.from(document.querySelectorAll('h1, h2, h3, p strong')).find((h) =>
                          h.textContent?.includes(`Điều ${digits}`)
                        );
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                />
              ) : (
                <ReaderContextPanel
                  mode={panelMode}
                  onClose={() => setPanelMode('closed')}
                  tocItems={tocItems}
                  activeTocId={activeTocId}
                  onTocItemClick={handleTocClick}
                  tocCount={tocItems.length}
                  annotations={annotations}
                  annotationsLoading={annotationsLoading}
                  annotationsError={annotationsError}
                  onNoteClick={handleNoteClick}
                  onAddNote={handleAddNoteFromPanel}
                  onDeleteAnnotation={handleDeleteAnnotationWithUndo}
                  notesCount={totalAnnotationsCount}
                  hasFullText={hasFullText}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </>
        )}

        {/* ── Legal Effect Detail Panel ── */}
        {activeLegalEffect && (
          <>
            <div
              className="fixed inset-0 bg-black/20 z-30 md:hidden"
              onClick={() => setActiveLegalEffect(null)}
              aria-hidden
            />
            <div className="relative z-30 md:z-auto md:relative flex-shrink-0">
              <LegalEffectPanel
                effect={activeLegalEffect}
                onClose={() => setActiveLegalEffect(null)}
                onSelectDocument={onSelectRelatedDocument}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Undo / Redo Floating Feedback Toast ── */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none"
        >
          <span className="font-medium">{undoToast.message}</span>
          {undoToast.actionText && undoToast.onAction && (
            <button
              type="button"
              onClick={() => {
                undoToast.onAction?.();
                setUndoToast(null);
              }}
              className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
            >
              {undoToast.actionText}
            </button>
          )}
          <button
            type="button"
            onClick={() => setUndoToast(null)}
            className="p-0.5 text-slate-400 hover:text-white rounded transition-colors ml-1 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── AI Document Summary Modal ── */}
      <AiSummaryModal
        document={doc}
        isOpen={showAiSummaryModal}
        onClose={() => setShowAiSummaryModal(false)}
        onOpenAiChat={(query) => {
          setPanelMode('ai');
        }}
        onCitationClick={(artNum?: string) => {
          if (artNum) {
            const digits = artNum.replace(/[^\d]/g, '');
            const el =
              document.getElementById(`dieu-${digits}`) ||
              document.getElementById(`dieu_${digits}`) ||
              Array.from(document.querySelectorAll('h1, h2, h3, p strong')).find((h) =>
                h.textContent?.includes(`Điều ${digits}`)
              );
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      {/* ── Text Selection Toolbar ── */}
      <SelectionToolbar
        contentContainerRef={contentRef}
        hasFullText={hasFullText}
        onHighlight={handleHighlight}
        onAddNote={handleAddNoteFromSelection}
        onCopy={handleCopySelection}
        onCopyLink={handleCopySelectionLink}
      />
    </div>
  );
}
