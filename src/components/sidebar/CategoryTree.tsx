import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Search,
  BookOpen,
  Layers,
  ChevronsDown,
  ChevronsUp,
  Percent,
  ClipboardCheck,
  ShieldCheck,
  Users,
  Building2,
  TrendingUp,
  Scale,
  FileText,
  Gavel,
  MailCheck,
  FileSpreadsheet,
  LucideIcon,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, DocumentType, LegalDocument } from '@/types';
import { DEMO_DOCUMENTS, DEMO_CATEGORY_LINKS } from '@/lib/demo-data';
import {
  getAncestorCategoryIds,
  getDescendantCategoryIds,
  flattenVisibleTree,
  injectVirtualSubcategories,
} from '@/lib/tree-utils';

export interface CategoryTreeProps {
  categories: Category[];
  allDocuments?: LegalDocument[];
  selectedCategoryId: string | null;
  selectedDocType?: DocumentType | null;
  onSelectCategory: (id: string | null) => void;
  onSelectDocType?: (type: DocumentType | null) => void;
  activeCategoryCount?: number;
  onCollapse?: () => void;
}
const STORAGE_KEY_EXPANDED = 'lb_tree_expanded_ids';

function renderRootCategoryIcon(category: Category, className: string) {
  const slug = (category.slug || '').toLowerCase();
  if (slug.includes('thue')) return <Percent className={className} />;
  if (slug.includes('ke-toan')) return <BookOpen className={className} />;
  if (slug.includes('kiem-toan')) return <ClipboardCheck className={className} />;
  if (slug.includes('bao-hiem') || slug.includes('bhxh')) return <ShieldCheck className={className} />;
  if (slug.includes('lao-dong')) return <Users className={className} />;
  if (slug.includes('doanh-nghiep')) return <Building2 className={className} />;
  if (slug.includes('dau-tu')) return <TrendingUp className={className} />;
  return <BookOpen className={className} />;
}

interface DocTypeMeta {
  type: DocumentType;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  iconBg: string;
}

const DOC_TYPE_METAS: DocTypeMeta[] = [
  {
    type: 'luat',
    label: 'Luật / Bộ luật',
    sublabel: 'Do Quốc hội ban hành',
    icon: Scale,
    iconBg: 'bg-blue-50 text-blue-700',
  },
  {
    type: 'nghi_dinh',
    label: 'Nghị định',
    sublabel: 'Do Chính phủ ban hành',
    icon: Building2,
    iconBg: 'bg-purple-50 text-purple-700',
  },
  {
    type: 'thong_tu',
    label: 'Thông tư',
    sublabel: 'Do Bộ ngành ban hành',
    icon: FileText,
    iconBg: 'bg-teal-50 text-teal-700',
  },
  {
    type: 'quyet_dinh',
    label: 'Quyết định',
    sublabel: 'Quy định áp dụng cá biệt',
    icon: Gavel,
    iconBg: 'bg-orange-50 text-orange-700',
  },
  {
    type: 'cong_van',
    label: 'Công văn hướng dẫn',
    sublabel: 'Giải đáp vướng mắc nghiệp vụ',
    icon: MailCheck,
    iconBg: 'bg-cyan-50 text-cyan-700',
  },
  {
    type: 'chuan_muc',
    label: 'Chuẩn mực (VAS / IFRS)',
    sublabel: 'Hệ thống chuẩn mực nghề nghiệp',
    icon: Layers,
    iconBg: 'bg-indigo-50 text-indigo-700',
  },
  {
    type: 'khac',
    label: 'Bản tin & Văn bản hợp nhất',
    sublabel: 'Tài liệu tra cứu đối chiếu',
    icon: FileSpreadsheet,
    iconBg: 'bg-slate-100 text-slate-700',
  },
];

/**
 * Text highlighter for search filtering inside category names.
 */
function HighlightedLabel({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span>
      {before}
      <mark className="bg-amber-200/80 text-amber-950 font-semibold px-0.5 rounded-[2px]">{match}</mark>
      {after}
    </span>
  );
}

