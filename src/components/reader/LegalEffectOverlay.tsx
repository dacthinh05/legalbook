'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  applyLegalEffectOverlay,
  removeLegalEffectOverlay,
} from '@/lib/legal-effects/provision-resolver';
import { filterEffectsByDate } from '@/lib/legal-effects/timeline-engine';
import type { LegalEffect } from '@/types';

interface LegalEffectOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
  effects: LegalEffect[];
  showOverlay: boolean;
  selectedDate: string;
  isReady: boolean;
  onEffectClick?: (effect: LegalEffect) => void;
}

export function LegalEffectOverlay({
  containerRef,
  effects,
  showOverlay,
  selectedDate,
  isReady,
  onEffectClick,
}: LegalEffectOverlayProps) {
  const applyTimeoutRef = useRef<NodeJS.Timeout | number | undefined>(undefined);

  const applyOverlay = useCallback(() => {
    const container = containerRef.current;
    if (!container || !isReady) return;

    if (!showOverlay || effects.length === 0) {
      removeLegalEffectOverlay(container);
      return;
    }

    // Filter effects active at selected point-in-time date
    const activeEffects = filterEffectsByDate(effects, selectedDate);
    applyLegalEffectOverlay(container, activeEffects);
  }, [containerRef, effects, isReady, selectedDate, showOverlay]);

  useEffect(() => {
    if (!isReady) return;

    clearTimeout(applyTimeoutRef.current);
    applyTimeoutRef.current = setTimeout(applyOverlay, 60);

    return () => {
      clearTimeout(applyTimeoutRef.current);
    };
  }, [applyOverlay, isReady, effects, showOverlay, selectedDate]);

  // Click delegation on legal effect marks
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onEffectClick) return;

    const handleMarkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest('[data-legal-effect-id]') as HTMLElement | null;
      if (!mark) return;

      const effectId = mark.getAttribute('data-legal-effect-id');
      if (effectId) {
        const found = effects.find((eff) => eff.id === effectId);
        if (found) {
          e.stopPropagation();
          onEffectClick(found);
        }
      }
    };

    container.addEventListener('click', handleMarkClick);
    return () => container.removeEventListener('click', handleMarkClick);
  }, [containerRef, effects, onEffectClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const container = containerRef.current;
      if (container) removeLegalEffectOverlay(container);
    };
  }, [containerRef]);

  return null;
}
