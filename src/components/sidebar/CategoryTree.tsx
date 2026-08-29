'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  ChevronsDown,
  ChevronsUp,
  Percent,
  BookOpen,
  ClipboardCheck,
  ShieldCheck,
  Users,
  Building2,
  TrendingUp,
  Layers,
  Scale,
  FileText,
  Gavel,
  MailCheck,
  FileSpreadsheet,
  LucideIcon,
  X,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, DocumentType, LegalDocument } from '@/types';
import { DEMO_DOCUMENTS, DEMO_CATEGORY_LINKS } from '@/lib/demo-data';
import { getAncestorCategoryIds, getDescendantCategoryIds } from '@/lib/tree-utils';

interface CategoryTreeProps {
  categories: Category[];
  allDocuments?: LegalDocument[];
  selectedCategoryId: string | null;
  selectedDocType?: DocumentType | null;
  onSelectCategory: (id: string | null) => void;
  onSelectDocType?: (type: DocumentType | null) => void;
  readDocuments?: Set<string>;
  activeCategoryCount?: number;
}

const STORAGE_KEY_EXPANDED = 'lb_tree_expanded_ids';

function getRootCategoryIcon(category: Category): LucideIcon {
  const slug = (category.slug || '').toLowerCase();
  if (slug.includes('thue')) return Percent;
  if (slug.includes('ke-toan')) return BookOpen;
  if (slug.includes('kiem-toan')) return ClipboardCheck;
  if (slug.includes('bao-hiem') || slug.includes('bhxh')) return ShieldCheck;
  if (slug.includes('lao-dong')) return Users;
  if (slug.includes('doanh-nghiep')) return Building2;
  if (slug.includes('dau-tu')) return TrendingUp;
  return BookOpen;
}

interface DocTypeMeta {
  type: DocumentType;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  colorClass: string;
  badgeBg: string;
  iconBg: string;
}

const DOC_TYPE_METAS: DocTypeMeta[] = [
  {
    type: 'luat',
    label: 'Luật / Bộ luật',
    sublabel: 'Do Quốc hội ban hành',
    icon: Scale,
    colorClass: 'text-blue-700 border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800',
    iconBg: 'bg-blue-50 text-blue-700',
  },
  {
    type: 'nghi_dinh',
    label: 'Nghị định',
    sublabel: 'Do Chính phủ ban hành',
    icon: Building2,
    colorClass: 'text-purple-700 border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800',
    iconBg: 'bg-purple-50 text-purple-700',
  },
  {
    type: 'thong_tu',
    label: 'Thông tư',
    sublabel: 'Do Bộ ngành ban hành',
    icon: FileText,
    colorClass: 'text-teal-700 border-teal-200',
    badgeBg: 'bg-teal-100 text-teal-800',
    iconBg: 'bg-teal-50 text-teal-700',
  },
  {
    type: 'quyet_dinh',
    label: 'Quyết định',
    sublabel: 'Quy định áp dụng cá biệt',
    icon: Gavel,
    colorClass: 'text-orange-700 border-orange-200',
    badgeBg: 'bg-orange-100 text-orange-800',
    iconBg: 'bg-orange-50 text-orange-700',
  },
  {
    type: 'cong_van',
    label: 'Công văn hướng dẫn',
    sublabel: 'Giải đáp vướng mắc nghiệp vụ',
    icon: MailCheck,
    colorClass: 'text-cyan-700 border-cyan-200',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    iconBg: 'bg-cyan-50 text-cyan-700',
  },
  {
    type: 'chuan_muc',
    label: 'Chuẩn mực (VAS / IFRS)',
    sublabel: 'Hệ thống chuẩn mực nghề nghiệp',
    icon: Layers,
    colorClass: 'text-indigo-700 border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    iconBg: 'bg-indigo-50 text-indigo-700',
  },
  {
    type: 'khac',
    label: 'Bản tin & Văn bản hợp nhất',
    sublabel: 'Tài liệu tra cứu đối chiếu',
    icon: FileSpreadsheet,
    colorClass: 'text-slate-700 border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-800',
    iconBg: 'bg-slate-100 text-slate-700',
  },
];

