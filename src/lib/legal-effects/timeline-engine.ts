/**
 * timeline-engine.ts
 * 
 * Time-Aware Legal Effect Timeline and Point-in-Time Calculation Engine.
 */

import type { LegalEffect, LegalEffectType } from '@/types';

export interface EffectBadgeMeta {
  label: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
  categoryLabel: string;
  isSubstantiveChange: boolean;
}

/**
 * Returns clean metadata and display badge styling for each legal effect type.
 */
export function getEffectBadgeMeta(effectType: LegalEffectType): EffectBadgeMeta {
  switch (effectType) {
    case 'amends':
      return {
        label: 'Sửa đổi',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        textClass: 'text-rose-700',
        borderClass: 'border-rose-500',
        categoryLabel: 'Làm thay đổi nội dung',
        isSubstantiveChange: true,
      };
    case 'supplements':
      return {
        label: 'Bổ sung',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        textClass: 'text-purple-700',
        borderClass: 'border-purple-500',
        categoryLabel: 'Bổ sung quy định mới',
        isSubstantiveChange: true,
      };
    case 'replaces':
      return {
        label: 'Thay thế',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        textClass: 'text-rose-700',
        borderClass: 'border-rose-500',
        categoryLabel: 'Thay thế điều khoản',
        isSubstantiveChange: true,
      };
    case 'repeals':
      return {
        label: 'Bãi bỏ toàn bộ',
        badgeClass: 'bg-red-100 text-red-900 border-red-300',
        textClass: 'text-red-800',
        borderClass: 'border-red-600',
        categoryLabel: 'Bãi bỏ hiệu lực',
        isSubstantiveChange: true,
      };
    case 'partially_repeals':
      return {
        label: 'Bãi bỏ một phần',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
        textClass: 'text-orange-700',
        borderClass: 'border-orange-500',
        categoryLabel: 'Bãi bỏ một phần',
        isSubstantiveChange: true,
      };
    case 'suspends':
      return {
        label: 'Đình chỉ hiệu lực',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-500',
        categoryLabel: 'Tạm ngưng áp dụng',
        isSubstantiveChange: true,
      };
    case 'extends':
      return {
        label: 'Gia hạn hiệu lực',
        badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        textClass: 'text-indigo-700',
        borderClass: 'border-indigo-500',
        categoryLabel: 'Kéo dài thời hạn',
        isSubstantiveChange: true,
      };
    case 'corrects':
      return {
        label: 'Đính chính',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-500',
        categoryLabel: 'Đính chính kỹ thuật',
        isSubstantiveChange: true,
      };
    case 'guides':
      return {
        label: 'Hướng dẫn',
        badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
        textClass: 'text-sky-700',
        borderClass: 'border-sky-500',
        categoryLabel: 'Hỗ trợ áp dụng',
        isSubstantiveChange: false,
      };
    case 'implements':
      return {
        label: 'Quy định chi tiết',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        textClass: 'text-blue-700',
        borderClass: 'border-blue-500',
        categoryLabel: 'Thi hành chi tiết',
        isSubstantiveChange: false,
      };
    case 'references':
    default:
      return {
        label: 'Dẫn chiếu',
        badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
        textClass: 'text-slate-700',
        borderClass: 'border-slate-500',
        categoryLabel: 'Liên kết tham chiếu',
        isSubstantiveChange: false,
      };
  }
}

/**
 * Filters legal effects active at a specific query date (YYYY-MM-DD).
 */
export function filterEffectsByDate(
  effects: LegalEffect[],
  targetDateStr: string
): LegalEffect[] {
  if (!targetDateStr) return effects;

  return effects.filter((effect) => {
    // Effect must have come into force on or before target date
    if (effect.effectiveFrom > targetDateStr) {
      return false;
    }
    // If effect expired before target date, it is no longer active
    if (effect.effectiveTo && effect.effectiveTo < targetDateStr) {
      return false;
    }
    return true;
  });
}

/**
 * Calculates point-in-time statistics for a document.
 */
export function calculatePointInTimeStats(
  effects: LegalEffect[],
  targetDateStr: string
): {
  totalActiveEffects: number;
  substantiveChangesCount: number;
  guidelinesCount: number;
  amendedArticlesCount: number;
} {
  const active = filterEffectsByDate(effects, targetDateStr);
  let substantive = 0;
  let guidelines = 0;
  const affectedArticles = new Set<string>();

  for (const e of active) {
    if (e.category === 'substantive_change') {
      substantive++;
    } else {
      guidelines++;
    }
    if (e.targetProvisionLabel) {
      affectedArticles.add(e.targetProvisionLabel);
    }
  }

  return {
    totalActiveEffects: active.length,
    substantiveChangesCount: substantive,
    guidelinesCount: guidelines,
    amendedArticlesCount: affectedArticles.size,
  };
}
