'use client';

import { cn } from '@/lib/utils';
import type { DocumentStatus } from '@/types';

type FilterStatus = DocumentStatus | 'all' | 'unread' | 'bookmarked' | 'new';

const FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hieu_luc', label: 'Đang HLực' },
  { value: 'chua_hieu_luc', label: 'Chưa HLực' },
  { value: 'het_hieu_luc_mot_phan', label: 'HLực một phần' },
  { value: 'het_hieu_luc_toan_bo', label: 'Hết HLực' },
  { value: 'unread', label: 'Chưa đọc' },
  { value: 'bookmarked', label: 'Đã ghim' },
  { value: 'new', label: 'Mới' },
];

interface DocumentFiltersProps {
  value: FilterStatus;
  onChange: (v: FilterStatus) => void;
}

export function DocumentFilters({ value, onChange }: DocumentFiltersProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
      {FILTERS.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={cn(
            'flex-shrink-0 px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap',
            value === f.value
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
