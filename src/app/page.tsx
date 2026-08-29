'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CategoryTree } from '@/components/sidebar/CategoryTree';
import { DocumentList } from '@/components/document-list/DocumentList';
import { DocumentReader } from '@/components/reader/DocumentReader';
import { LegalUpdatesFeed } from '@/components/reader/LegalUpdatesFeed';
import { AppHeader } from '@/components/layout/AppHeader';
import { SearchModal } from '@/components/search/SearchModal';
import { DocumentImportModal } from '@/components/import/DocumentImportModal';
import { 
  getCategories, 
  getDocuments, 
  getDocumentById 
} from '@/lib/data-service';
import { 
  useLocalStorageNumber, 
  useLocalStorageBoolean, 
  useLocalStorageString 
} from '@/lib/useLocalStorage';
import type { LegalDocument, Category, DocumentType } from '@/types';
import { DOCUMENT_TYPE_LABELS } from '@/lib/utils';
import { DEMO_CATEGORY_LINKS } from '@/lib/demo-data';
import { getDescendantCategoryIds, injectVirtualSubcategories, VIRTUAL_DOC_TYPE_CONFIG } from '@/lib/tree-utils';
import { X, ChevronLeft, ChevronRight, FolderTree, ListFilter, Search, BookmarkCheck } from 'lucide-react';

const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 340;
const MIN_LIST = 320;
const MAX_LIST = 460;

const STORAGE_KEY_SIDEBAR = 'lb_sidebar_width';
const STORAGE_KEY_LIST = 'lb_list_width';
const STORAGE_KEY_SIDEBAR_OPEN = 'lb_sidebar_open';
const STORAGE_KEY_LIST_OPEN = 'lb_list_open';
const STORAGE_KEY_SELECTED_CAT = 'lb_selected_cat';
const STORAGE_KEY_SELECTED_DOC = 'lb_selected_doc';

