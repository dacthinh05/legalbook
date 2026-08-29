'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Info,
  HelpCircle,
  Eye,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { LegalEffect } from '@/types';

interface PointInTimeSelectorProps {
  issuedDate?: string | null;
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  showOverlay: boolean;
  onToggleShowOverlay: () => void;
  activeEffectsCount: number;
  totalEffectsCount: number;
}

export function PointInTimeSelector({
  issuedDate,
  selectedDate,
  onSelectDate,
  showOverlay,
  onToggleShowOverlay,
  activeEffectsCount,
  totalEffectsCount,
}: PointInTimeSelectorProps) {
  const [showLegend, setShowLegend] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);

  const todayStr = '2026-08-29';
  const isCurrent = selectedDate === todayStr;
  const isIssued = issuedDate && selectedDate === issuedDate;

  return (
    <div className="px-3 sm:px-5 py-1.5 bg-slate-100/90 border-b border-slate-200/90 flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap">
      {/* 1. Left: Point-in-time date selector */}
      <div className="flex items-center gap-2 flex-wrap min-w-0">
        <div className="flex items-center gap-1 text-slate-500 font-medium">
          <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="hidden sm:inline">Nội dung tại:</span>
        </div>

        {/* Date presets */}
        <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              onSelectDate(todayStr);
              setShowCustomDate(false);
            }}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer',
              isCurrent && !showCustomDate
                ? 'bg-blue-50 text-blue-900 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Hiện hành ({formatDate(todayStr)})
          </button>

          {issuedDate && (
            <button
              type="button"
              onClick={() => {
                onSelectDate(issuedDate);
                setShowCustomDate(false);
              }}
              className={cn(
                'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer',
                isIssued && !showCustomDate
                  ? 'bg-blue-50 text-blue-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Ngày ban hành ({formatDate(issuedDate)})
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowCustomDate(!showCustomDate)}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1',
              showCustomDate || (!isCurrent && !isIssued)
                ? 'bg-blue-50 text-blue-900 font-bold'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Calendar className="w-3 h-3" />
            <span>Tùy chọn ngày</span>
          </button>
        </div>

        {/* Custom date input */}
        {showCustomDate && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onSelectDate(e.target.value)}
            className="h-6 px-2 text-[11px] bg-white border border-blue-400 rounded-md outline-none text-slate-900 font-mono shadow-xs"
            aria-label="Chọn ngày tra cứu hiệu lực"
          />
        )}

        {/* Active changes badge */}
        {totalEffectsCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'text-[10.5px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1',
                activeEffectsCount > 0
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              )}
            >
              <span>{activeEffectsCount} tác động hiệu lực</span>
            </span>
          </div>
        )}
      </div>

      {/* 2. Right: Toggle Overlay & Legend */}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        {/* Toggle highlight overlay button */}
        {totalEffectsCount > 0 && (
          <button
            type="button"
            onClick={onToggleShowOverlay}
            className={cn(
              'px-2 py-1 rounded-md border text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs',
              showOverlay
                ? 'bg-white text-blue-900 border-slate-300'
                : 'bg-slate-200/80 text-slate-500 border-slate-300'
            )}
            title={showOverlay ? 'Tắt đánh dấu thay đổi' : 'Hiện đánh dấu thay đổi'}
            aria-label={showOverlay ? 'Tắt đánh dấu thay đổi' : 'Hiện đánh dấu thay đổi'}
          >
            {showOverlay ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOverlay ? 'Đang hiện đánh dấu' : 'Đã ẩn đánh dấu'}</span>
          </button>
        )}

        {/* Legend Popover Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className="p-1 text-slate-500 hover:text-slate-900 rounded-md hover:bg-white transition-colors cursor-pointer flex items-center gap-0.5 text-[11px]"
            title="Chú giải màu sắc đánh dấu thay đổi"
            aria-label="Chú giải màu sắc đánh dấu"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chú giải</span>
          </button>

          {/* Legend Popover */}
          {showLegend && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs space-y-2 animate-in fade-in duration-100">
              <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between text-[11px] uppercase tracking-wider">
                <span>Quy ước màu đánh dấu</span>
                <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-slate-700">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 p-1 rounded bg-rose-50 border border-rose-200">
                  <span className="w-3 h-3 rounded-xs bg-rose-500 shrink-0" />
                  <span className="font-semibold text-rose-950">Sửa đổi, thay thế, bãi bỏ</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-purple-50 border border-purple-200">
                  <span className="w-3 h-3 rounded-xs bg-purple-500 shrink-0" />
                  <span className="font-semibold text-purple-950">Bổ sung quy định mới</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-emerald-50 border border-emerald-200">
                  <span className="w-3 h-3 rounded-xs bg-emerald-500 shrink-0" />
                  <span className="font-semibold text-emerald-950">Đính chính</span>
                </div>
                <div className="flex items-center gap-2 p-1 rounded bg-sky-50 border border-sky-200">
                  <span className="w-3 h-3 rounded-xs border border-dashed border-sky-600 bg-sky-200 shrink-0" />
                  <span className="font-semibold text-sky-950">Hướng dẫn / Quy định chi tiết</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 italic">
                Nhấn vào đoạn bôi màu trong văn bản để xem chi tiết văn bản tác động và so sánh trước / sau.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
