'use client';

import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Columns2,
  Rows,
  Filter,
  CheckCircle2,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  compareLegalDocuments,
  type LegalDocumentDiffResult,
  type ArticleDiffItem,
  type DiffToken,
} from '@/lib/diff-engine';
import type { LegalDocument } from '@/types';

interface LegalDiffViewerProps {
  documentA: LegalDocument;
  documentB: LegalDocument;
  onClose?: () => void;
  onSelectDocument?: (id: string) => void;
}

export function LegalDiffViewer({
  documentA,
  documentB,
  onClose,
}: LegalDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [filterMode, setFilterMode] = useState<'all' | 'modified_only'>('modified_only');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Compute diff once with useMemo
  const diffResult: LegalDocumentDiffResult = useMemo(() => {
    return compareLegalDocuments(
      { title: documentA.title, html: documentA.html_content || '' },
      { title: documentB.title, html: documentB.html_content || '' }
    );
  }, [documentA, documentB]);

  const filteredArticles = useMemo(() => {
    if (filterMode === 'modified_only') {
      return diffResult.articles.filter((a) => a.status !== 'unchanged');
    }
    return diffResult.articles;
  }, [diffResult.articles, filterMode]);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
      {/* 1. Header Toolbar */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-blue-100/70 text-blue-700 rounded-lg">
            <GitCompare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
              <span>So sánh điều khoản pháp lý</span>
            </h3>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 truncate">
              <span className="font-medium text-slate-700 truncate">{documentA.document_number || 'Văn bản A'}</span>
              <span>↔</span>
              <span className="font-medium text-blue-700 truncate">{documentB.document_number || 'Văn bản B'}</span>
            </div>
          </div>
        </div>

        {/* View mode and Filter Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Filter toggle */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterMode('modified_only')}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1',
                filterMode === 'modified_only'
                  ? 'bg-white text-blue-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Filter className="w-3 h-3" />
              <span>Chỉ xem sửa đổi ({diffResult.modifiedArticlesCount + diffResult.addedArticlesCount + diffResult.deletedArticlesCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                'px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                filterMode === 'all'
                  ? 'bg-white text-blue-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <span>Tất cả ({diffResult.totalArticlesCount})</span>
            </button>
          </div>

          {/* Unified / Split toggle */}
          <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('unified')}
              className={cn(
                'p-1.5 rounded-md transition-colors cursor-pointer',
                viewMode === 'unified'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Xem gộp dòng (Unified inline)"
              aria-label="Xem gộp dòng"
            >
              <Rows className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'p-1.5 rounded-md transition-colors cursor-pointer',
                viewMode === 'split'
                  ? 'bg-white text-blue-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
              title="Xem song song (Side-by-side)"
              aria-label="Xem song song"
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Đóng so sánh"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Bar */}
      <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200/80 flex items-center gap-3 text-[11px] flex-wrap">
        <div className="flex items-center gap-1 text-slate-700">
          <span className="text-slate-400">Tổng số:</span>
          <strong className="font-semibold">{diffResult.totalArticlesCount} điều</strong>
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex items-center gap-1 text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Sửa đổi:</span>
          <strong className="font-semibold">{diffResult.modifiedArticlesCount}</strong>
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex items-center gap-1 text-emerald-800">
          <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Thêm mới:</span>
          <strong className="font-semibold">{diffResult.addedArticlesCount} (+{diffResult.totalWordsAdded} từ)</strong>
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex items-center gap-1 text-rose-800">
          <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Bãi bỏ:</span>
          <strong className="font-semibold">{diffResult.deletedArticlesCount} (-{diffResult.totalWordsDeleted} từ)</strong>
        </div>
      </div>

      {/* 3. Main Diff Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-800">Không có điều khoản nào bị sửa đổi</p>
            <p className="text-xs text-slate-500">Tất cả điều khoản giữa hai văn bản hoàn toàn trùng khớp.</p>
          </div>
        ) : (
          filteredArticles.map((art) => (
            <ArticleDiffCard
              key={art.articleId}
              article={art}
              viewMode={viewMode}
              isSelected={selectedArticleId === art.articleId}
              onSelect={() => setSelectedArticleId(art.articleId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ArticleDiffCard({
  article,
  viewMode,
  isSelected,
  onSelect,
}: {
  article: ArticleDiffItem;
  viewMode: 'unified' | 'split';
  isSelected: boolean;
  onSelect: () => void;
}) {
  const getStatusBadge = () => {
    switch (article.status) {
      case 'modified':
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Sửa đổi, bổ sung
          </span>
        );
      case 'added':
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            + Điều khoản mới
          </span>
        );
      case 'deleted':
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
            - Đã bãi bỏ
          </span>
        );
      case 'unchanged':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10.5px] font-medium bg-slate-100 text-slate-600">
            Giữ nguyên
          </span>
        );
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-xl border bg-white overflow-hidden transition-all text-xs',
        isSelected ? 'border-blue-400 ring-2 ring-blue-500/20 shadow-xs' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      {/* Article Header */}
      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="font-bold text-slate-900 text-[12.5px]">
            {article.articleTitleB || article.articleTitleA || article.articleLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {article.additionsCount > 0 && (
            <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
              +{article.additionsCount}
            </span>
          )}
          {article.deletionsCount > 0 && (
            <span className="text-[10px] font-mono font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
              -{article.deletionsCount}
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>

      {/* Article Content Display */}
      <div className="p-3.5 leading-relaxed font-sans select-text">
        {viewMode === 'unified' ? (
          <div className="whitespace-pre-wrap space-y-1">
            {article.tokens.map((token, idx) => {
              if (token.op === 'added') {
                return (
                  <ins
                    key={idx}
                    className="bg-emerald-100 text-emerald-950 font-medium px-0.5 rounded-[2px] no-underline"
                  >
                    {token.text}
                  </ins>
                );
              }
              if (token.op === 'deleted') {
                return (
                  <del
                    key={idx}
                    className="bg-rose-100 text-rose-950 line-through opacity-80 px-0.5 rounded-[2px]"
                  >
                    {token.text}
                  </del>
                );
              }
              return <span key={idx}>{token.text}</span>;
            })}
          </div>
        ) : (
          /* Side-by-side View */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-2.5 rounded-lg bg-rose-50/40 border border-rose-100 whitespace-pre-wrap">
              <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mb-1.5 pb-1 border-b border-rose-200/60">
                Văn bản gốc (Trước sửa đổi)
              </div>
              <div className="text-slate-800">
                {article.tokens
                  .filter((t) => t.op !== 'added')
                  .map((t, idx) => (
                    <span
                      key={idx}
                      className={t.op === 'deleted' ? 'bg-rose-200/80 text-rose-950 font-medium px-0.5 rounded-[2px]' : ''}
                    >
                      {t.text}
                    </span>
                  ))}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-100 whitespace-pre-wrap">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1.5 pb-1 border-b border-emerald-200/60">
                Văn bản sửa đổi (Hiện hành)
              </div>
              <div className="text-slate-800">
                {article.tokens
                  .filter((t) => t.op !== 'deleted')
                  .map((t, idx) => (
                    <span
                      key={idx}
                      className={t.op === 'added' ? 'bg-emerald-200/80 text-emerald-950 font-medium px-0.5 rounded-[2px]' : ''}
                    >
                      {t.text}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