export default function MainPage() {
  // Layout state synchronized via SSR-safe external store hooks
  const [sidebarWidth, setSidebarWidth] = useLocalStorageNumber(STORAGE_KEY_SIDEBAR, 280, MIN_SIDEBAR, MAX_SIDEBAR);
  const [listWidth, setListWidth] = useLocalStorageNumber(STORAGE_KEY_LIST, 360, MIN_LIST, MAX_LIST);
  const [sidebarOpen, setSidebarOpen] = useLocalStorageBoolean(STORAGE_KEY_SIDEBAR_OPEN, true);
  const [listOpen, setListOpen] = useLocalStorageBoolean(STORAGE_KEY_LIST_OPEN, true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [readerFullscreen, setReaderFullscreen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Content state (deterministic SSR-safe initialization; defaults to Homepage Feed)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<DocumentType | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Post-mount synchronization for URL query parameters (?doc=... or ?cat=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const docParam = params.get('doc');
    const catParam = params.get('cat');
    if (docParam || catParam) {
      setTimeout(() => {
        if (docParam) setSelectedDocumentId(docParam);
        if (catParam) setSelectedCategoryId(catParam);
      }, 0);
    }
  }, []);

  // User state
  const [bookmarksRaw, setBookmarksRaw] = useLocalStorageString('lb_bookmarks', '[]');
  const [readRaw, setReadRaw] = useLocalStorageString('lb_read', '[]');

  const readDocuments = useMemo(() => {
    try {
      return new Set<string>(JSON.parse(readRaw));
    } catch {
      return new Set<string>();
    }
  }, [readRaw]);

  const bookmarkedDocuments = useMemo(() => {
    try {
      return new Set<string>(JSON.parse(bookmarksRaw));
    } catch {
      return new Set<string>();
    }
  }, [bookmarksRaw]);

  // Focus Mode Memory & Toast Notification
  const [focusToast, setFocusToast] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showFocusToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setFocusToast(msg);
    toastTimerRef.current = setTimeout(() => {
      setFocusToast(null);
    }, 2500);
  }, []);

  const prevLayoutRef = useRef<{ sidebarOpen: boolean; listOpen: boolean }>({
    sidebarOpen: true,
    listOpen: true,
  });

  const handleToggleFocusMode = useCallback(() => {
    if (isFocusMode) {
      setSidebarOpen(prevLayoutRef.current.sidebarOpen);
      setListOpen(prevLayoutRef.current.listOpen);
      setIsFocusMode(false);
      showFocusToast('Đã thoát chế độ tập trung');
    } else {
      prevLayoutRef.current = { sidebarOpen, listOpen };
      setSidebarOpen(false);
      setListOpen(false);
      setIsFocusMode(true);
      showFocusToast('Đã bật chế độ tập trung · Nhấn Esc hoặc phím F để thoát');
    }
  }, [isFocusMode, sidebarOpen, listOpen, setSidebarOpen, setListOpen, showFocusToast]);

  // Keyboard shortcut Ctrl+K, Escape, F (Focus), [ (Topic), ] (List)
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        setSearchOpen(false);
        setReaderFullscreen(false);
        setMobileSidebarOpen(false);
        if (isFocusMode) {
          setSidebarOpen(prevLayoutRef.current.sidebarOpen);
          setListOpen(prevLayoutRef.current.listOpen);
          setIsFocusMode(false);
          showFocusToast('Đã thoát chế độ tập trung');
        }
        return;
      }

      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleToggleFocusMode();
        } else if (e.key === '[') {
          e.preventDefault();
          setSidebarOpen((prev) => !prev);
        } else if (e.key === ']') {
          e.preventDefault();
          setListOpen((prev) => !prev);
        }
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }, [isFocusMode, setListOpen, setSidebarOpen, handleToggleFocusMode, showFocusToast]);

  // Auto-collapse logic when viewport is tight to preserve Reader >= 680px
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      // If viewport < 1440px and reader is active, auto-collapse Category sidebar first
      if (w < 1440 && sidebarOpen && listOpen && selectedDocumentId) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, listOpen, selectedDocumentId, setSidebarOpen]);

  // Resizing logic for sidebars
  const resizingSidebar = useRef(false);
  const resizingList = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    resizingSidebar.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarWidth;
    document.body.classList.add('is-resizing');
    e.preventDefault();
  }, [sidebarWidth]);

  const handleListResizeStart = useCallback((e: React.MouseEvent) => {
    resizingList.current = true;
    startX.current = e.clientX;
    startWidth.current = listWidth;
    document.body.classList.add('is-resizing');
    e.preventDefault();
  }, [listWidth]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingSidebar.current) {
        const diff = e.clientX - startX.current;
        const newW = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, startWidth.current + diff));
        setSidebarWidth(newW);
      }
      if (resizingList.current) {
        const diff = e.clientX - startX.current;
        const newW = Math.max(MIN_LIST, Math.min(MAX_LIST, startWidth.current + diff));
        setListWidth(newW);
      }
    };
    const handleMouseUp = () => {
      if (resizingSidebar.current || resizingList.current) {
        resizingSidebar.current = false;
        resizingList.current = false;
        document.body.classList.remove('is-resizing');
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('is-resizing');
    };
  }, [setListWidth, setSidebarWidth]);

  // Data state
  const [categoryData, setCategoryData] = useState<{ categories: Category[]; tree: Category[] }>({
    categories: [],
    tree: [],
  });
  const [allDocList, setAllDocList] = useState<LegalDocument[]>([]);
  const [loadedDoc, setLoadedDoc] = useState<LegalDocument | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);

  // 1. Fetch categories
  useEffect(() => {
    let active = true;
    getCategories().then((res) => {
      if (!active) return;
      if (res.source === 'unavailable' && res.error) {
        setDataError(res.error);
      } else {
        setCategoryData(res.data);
      }
    });
    return () => { active = false; };
  }, []);

  // 2. Fetch ALL documents (repository base)
  useEffect(() => {
    let active = true;
    getDocuments(null).then((res) => {
      if (!active) return;
      if (res.source === 'unavailable' && res.error) {
        setDataError(res.error);
      } else {
        setAllDocList(res.data);
      }
    });
    return () => { active = false; };
  }, []);

  // 3. Fetch single loaded document if needed
  useEffect(() => {
    if (!selectedDocumentId) return;
    let active = true;
    getDocumentById(selectedDocumentId).then((res) => {
      if (!active) return;
      if (res.data) {
        setLoadedDoc(res.data);
      }
    });
    return () => { active = false; };
  }, [selectedDocumentId]);

  // Compute category-filtered documents
  const categoryDocuments = useMemo(() => {
    if (selectedDocType) {
      return allDocList.filter((d) => d.document_type === selectedDocType);
    }
    if (!selectedCategoryId) {
      return allDocList;
    }
    if (selectedCategoryId.includes('__type__')) {
      const [baseCatId, docType] = selectedCategoryId.split('__type__');
      const descendantIds = new Set(getDescendantCategoryIds(baseCatId, categoryData.categories));
      return allDocList.filter((d) => {
        const links = DEMO_CATEGORY_LINKS.filter((l) => l.document_id === d.id);
        const matchesCat = links.some((l) => descendantIds.has(l.category_id));
        if (docType === 'khac') {
          return matchesCat && (d.document_type === 'khac' || d.document_type === 'huong_dan');
        }
        return matchesCat && d.document_type === docType;
      });
    }
    const descendantIds = new Set(getDescendantCategoryIds(selectedCategoryId, categoryData.categories));
    return allDocList.filter((d) => {
      const links = DEMO_CATEGORY_LINKS.filter((l) => l.document_id === d.id);
      return links.some((l) => descendantIds.has(l.category_id));
    });
  }, [allDocList, selectedCategoryId, selectedDocType, categoryData.categories]);

  const selectedDocument = selectedDocumentId
    ? loadedDoc?.id === selectedDocumentId
      ? loadedDoc
      : allDocList.find((d) => d.id === selectedDocumentId) || null
    : null;

  const categoryTree = useMemo(() => {
    const baseTree = categoryData.tree.length > 0 ? categoryData.tree : categoryData.categories;
    return injectVirtualSubcategories(baseTree, allDocList, DEMO_CATEGORY_LINKS);
  }, [categoryData.tree, categoryData.categories, allDocList]);

  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    if (selectedCategoryId.includes('__type__')) {
      const [baseCatId, docType] = selectedCategoryId.split('__type__');
      const baseCat = categoryData.categories.find((c) => c.id === baseCatId);
      const typeConfig = VIRTUAL_DOC_TYPE_CONFIG.find((t) => t.type === docType);
      const typeLabel = typeConfig?.label || DOCUMENT_TYPE_LABELS[docType as DocumentType] || docType;
      return {
        id: selectedCategoryId,
        parent_id: baseCatId,
        name: baseCat ? `${baseCat.name} › ${typeLabel}` : typeLabel,
        slug: `${baseCat?.slug || 'cat'}-${docType}`,
        description: null,
        order_index: typeConfig?.order || 0,
        icon: null,
        is_active: true,
        created_at: '',
        updated_at: '',
      } as Category;
    }
    return categoryData.categories.find((c) => c.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categoryData.categories]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedDocType(null);
    setSelectedDocumentId(null);
    setMobileSidebarOpen(false);
  };

  const handleDocTypeSelect = (docType: DocumentType | null) => {
    setSelectedDocType(docType);
    setSelectedCategoryId(null);
    setSelectedDocumentId(null);
    setMobileSidebarOpen(false);
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocumentId(documentId);
  };

  const handleResetHome = useCallback(() => {
    setSelectedDocumentId(null);
    setSelectedCategoryId(null);
    setSelectedDocType(null);
    setSidebarOpen(true);
    setListOpen(true);
    setIsFocusMode(false);
    setMobileSidebarOpen(false);
  }, [setSelectedCategoryId, setSelectedDocumentId, setSidebarOpen, setListOpen]);

  const handleMarkRead = (documentId: string) => {
    const next = new Set(readDocuments);
    if (next.has(documentId)) {
      next.delete(documentId);
    } else {
      next.add(documentId);
    }
    setReadRaw(JSON.stringify([...next]));
  };

  const handleToggleBookmark = (documentId: string) => {
    const next = new Set(bookmarkedDocuments);
    if (next.has(documentId)) {
      next.delete(documentId);
    } else {
      next.add(documentId);
    }
    setBookmarksRaw(JSON.stringify([...next]));
  };

  const [searchTarget, setSearchTarget] = useState<{
    targetNodeId?: string;
    locationLabel?: string;
    query?: string;
    tab?: 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';
  } | null>(null);

  const handleSearchSelect = (
    documentId: string,
    navTarget?: {
      targetNodeId?: string;
      locationLabel?: string;
      query?: string;
      tab?: 'noidung' | 'banggoc' | 'quanhe' | 'thongtin';
    }
  ) => {
    setSelectedDocumentId(documentId);
    setSearchTarget(navTarget || null);
    setSearchOpen(false);
  };

  if (readerFullscreen && selectedDocument) {
    return (
      <div className="fullscreen-reader flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
          <button
            onClick={() => setReaderFullscreen(false)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
            Thoát toàn màn hình
          </button>
          <span className="text-xs font-bold text-slate-900 truncate ml-2">
            {selectedDocument.document_number} — {selectedDocument.title}
          </span>
        </div>
        <div className="flex-1 overflow-hidden">
          <DocumentReader
            document={selectedDocument as LegalDocument}
            isRead={readDocuments.has(selectedDocument.id!)}
            isBookmarked={bookmarkedDocuments.has(selectedDocument.id!)}
            onMarkRead={() => handleMarkRead(selectedDocument.id!)}
            onToggleBookmark={() => handleToggleBookmark(selectedDocument.id!)}
            onSelectRelatedDocument={handleDocumentSelect}
            onFullscreen={() => setReaderFullscreen(false)}
            isFullscreen={true}
            initialSearchQuery={searchTarget?.query}
            targetNodeId={searchTarget?.targetNodeId}
            initialTab={searchTarget?.tab}
            isFocusMode={isFocusMode}
            onToggleFocusMode={handleToggleFocusMode}
          />
        </div>
      </div>
    );
  }

  const listCategoryTitle = activeCategory?.name || (selectedDocType ? (DOCUMENT_TYPE_LABELS[selectedDocType] || selectedDocType) : 'Tất cả văn bản');

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden select-text min-h-0">
      {/* 1. Global App Header */}
      <AppHeader
        onSearchClick={() => setSearchOpen(true)}
        unreadCount={allDocList.filter((d: LegalDocument) => !readDocuments.has(d.id!)).length}
        onMobileSidebarToggle={() => setMobileSidebarOpen(true)}
        onOpenImportModal={() => setImportModalOpen(true)}
        onLogoClick={handleResetHome}
      />

      {/* 2. Main 3-Column Workspace */}
      <div className="flex flex-1 overflow-hidden relative min-h-0">
        {/* Mobile drawer overlay */}
        {mobileSidebarOpen && (
          <div
            className="drawer-overlay md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* COLUMN 1: Category Sidebar (260 - 320px) */}
        <div
          className={`
            flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden relative transition-[width] duration-150 ease-out
            ${mobileSidebarOpen
              ? 'fixed left-0 top-0 bottom-0 z-50 w-80 shadow-2xl'
              : 'hidden md:flex'
            }
          `}
          style={!mobileSidebarOpen ? { width: sidebarOpen ? sidebarWidth : 0 } : undefined}
        >
          {mobileSidebarOpen && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <span className="font-bold text-xs text-slate-900">Danh mục văn bản</span>
              <button onClick={() => setMobileSidebarOpen(false)} className="p-1 text-slate-500 hover:text-slate-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {(sidebarOpen || mobileSidebarOpen) && (
            <CategoryTree
              categories={categoryTree}
              allDocuments={allDocList}
              selectedCategoryId={selectedCategoryId}
              selectedDocType={selectedDocType}
              onSelectCategory={handleCategorySelect}
              onSelectDocType={handleDocTypeSelect}
              readDocuments={readDocuments}
              activeCategoryCount={categoryDocuments.length}
              onCollapse={() => setSidebarOpen(false)}
            />
          )}
        </div>

        {/* Collapsed Category Rail Button (Left-edge quick restore) */}
        {!sidebarOpen && !mobileSidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="hidden md:flex flex-col items-center justify-start pt-3 gap-2 w-7 h-full bg-slate-50 hover:bg-blue-50 border-r border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-700 transition-colors cursor-pointer shrink-0 z-20 group select-none"
            title="Mở cây chủ đề ( [ )"
            aria-label="Mở cây chủ đề"
          >
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span className="[writing-mode:vertical-lr] text-[10px] font-semibold tracking-wider uppercase text-slate-600 group-hover:text-blue-700">
              Chủ đề
            </span>
          </button>
        )}

        {/* Splitter 1: Between Category Sidebar & Document List */}
        {sidebarOpen && (
          <div
            className="hidden md:flex relative items-center justify-center shrink-0 w-1 hover:w-1.5 bg-slate-200 hover:bg-blue-400 transition-all cursor-col-resize group z-20 select-none"
            onMouseDown={handleSidebarResizeStart}
            onDoubleClick={() => setSidebarOpen(false)}
            title="Kéo để thay đổi độ rộng · Nhấp đúp để ẩn danh mục"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSidebarOpen(!sidebarOpen);
              }}
              className="absolute top-2.5 z-30 w-5 h-6 -left-2 bg-white border border-slate-300 rounded shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus:opacity-100"
              title={sidebarOpen ? 'Thu gọn danh mục ( [ )' : 'Mở rộng danh mục ( [ )'}
              aria-label={sidebarOpen ? 'Thu gọn danh mục' : 'Mở rộng danh mục'}
            >
              {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* COLUMN 2: Document List Sidebar (320 - 460px) */}
        <div
          className={`responsive-doc-list bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-[width] duration-150 ease-out shrink-0 md:shrink-0 ${
            selectedDocumentId ? 'hidden md:flex' : 'flex'
          }`}
          style={{ width: listOpen ? listWidth : 0 }}
        >
          {listOpen && (
            <DocumentList
              documents={categoryDocuments}
              selectedDocumentId={selectedDocumentId}
              onSelectDocument={handleDocumentSelect}
              categoryName={listCategoryTitle}
              selectedDocType={selectedDocType}
              readDocuments={readDocuments}
              bookmarkedDocuments={bookmarkedDocuments}
              onCollapse={() => setListOpen(false)}
            />
          )}
        </div>

        {/* Collapsed Document List Rail Button (Left-edge quick restore) */}
        {!listOpen && (
          <button
            type="button"
            onClick={() => setListOpen(true)}
            className="hidden md:flex flex-col items-center justify-start pt-3 gap-2 w-7 h-full bg-slate-50 hover:bg-blue-50 border-r border-slate-200 hover:border-blue-300 text-slate-500 hover:text-blue-700 transition-colors cursor-pointer shrink-0 z-20 group select-none"
            title="Mở danh sách văn bản ( ] )"
            aria-label="Mở danh sách văn bản"
          >
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            <span className="[writing-mode:vertical-lr] text-[10px] font-semibold tracking-wider uppercase text-slate-600 group-hover:text-blue-700">
              Danh sách
            </span>
          </button>
        )}

        {/* Splitter 2: Between Document List & Reader */}
        {listOpen && (
          <div
            className="hidden md:flex relative items-center justify-center shrink-0 w-1 hover:w-1.5 bg-slate-200 hover:bg-blue-400 transition-all cursor-col-resize group z-20 select-none"
            onMouseDown={handleListResizeStart}
            onDoubleClick={() => setListOpen(false)}
            title="Kéo để thay đổi độ rộng · Nhấp đúp để ẩn danh sách"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setListOpen(!listOpen);
              }}
              className="absolute top-2.5 z-30 w-5 h-6 -left-2 bg-white border border-slate-300 rounded shadow-xs flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer focus:opacity-100"
              title={listOpen ? 'Thu gọn danh sách văn bản ( ] )' : 'Mở rộng danh sách văn bản ( ] )'}
              aria-label={listOpen ? 'Thu gọn danh sách văn bản' : 'Mở rộng danh sách văn bản'}
            >
              {listOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          </div>
        )}
        {/* COLUMN 3: Main Workspace (Cập nhật pháp luật or Document Reader >= 680px) */}
        <main className={`flex-1 overflow-hidden flex flex-col min-w-0 min-h-0 bg-white ${
          selectedDocumentId ? 'flex' : 'hidden md:flex'
        }`}>
          {dataError && (
            <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-between shrink-0">
              <span>⚠️ {dataError}</span>
              <button onClick={() => setDataError(null)} className="text-amber-700 hover:text-amber-950 font-bold ml-2">×</button>
            </div>
          )}

          {selectedDocument ? (
            /* Document Reader when a document is selected */
            <DocumentReader
              document={selectedDocument as LegalDocument}
              isRead={readDocuments.has(selectedDocument.id!)}
              isBookmarked={bookmarkedDocuments.has(selectedDocument.id!)}
              onMarkRead={() => handleMarkRead(selectedDocument.id!)}
              onToggleBookmark={() => handleToggleBookmark(selectedDocument.id!)}
              onSelectRelatedDocument={handleDocumentSelect}
              onFullscreen={() => setReaderFullscreen(true)}
              isFullscreen={false}
              onBack={() => setSelectedDocumentId(null)}
              initialSearchQuery={searchTarget?.query}
              targetNodeId={searchTarget?.targetNodeId}
              initialTab={searchTarget?.tab}
              isFocusMode={isFocusMode}
              onToggleFocusMode={handleToggleFocusMode}
            />
          ) : (
            /* Trang "Cập nhật pháp luật" khi chưa chọn văn bản */
            <LegalUpdatesFeed
              allDocuments={allDocList}
              categoryDocuments={categoryDocuments}
              activeCategory={activeCategory}
              activeDocType={selectedDocType}
              categories={categoryData.categories}
              readDocuments={readDocuments}
              bookmarkedDocuments={bookmarkedDocuments}
              onSelectDocument={handleDocumentSelect}
              onResetCategoryFilter={() => {
                setSelectedCategoryId(null);
                setSelectedDocType(null);
              }}
            />
          )}
        </main>
      </div>

      {/* Quick Search Modal (Ctrl+K) */}
      {searchOpen && (
        <SearchModal
          initialQuery={searchInitialQuery}
          onClose={() => {
            setSearchOpen(false);
            setSearchInitialQuery('');
          }}
          onSelectDocument={handleSearchSelect}
        />
      )}

      {/* Document Import Modal (+ Nhập văn bản) */}
      {importModalOpen && (
        <DocumentImportModal
          isOpen={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onDocumentImported={(newDoc) => {
            if (newDoc.id) {
              handleDocumentSelect(newDoc.id);
            }
          }}
        />
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="md:hidden h-13.5 bg-white border-t border-slate-200 flex items-center justify-around px-2 shrink-0 z-30 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
        aria-label="Thanh điều hướng di động"
      >
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors ${
            mobileSidebarOpen ? 'text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 active:text-blue-600'
          }`}
          aria-label="Mở danh mục"
        >
          <FolderTree className="w-4.5 h-4.5 mb-0.5" />
          <span>Danh mục</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDocumentId(null);
            setMobileSidebarOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors ${
            !selectedDocumentId ? 'text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900 active:text-blue-600'
          }`}
          aria-label="Xem danh sách văn bản"
        >
          <ListFilter className="w-4.5 h-4.5 mb-0.5" />
          <span>Danh sách</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 active:text-blue-600 transition-colors"
          aria-label="Tìm kiếm văn bản"
        >
          <Search className="w-4.5 h-4.5 mb-0.5" />
          <span>Tìm kiếm</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSelectedDocumentId(null);
            setMobileSidebarOpen(false);
          }}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-medium transition-colors ${
            bookmarkedDocuments.size > 0 ? 'text-amber-700 font-semibold' : 'text-slate-600 hover:text-slate-900 active:text-blue-600'
          }`}
          aria-label="Xem văn bản đã lưu"
        >
          <BookmarkCheck className="w-4.5 h-4.5 mb-0.5" />
          <span>Đã lưu {bookmarkedDocuments.size > 0 ? `(${bookmarkedDocuments.size})` : ''}</span>
        </button>
      </nav>
      {/* Floating Focus Mode Notification Toast */}
      {focusToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 backdrop-blur-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200 select-none"
        >
          <span className="font-medium">{focusToast}</span>
        </div>
      )}
    </div>
  );
}