export function CategoryTree({
  categories,
  allDocuments,
  selectedCategoryId,
  selectedDocType,
  onSelectCategory,
  onSelectDocType,
}: CategoryTreeProps) {
  const [viewMode, setViewMode] = useState<'topic' | 'type'>('topic');

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initialSet = new Set<string>();

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_EXPANDED);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((id: string) => initialSet.add(id));
          }
        }
      } catch {}
    }

    if (selectedCategoryId) {
      const ancestors = getAncestorCategoryIds(selectedCategoryId, categories);
      ancestors.forEach((aId) => initialSet.add(aId));
    }

    if (initialSet.size === 0) {
      categories.forEach((c) => {
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
  const [focusedId, setFocusedId] = useState<string | null>(null);
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
        const ancestors = getAncestorCategoryIds(catId, categories);
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
    [categories, onSelectCategory, onSelectDocType, saveExpandedState]
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
    collect(categories);
    setExpandedIds(allIds);
    saveExpandedState(allIds);
  }, [categories, saveExpandedState]);

  const collapseAll = useCallback(() => {
    const emptySet = new Set<string>();
    setExpandedIds(emptySet);
    saveExpandedState(emptySet);
  }, [saveExpandedState]);

  const filteredCategories = useMemo(() => {
    if (!filterText.trim()) return categories;
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

    return categories.map(filterNode).filter(Boolean) as Category[];
  }, [categories, filterText]);

  // Dynamic calculation of document counts from allDocuments
  const docsList = useMemo(() => allDocuments || (DEMO_DOCUMENTS as unknown as LegalDocument[]), [allDocuments]);
  const totalDocsCount = docsList.length;

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((cat) => {
      const descendantIds = new Set(getDescendantCategoryIds(cat.id, categories));
      const count = docsList.filter((d) => {
        const links = DEMO_CATEGORY_LINKS.filter((l) => l.document_id === d.id);
        return links.some((l) => descendantIds.has(l.category_id));
      }).length;
      map.set(cat.id, count);
    });
    return map;
  }, [categories, docsList]);

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

  const renderCategoryNode = (category: Category, depth = 0) => {
    const isExpanded = expandedIds.has(category.id) || filterText.length > 0;
    const isSelected = selectedCategoryId === category.id;
    const isFocused = focusedId === category.id;
    const hasChildren = category.children && category.children.length > 0;
    const count = categoryCounts.get(category.id) ?? (category.document_count ?? 0);
    const isRoot = depth === 0;
    const IconComponent = isRoot ? getRootCategoryIcon(category) : null;

    return (
      <div key={category.id} className="select-none">
        <div
          id={`category-node-${category.id}`}
          tabIndex={0}
          role="treeitem"
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-selected={isSelected}
          onFocus={() => setFocusedId(category.id)}
          onClick={() => handleSelectCategoryAndExpandAncestors(category.id)}
          className={cn(
            'group flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-xs cursor-pointer transition-colors relative focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500',
            isSelected
              ? 'bg-blue-50 text-blue-900 font-semibold'
              : isFocused
              ? 'bg-slate-100/90 text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
            isRoot && 'font-medium'
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          title={category.name}
        >
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(category.id, e)}
              className="p-0.5 text-slate-400 hover:text-slate-700 rounded shrink-0 transition-colors cursor-pointer"
              aria-label={isExpanded ? 'Thu gọn mục' : 'Mở rộng mục'}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {IconComponent && (
            <IconComponent className="w-3.5 h-3.5 text-slate-500 shrink-0 group-hover:text-slate-800" />
          )}

          <span className="flex-1 truncate leading-tight">
            {category.name}
          </span>

          {count > 0 && (
            <span
              className={cn(
                'px-1.5 py-0.2 rounded text-[10.5px] font-mono shrink-0 transition-colors',
                isSelected
                  ? 'bg-blue-200/60 text-blue-950 font-semibold'
                  : 'text-slate-400 group-hover:text-slate-600'
              )}
            >
              {count}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 ml-1">
            {category.children!.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={treeContainerRef}
      className="flex flex-col h-full bg-white overflow-hidden text-xs"
    >
      {/* 1. Header Switcher: Theo chủ đề vs Theo loại VB */}
      <div className="p-2.5 border-b border-slate-200 bg-slate-50/70 shrink-0 space-y-2">
        <div className="flex items-center p-0.5 bg-slate-200/70 rounded-lg">
          <button
            onClick={() => setViewMode('topic')}
            className={cn(
              'flex-1 py-1 text-center font-semibold rounded-md text-[11.5px] transition-all cursor-pointer flex items-center justify-center gap-1',
              viewMode === 'topic'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <BookOpen className="w-3 h-3 text-blue-600" />
            <span>Theo chủ đề</span>
          </button>
          <button
            onClick={() => setViewMode('type')}
            className={cn(
              'flex-1 py-1 text-center font-semibold rounded-md text-[11.5px] transition-all cursor-pointer flex items-center justify-center gap-1',
              viewMode === 'type'
                ? 'bg-white text-purple-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Layers className="w-3 h-3 text-purple-600" />
            <span>Theo loại VB</span>
          </button>
        </div>

        {/* Filter input */}
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={viewMode === 'topic' ? 'Lọc danh mục...' : 'Lọc loại văn bản...'}
              aria-label="Lọc danh mục văn bản"
              className="w-full pl-6 pr-2 py-1 bg-white border border-slate-200 rounded text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {viewMode === 'topic' && (
            <>
              <button
                onClick={expandAll}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                title="Mở rộng tất cả"
                aria-label="Mở rộng tất cả"
              >
                <ChevronsDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={collapseAll}
                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                title="Thu gọn tất cả"
                aria-label="Thu gọn tất cả"
              >
                <ChevronsUp className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. Body: Hierarchical Tree vs Distinct Document Type Grid */}
      <div
        tabIndex={0}
        role="tree"
        aria-label="Cây phân cấp danh mục pháp luật"
        className="flex-1 overflow-y-auto p-2 space-y-1 focus:outline-none"
      >
        {/* All documents root item */}
        <div
          id="category-node-all"
          tabIndex={0}
          role="treeitem"
          aria-selected={selectedCategoryId === null && !selectedDocType}
          onClick={() => handleSelectCategoryAndExpandAncestors(null)}
          className={cn(
            'flex items-center justify-between h-9 px-3 rounded-lg text-xs cursor-pointer font-medium transition-colors mb-1.5 border',
            selectedCategoryId === null && !selectedDocType
              ? 'bg-blue-50 text-blue-900 border-blue-200 font-bold shadow-2xs'
              : 'text-slate-700 bg-slate-50/50 border-slate-200/60 hover:bg-slate-100 hover:text-slate-900'
          )}
        >
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{viewMode === 'topic' ? 'Tất cả chủ đề' : 'Tất cả văn bản'}</span>
          </div>
          <span className="text-[10.5px] font-mono font-bold text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
            {totalDocsCount}
          </span>
        </div>

        {viewMode === 'topic' ? (
          /* ── View 1: Hierarchical Category Tree ── */
          filteredCategories.map((cat) => renderCategoryNode(cat, 0))
        ) : (
          /* ── View 2: Distinct Document Type Cards ── */
          <div className="space-y-1.5 pt-0.5">
            <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1">
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectDocType(item.type)}
                  className={cn(
                    'group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all border',
                    isSelected
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-400 ring-1 ring-blue-500 text-blue-950 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('p-1.5 rounded-md shrink-0', item.iconBg)}>
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className={cn('font-bold text-[12px] truncate leading-tight', isSelected ? 'text-blue-900' : 'text-slate-900')}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.2">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1',
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
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