interface TreeNodeProps {
  category: Category;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  expandedIds: Set<string>;
  filterText: string;
  categoryCounts: Map<string, number>;
  selectedCategoryId: string | null;
  onToggleExpand: (id: string, e?: React.MouseEvent) => void;
  onSelectCategory: (id: string) => void;
}

function TopicTreeNode({
  category,
  depth,
  isSelected,
  isExpanded,
  expandedIds,
  filterText,
  categoryCounts,
  selectedCategoryId,
  onToggleExpand,
  onSelectCategory,
}: TreeNodeProps) {
  const hasChildren = Boolean(category.children && category.children.length > 0);
  const count = categoryCounts.get(category.id);
  const isRoot = depth === 0;
  const isLevel1 = depth === 1;

  // Strict indentation specifications:
  // Cấp 0: 10px; Cấp 1: 28px; Cấp 2: 46px; mỗi cấp tăng 18px
  const indentPx = 10 + depth * 18;

  // Compact row heights & typography:
  // Node cấp chính (depth 0): cao 38px, font 14px, weight 600
  // Node cấp con (depth 1): cao 34px, font 13.5px, weight 500
  // Node cấp cuối (depth 2+): cao 32px, font 13px, weight 400
  // Line-height: 1.25, border-radius: 6px
  const heightClass = isRoot ? 'h-[38px]' : isLevel1 ? 'h-[34px]' : 'h-[32px]';
  const textClass = isRoot
    ? 'text-[14px] font-semibold leading-[1.25]'
    : isLevel1
    ? 'text-[13.5px] font-medium leading-[1.25]'
    : 'text-[13px] font-normal leading-[1.25]';

  return (
    <div key={category.id} className="select-none">
      <div
        id={`category-node-${category.id}`}
        tabIndex={0}
        role="treeitem"
        aria-level={depth + 1}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        data-selected={isSelected}
        onClick={() => onSelectCategory(category.id)}
        style={{ paddingLeft: `${indentPx}px` }}
        title={count !== undefined ? `${category.name} (${count} văn bản)` : category.name}
        className={cn(
          'tree-row group grid grid-cols-[18px_auto_minmax(0,1fr)_24px] items-center gap-x-[7px] pr-[8px] rounded-[6px] cursor-pointer transition-colors text-left relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset',
          heightClass,
          isSelected
            ? 'bg-[#eff6ff] text-[#1d4ed8] shadow-[inset_2px_0_0_#2563eb]'
            : 'hover:bg-slate-100/70 text-slate-800 hover:text-slate-950'
        )}
      >
        {/* Column 1: Chevron Button (18px container, 14px icon) */}
        <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => onToggleExpand(category.id, e)}
              className="w-[18px] h-[18px] flex items-center justify-center text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer focus:outline-none"
              aria-label={isExpanded ? `Thu gọn ${category.name}` : `Mở rộng ${category.name}`}
            >
              <ChevronRight
                className={cn(
                  'w-[14px] h-[14px] transition-transform duration-150',
                  isExpanded && 'rotate-90 text-slate-600'
                )}
              />
            </button>
          ) : (
            <span className="w-[18px] h-[18px] block" aria-hidden="true" />
          )}
        </div>

        {/* Column 2: Icon (17px for root) / Bullet Indicator (max 5px for sub-nodes) */}
        <div className="flex items-center justify-center shrink-0">
          {isRoot ? (
            renderRootCategoryIcon(
              category,
              cn(
                'w-[17px] h-[17px] transition-colors',
                isSelected ? 'text-[#1d4ed8]' : 'text-slate-500 group-hover:text-slate-700'
              )
            )
          ) : isLevel1 ? (
            <span
              className={cn(
                'w-[5px] h-[5px] rounded-full transition-colors',
                isSelected ? 'bg-[#1d4ed8]' : 'bg-slate-300 group-hover:bg-slate-400'
              )}
            />
          ) : (
            <span
              className={cn(
                'w-[4px] h-[4px] rounded-full transition-colors',
                isSelected ? 'bg-[#1d4ed8]' : 'bg-slate-300 group-hover:bg-slate-400'
              )}
            />
          )}
        </div>

        {/* Column 3: Label */}
        <span className={cn('truncate text-left', textClass, isSelected ? 'text-[#1d4ed8]' : 'text-slate-800')}>
          <HighlightedLabel text={category.name} query={filterText} />
        </span>

        {/* Column 4: Count (12px, font-weight 500, tabular-nums, fixed 24px, no badge background) */}
        <div className="w-[24px] text-right shrink-0">
          {typeof count === 'number' && count > 0 ? (
            <span
              className={cn(
                'font-mono text-right tabular-nums transition-colors block text-[12px] font-medium',
                isSelected ? 'text-[#1d4ed8]' : 'text-slate-400 group-hover:text-slate-600'
              )}
            >
              {count}
            </span>
          ) : null}
        </div>
      </div>

      {/* Children Subtree with 1px spacing */}
      {hasChildren && isExpanded && category.children && (
        <div className="space-y-[1px] relative mt-[1px]">
          {category.children.map((child) => {
            const isChildExpanded = expandedIds.has(child.id) || filterText.length > 0;
            const isChildSelected = selectedCategoryId === child.id;
            return (
              <TopicTreeNode
                key={child.id}
                category={child}
                depth={depth + 1}
                isSelected={isChildSelected}
                isExpanded={isChildExpanded}
                expandedIds={expandedIds}
                filterText={filterText}
                categoryCounts={categoryCounts}
                selectedCategoryId={selectedCategoryId}
                onToggleExpand={onToggleExpand}
                onSelectCategory={onSelectCategory}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CategoryTree({
  categories,
  allDocuments,
  selectedCategoryId,
  selectedDocType,
  onSelectCategory,
  onSelectDocType,
  activeCategoryCount: _activeCategoryCount,
  onCollapse,
}: CategoryTreeProps) {
  const [viewMode, setViewMode] = useState<'topic' | 'type'>('topic');
  const docsList = useMemo(() => allDocuments || (DEMO_DOCUMENTS as unknown as LegalDocument[]), [allDocuments]);
  const totalDocsCount = docsList.length;

  const enrichedCategories = useMemo(() => {
    return injectVirtualSubcategories(categories, docsList, DEMO_CATEGORY_LINKS);
  }, [categories, docsList]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_EXPANDED);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((id: string) => initialSet.add(id));
          }
        }
      } catch {}
    }
    if (selectedCategoryId) {
      const ancestors = getAncestorCategoryIds(selectedCategoryId, enrichedCategories);
      ancestors.forEach((aId) => initialSet.add(aId));
    }

    if (initialSet.size === 0) {
      enrichedCategories.forEach((c) => {
        if (c.slug === 'thue' || c.slug === 'ke-toan') {
          initialSet.add(c.id);
        }
        c.children?.forEach((child) => {
          if (child.slug === 'thue-gtgt') {
            initialSet.add(child.id);
          }
        });
      });
    }

    return initialSet;
  });

  const [filterText, setFilterText] = useState('');
  const treeContainerRef = useRef<HTMLDivElement>(null);

  const saveExpandedState = useCallback((ids: Set<string>) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_EXPANDED, JSON.stringify([...ids]));
      } catch {}
    }
  }, []);

  const handleSelectCategoryAndExpandAncestors = useCallback(
    (catId: string | null) => {
      if (catId) {
        const ancestors = getAncestorCategoryIds(catId, enrichedCategories);
        if (ancestors.length > 0) {
          setExpandedIds((prev) => {
            let hasChange = false;
            const next = new Set(prev);
            ancestors.forEach((aId) => {
              if (!next.has(aId)) {
                next.add(aId);
                hasChange = true;
              }
            });
            if (hasChange) {
              saveExpandedState(next);
              return next;
            }
            return prev;
          });
        }
      }
      if (onSelectDocType) {
        onSelectDocType(null);
      }
      onSelectCategory(catId);
    },
    [enrichedCategories, onSelectCategory, onSelectDocType, saveExpandedState]
  );

  const handleSelectDocType = useCallback(
    (docType: DocumentType) => {
      onSelectCategory(null);
      if (onSelectDocType) {
        onSelectDocType(docType);
      }
    },
    [onSelectCategory, onSelectDocType]
  );

  const toggleExpand = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        saveExpandedState(next);
        return next;
      });
    },
    [saveExpandedState]
  );

  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collect = (cats: Category[]) => {
      cats.forEach((c) => {
        allIds.add(c.id);
        if (c.children && c.children.length > 0) {
          collect(c.children);
        }
      });
    };
    collect(enrichedCategories);
    setExpandedIds(allIds);
    saveExpandedState(allIds);
  }, [enrichedCategories, saveExpandedState]);

  const collapseAll = useCallback(() => {
    const emptySet = new Set<string>();
    setExpandedIds(emptySet);
    saveExpandedState(emptySet);
  }, [saveExpandedState]);

  // Expand ancestors automatically when searching
  useEffect(() => {
    if (!filterText.trim()) return;
    const lower = filterText.toLowerCase();
    const matchingAncestorIds = new Set<string>();

    const checkMatch = (cat: Category): boolean => {
      const isMatch = cat.name.toLowerCase().includes(lower);
      let childMatch = false;
      if (cat.children && cat.children.length > 0) {
        for (const child of cat.children) {
          if (checkMatch(child)) {
            childMatch = true;
          }
        }
      }
      if (childMatch) {
        matchingAncestorIds.add(cat.id);
      }
      return isMatch || childMatch;
    };

    enrichedCategories.forEach(checkMatch);

    if (matchingAncestorIds.size > 0) {
      const timer = setTimeout(() => {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          matchingAncestorIds.forEach((id) => next.add(id));
          return next;
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [filterText, enrichedCategories]);

  const filteredCategories = useMemo(() => {
    if (!filterText.trim()) return enrichedCategories;
    const lower = filterText.toLowerCase();

    const filterNode = (cat: Category): Category | null => {
      const matchesName = cat.name.toLowerCase().includes(lower);
      const filteredChildren = (cat.children || [])
        .map(filterNode)
        .filter(Boolean) as Category[];

      if (matchesName || filteredChildren.length > 0) {
        return {
          ...cat,
          children: filteredChildren,
        };
      }
      return null;
    };

    return enrichedCategories.map(filterNode).filter(Boolean) as Category[];
  }, [enrichedCategories, filterText]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();

    const compute = (cat: Category) => {
      if (cat.id.includes('__type__')) {
        const [baseId, docType] = cat.id.split('__type__');
        const count = docsList.filter((d) => {
          const links = DEMO_CATEGORY_LINKS.filter((l) => l.document_id === d.id);
          const matchesCat = links.some((l) => l.category_id === baseId);
          if (docType === 'khac') {
            return matchesCat && (d.document_type === 'khac' || d.document_type === 'huong_dan');
          }
          return matchesCat && d.document_type === docType;
        }).length;
        map.set(cat.id, count);
      } else {
        const descendantIds = new Set(getDescendantCategoryIds(cat.id, enrichedCategories));
        const count = docsList.filter((d) => {
          const links = DEMO_CATEGORY_LINKS.filter((l) => l.document_id === d.id);
          return links.some((l) => descendantIds.has(l.category_id));
        }).length;
        map.set(cat.id, count);
      }

      if (cat.children && cat.children.length > 0) {
        cat.children.forEach(compute);
      }
    };

    enrichedCategories.forEach(compute);
    return map;
  }, [enrichedCategories, docsList]);

  const docTypesWithCounts = useMemo(() => {
    return DOC_TYPE_METAS.map((meta) => {
      const count = docsList.filter((d) => {
        if (meta.type === 'khac') {
          return d.document_type === 'khac' || d.document_type === 'huong_dan';
        }
        return d.document_type === meta.type;
      }).length;
      return {
        ...meta,
        count,
      };
    });
  }, [docsList]);

  // Flattened visible nodes for keyboard navigation
  const visibleTreeNodes = useMemo(() => {
    return flattenVisibleTree(filteredCategories, expandedIds);
  }, [filteredCategories, expandedIds]);

  // Total expanded state check for the toggle button
  const areAllExpanded = useMemo(() => {
    let totalExpandable = 0;
    const countExpandable = (cats: Category[]) => {
      cats.forEach((c) => {
        if (c.children && c.children.length > 0) {
          totalExpandable++;
          countExpandable(c.children);
        }
      });
    };
    countExpandable(enrichedCategories);
    return totalExpandable > 0 && expandedIds.size >= totalExpandable;
  }, [enrichedCategories, expandedIds]);

  // Keyboard navigation handler for accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (viewMode !== 'topic') return;

      const items = ['all', ...visibleTreeNodes.map((n) => n.category.id)];
      const activeEl = document.activeElement;
      let currentIndex = -1;

      if (activeEl?.id === 'category-node-all') {
        currentIndex = 0;
      } else if (activeEl?.id?.startsWith('category-node-')) {
        const activeId = activeEl.id.replace('category-node-', '');
        currentIndex = items.indexOf(activeId);
      }

      const focusItemByIndex = (index: number) => {
        if (index < 0 || index >= items.length) return;
        const targetId = items[index];
        const elem = document.getElementById(
          targetId === 'all' ? 'category-node-all' : `category-node-${targetId}`
        );
        elem?.focus();
      };

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (currentIndex === -1) {
            focusItemByIndex(0);
          } else {
            focusItemByIndex(Math.min(items.length - 1, currentIndex + 1));
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (currentIndex === -1) {
            focusItemByIndex(items.length - 1);
          } else {
            focusItemByIndex(Math.max(0, currentIndex - 1));
          }
          break;
        }
        case 'ArrowRight': {
          if (currentIndex > 0) {
            const currentCatId = items[currentIndex];
            const node = visibleTreeNodes.find((n) => n.category.id === currentCatId);
            if (node && node.hasChildren) {
              e.preventDefault();
              if (!expandedIds.has(currentCatId)) {
                toggleExpand(currentCatId);
              } else {
                focusItemByIndex(currentIndex + 1);
              }
            }
          }
          break;
        }
        case 'ArrowLeft': {
          if (currentIndex > 0) {
            const currentCatId = items[currentIndex];
            const node = visibleTreeNodes.find((n) => n.category.id === currentCatId);
            if (node) {
              e.preventDefault();
              if (expandedIds.has(currentCatId) && node.hasChildren) {
                toggleExpand(currentCatId);
              } else if (node.parentId) {
                const parentIndex = items.indexOf(node.parentId);
                if (parentIndex !== -1) {
                  focusItemByIndex(parentIndex);
                }
              } else {
                focusItemByIndex(0);
              }
            }
          }
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (currentIndex === 0) {
            handleSelectCategoryAndExpandAncestors(null);
          } else if (currentIndex > 0) {
            const currentCatId = items[currentIndex];
            handleSelectCategoryAndExpandAncestors(currentCatId);
          }
          break;
        }
        case 'Home': {
          e.preventDefault();
          focusItemByIndex(0);
          break;
        }
        case 'End': {
          e.preventDefault();
          focusItemByIndex(items.length - 1);
          break;
        }
      }
    },
    [viewMode, visibleTreeNodes, expandedIds, toggleExpand, handleSelectCategoryAndExpandAncestors]
  );

  const isAllSelected = selectedCategoryId === null && !selectedDocType;

  return (
    <div
      ref={treeContainerRef}
      className="flex flex-col h-full bg-white overflow-hidden text-xs border-r border-gray-200"
      onKeyDown={handleKeyDown}
    >
      {/* 1. Header Segmented Control (Total height: 44px) */}
      <div className="h-[44px] px-2 flex items-center border-b border-gray-200 bg-slate-50/70 shrink-0">
        <div
          role="tablist"
          aria-label="Chế độ xem danh mục"
          className="flex items-center gap-[4px] w-full p-[3px] bg-slate-200/60 rounded-[8px]"
        >
          <button
            role="tab"
            aria-selected={viewMode === 'topic'}
            tabIndex={viewMode === 'topic' ? 0 : -1}
            onClick={() => setViewMode('topic')}
            className={cn(
              'flex-1 h-[34px] px-[10px] rounded-[7px] text-[13px] font-medium transition-all cursor-pointer flex items-center justify-center gap-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 select-none',
              viewMode === 'topic'
                ? 'bg-white text-blue-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <BookOpen className={cn('w-[15px] h-[15px] shrink-0', viewMode === 'topic' ? 'text-blue-600' : 'text-slate-500')} />
            <span className="truncate">Chủ đề</span>
          </button>
          <button
            role="tab"
            aria-selected={viewMode === 'type'}
            tabIndex={viewMode === 'type' ? 0 : -1}
            onClick={() => setViewMode('type')}
            className={cn(
              'flex-1 h-[34px] px-[10px] rounded-[7px] text-[13px] font-medium transition-all cursor-pointer flex items-center justify-center gap-[6px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 select-none',
              viewMode === 'type'
                ? 'bg-white text-blue-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            )}
          >
            <Layers className={cn('w-[15px] h-[15px] shrink-0', viewMode === 'type' ? 'text-blue-600' : 'text-slate-500')} />
            <span className="truncate">Loại văn bản</span>
          </button>
        </div>
      </div>

      {/* 2. Filter input & Action buttons (Height: max 46px, input height: 34px, buttons: 34x34px, gap: 6px) */}
      <div className="h-[46px] px-2 flex items-center border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-[6px] w-full">
          <div className="relative flex-1">
            <Search className="w-[15px] h-[15px] absolute left-[9px] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={viewMode === 'topic' ? 'Lọc danh mục...' : 'Lọc loại văn bản...'}
              aria-label="Lọc danh mục văn bản"
              className="w-full h-[34px] pl-[30px] pr-[26px] py-0 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-gray-200 rounded-[6px] text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {filterText && (
              <button
                type="button"
                onClick={() => setFilterText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer focus:outline-none"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {viewMode === 'topic' && (
            <button
              type="button"
              onClick={areAllExpanded ? collapseAll : expandAll}
              className="w-[34px] h-[34px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-[6px] border border-gray-200 bg-white hover:bg-slate-50 shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title={areAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
              aria-label={areAllExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}
            >
              {areAllExpanded ? (
                <ChevronsUp className="w-[15px] h-[15px]" />
              ) : (
                <ChevronsDown className="w-[15px] h-[15px]" />
              )}
            </button>
          )}

          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="w-[34px] h-[34px] flex items-center justify-center text-slate-500 hover:text-slate-800 rounded-[6px] border border-gray-200 bg-white hover:bg-slate-50 shrink-0 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Ẩn cây chủ đề ( [ )"
              aria-label="Ẩn cây chủ đề"
            >
              <ChevronLeft className="w-[15px] h-[15px]" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Body: Hierarchical Tree vs Document Type Cards */}
      <div
        tabIndex={0}
        role="tree"
        aria-label="Cây phân cấp danh mục pháp luật"
        className="flex-1 overflow-y-auto p-1.5 space-y-[1px] focus:outline-none"
      >
        {/* All documents root item: 38px height, matching Level 0 */}
        <div
          id="category-node-all"
          tabIndex={0}
          role="treeitem"
          aria-level={1}
          aria-selected={isAllSelected}
          data-selected={isAllSelected}
          onClick={() => handleSelectCategoryAndExpandAncestors(null)}
          title={`${totalDocsCount} văn bản thuộc tất cả chủ đề`}
          style={{ paddingLeft: '10px' }}
          className={cn(
            'tree-row group grid grid-cols-[18px_auto_minmax(0,1fr)_24px] items-center gap-x-[7px] pr-[8px] h-[38px] rounded-[6px] cursor-pointer transition-colors text-left relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset mb-[1px]',
            isAllSelected
              ? 'bg-[#eff6ff] text-[#1d4ed8] shadow-[inset_2px_0_0_#2563eb]'
              : 'hover:bg-slate-100/70 text-slate-800 hover:text-slate-950'
          )}
        >
          {/* Column 1: Spacer (18px) */}
          <div className="w-[18px] h-[18px] flex items-center justify-center shrink-0" aria-hidden="true">
            <span className="w-[18px] h-[18px] block" />
          </div>

          {/* Column 2: Root Icon (17px) */}
          <div className="flex items-center justify-center shrink-0">
            <BookOpen
              className={cn(
                'w-[17px] h-[17px] transition-colors',
                isAllSelected ? 'text-[#1d4ed8]' : 'text-slate-500 group-hover:text-slate-700'
              )}
            />
          </div>

          {/* Column 3: Label */}
          <span
            className={cn(
              'truncate leading-[1.25] text-[14px] font-semibold text-left',
              isAllSelected ? 'text-[#1d4ed8]' : 'text-slate-900'
            )}
          >
            {viewMode === 'topic' ? 'Tất cả chủ đề' : 'Tất cả văn bản'}
          </span>

          {/* Column 4: Count */}
          <div className="w-[24px] text-right shrink-0">
            <span
              className={cn(
                'font-mono text-right tabular-nums transition-colors block text-[12px] font-medium',
                isAllSelected ? 'text-[#1d4ed8]' : 'text-slate-400 group-hover:text-slate-600'
              )}
            >
              {totalDocsCount}
            </span>
          </div>
        </div>

        {viewMode === 'topic' ? (
          /* ── View 1: Hierarchical Category Tree (space-y-[1px]) ── */
          <div className="space-y-[1px]">
            {filteredCategories.map((cat) => {
              const isExpanded = expandedIds.has(cat.id) || filterText.length > 0;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <TopicTreeNode
                  key={cat.id}
                  category={cat}
                  depth={0}
                  isSelected={isSelected}
                  isExpanded={isExpanded}
                  expandedIds={expandedIds}
                  filterText={filterText}
                  categoryCounts={categoryCounts}
                  selectedCategoryId={selectedCategoryId}
                  onToggleExpand={toggleExpand}
                  onSelectCategory={handleSelectCategoryAndExpandAncestors}
                />
              );
            })}
          </div>
        ) : (
          /* ── View 2: Distinct Document Type Cards (Compact) ── */
          <div className="space-y-[2px] pt-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
              Phân loại hình thức văn bản
            </div>
            {docTypesWithCounts.map((item) => {
              const isSelected = selectedDocType === item.type;
              const IconComp = item.icon;
              return (
                <div
                  key={item.type}
                  onClick={() => handleSelectDocType(item.type)}
                  role="button"
                  tabIndex={0}
                  data-selected={isSelected}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectDocType(item.type);
                    }
                  }}
                  className={cn(
                    'tree-row group grid grid-cols-[24px_minmax(0,1fr)_24px] items-center gap-x-[7px] px-[8px] h-[34px] rounded-[6px] text-xs cursor-pointer transition-all border text-left',
                    isSelected
                      ? 'bg-[#eff6ff] text-[#1d4ed8] border-blue-200 shadow-[inset_2px_0_0_#2563eb]'
                      : 'bg-white border-gray-200/70 hover:border-gray-300 hover:bg-slate-50/80 text-slate-800'
                  )}
                >
                  <div className={cn('w-[22px] h-[22px] rounded-[4px] flex items-center justify-center shrink-0', item.iconBg)}>
                    <IconComp className="w-[14px] h-[14px]" />
                  </div>
                  <div className="min-w-0 flex items-center">
                    <span
                      className={cn(
                        'font-medium text-[13px] truncate leading-[1.25]',
                        isSelected ? 'text-[#1d4ed8] font-semibold' : 'text-slate-900'
                      )}
                    >
                      {item.label}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'text-[12px] font-mono text-right tabular-nums shrink-0 font-medium',
                      isSelected
                        ? 'text-[#1d4ed8]'
                        : 'text-slate-400 group-hover:text-slate-600'
                    )}
                  >
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
