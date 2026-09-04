'use client';

import { ArrowUp, ArrowDown, ChevronDown } from 'lucide-react';

type SortField = 'updated_at' | 'issued_date' | 'effective_date' | 'document_number';

interface SortSelectProps {
  field: SortField;
  dir: 'asc' | 'desc';
  onFieldChange: (field: SortField) => void;
  onDirChange: (dir: 'asc' | 'desc') => void;
}

const SORT_LABELS: Record<SortField, string> = {
  updated_at: 'Cập nhật gần nhất',
  issued_date: 'Ngày ban hành (Mới nhất)',
  effective_date: 'Ngày hiệu lực (Mới nhất)',
  document_number: 'Số hiệu (A-Z)',
};

export function SortSelect({ field, dir, onFieldChange, onDirChange }: SortSelectProps) {
  return (
    <div className="flex items-center justify-between gap-2 min-w-0 w-full">
      {/* Sort field selector */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <span className="text-[11px] text-gray-400 shrink-0">Xếp theo:</span>
        <div className="relative min-w-0 flex-1">
          <select
            value={field}
            onChange={(e) => onFieldChange(e.target.value as SortField)}
            aria-label="Tiêu chí sắp xếp"
            className="w-full min-w-0 appearance-none pl-2 pr-5 py-1 bg-transparent border-none text-[11px] font-medium text-gray-700 focus:outline-none cursor-pointer rounded hover:bg-gray-100 transition-colors"
          >
            {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
              <option key={f} value={f}>
                {SORT_LABELS[f]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Direction toggle — minimum 36×36 hit area */}
      <button
        onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
        style={{ minWidth: '58px', minHeight: '28px' }}
        title={dir === 'asc' ? 'Tăng dần — nhấn để đảo chiều' : 'Giảm dần — nhấn để đảo chiều'}
        aria-label={
          dir === 'asc'
            ? 'Đang sắp xếp tăng dần, nhấn để chuyển sang giảm dần'
            : 'Đang sắp xếp giảm dần, nhấn để chuyển sang tăng dần'
        }
        aria-pressed={dir === 'desc'}
      >
        {dir === 'asc' ? (
          <>
            <ArrowUp className="w-3 h-3" aria-hidden="true" />
            <span>Tăng</span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3 h-3" aria-hidden="true" />
            <span>Giảm</span>
          </>
        )}
      </button>
    </div>
  );
}
