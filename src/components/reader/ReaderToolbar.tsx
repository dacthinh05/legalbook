'use client';

import { ZoomIn, ZoomOut, RotateCcw, Search, FileCode, FileText, ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReaderToolbarProps {
  viewMode: 'html' | 'pdf';
  onViewModeChange: (mode: 'html' | 'pdf') => void;
  hasPdf?: boolean;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showOutline: boolean;
  onToggleOutline: () => void;
  totalMatches?: number;
}

export function ReaderToolbar({
  viewMode,
  onViewModeChange,
  hasPdf = true,
  fontSize,
  onFontSizeChange,
  zoom,
  onZoomChange,
  searchQuery,
  onSearchQueryChange,
  showOutline,
  onToggleOutline,
  totalMatches,
}: ReaderToolbarProps) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-1.5 flex items-center justify-between gap-3 text-xs text-gray-600 flex-shrink-0 flex-wrap">
      {/* Left: View mode toggle & Outline toggle */}
      <div className="flex items-center gap-1.5">
        <div className="bg-gray-200/80 p-0.5 rounded-lg flex items-center">
          <button
            onClick={() => onViewModeChange('html')}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
              viewMode === 'html'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Nội dung chuẩn</span>
          </button>
          <button
            onClick={() => onViewModeChange('pdf')}
            disabled={!hasPdf}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all',
              viewMode === 'pdf'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900',
              !hasPdf && 'opacity-40 cursor-not-allowed'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Bản gốc PDF</span>
          </button>
        </div>

        {/* Outline toggle button */}
        {viewMode === 'html' && (
          <button
            onClick={onToggleOutline}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium ml-1 transition-colors',
              showOutline
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            )}
            title="Mục lục Điều, Khoản"
          >
            <ListTree className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mục lục điều</span>
          </button>
        )}
      </div>

      {/* Middle: Search in document */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1 max-w-[200px] flex-1 sm:flex-initial">
        <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Tìm trong văn bản..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="bg-transparent text-[11px] outline-none w-full text-gray-800 placeholder:text-gray-400"
        />
        {searchQuery && (
          <span className="text-[10px] text-gray-400 whitespace-nowrap">
            {totalMatches !== undefined ? `${totalMatches} khớp` : ''}
          </span>
        )}
      </div>

      {/* Right: Typography & Zoom controls */}
      <div className="flex items-center gap-2">
        {viewMode === 'html' ? (
          <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-md px-1 py-0.5">
            <button
              onClick={() => onFontSizeChange(Math.max(12, fontSize - 2))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 text-[10px] font-bold"
              title="Giảm kích thước chữ"
            >
              A-
            </button>
            <span className="text-[11px] px-1 font-mono text-gray-500">{fontSize}px</span>
            <button
              onClick={() => onFontSizeChange(Math.min(24, fontSize + 2))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600 text-[11px] font-bold"
              title="Tăng kích thước chữ"
            >
              A+
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-md px-1.5 py-0.5">
            <button
              onClick={() => onZoomChange(Math.max(50, zoom - 15))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[11px] font-mono text-gray-500 w-10 text-center">{zoom}%</span>
            <button
              onClick={() => onZoomChange(Math.min(200, zoom + 15))}
              className="p-1 hover:bg-gray-100 rounded text-gray-600"
              title="Phóng to"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={() => onZoomChange(100)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
              title="Mặc định 100%"
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
