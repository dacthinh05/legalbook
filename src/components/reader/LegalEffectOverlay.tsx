'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  applyLegalEffectOverlay,
  removeLegalEffectOverlay,
} from '@/lib/legal-effects/provision-resolver';
import { filterEffectsByDate } from '@/lib/legal-effects/timeline-engine';
import type { LegalEffect } from '@/types';
import { ProvisionEffectPopover } from './ProvisionEffectPopover';

interface LegalEffectOverlayProps {
  containerRef: React.RefObject<HTMLElement | null>;
  effects: LegalEffect[];
  showOverlay: boolean;
  selectedDate: string;
  isReady: boolean;
  onEffectClick?: (effect: LegalEffect) => void;
  onOpenDiffModal?: (effect: LegalEffect) => void;
  onSelectDocument?: (documentId: string) => void;
}

export function LegalEffectOverlay({
  containerRef,
  effects,
  showOverlay,
  selectedDate,
  isReady,
  onEffectClick,
  onOpenDiffModal,
  onSelectDocument,
}: LegalEffectOverlayProps) {
  const applyTimeoutRef = useRef<NodeJS.Timeout | number | undefined>(undefined);
  const [activePopoverEffect, setActivePopoverEffect] = useState<LegalEffect | null>(null);
  const [popoverAnchorRect, setPopoverAnchorRect] = useState<DOMRect | null>(null);

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
    if (!container) return;

    const handleMarkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const mark = target.closest('[data-legal-effect-id]') as HTMLElement | null;
      if (!mark) return;

      const effectId = mark.getAttribute('data-legal-effect-id');
      if (effectId) {
        const found = effects.find((eff) => eff.id === effectId);
        if (found) {
          e.stopPropagation();
          const rect = mark.getBoundingClientRect();
          setPopoverAnchorRect(rect);
          setActivePopoverEffect(found);
          onEffectClick?.(found);
        }
      }
    };

    container.addEventListener('click', handleMarkClick);
    return () => container.removeEventListener('click', handleMarkClick);
  }, [containerRef, effects, onEffectClick]);

  // Cleanup on unmount or when overlay turned off
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (container) removeLegalEffectOverlay(container);
    };
  }, [containerRef]);

  // Close popover when date or overlay toggle changes
  useEffect(() => {
    setActivePopoverEffect(null);
    setPopoverAnchorRect(null);
  }, [selectedDate, showOverlay]);

  return (
    <>
      {activePopoverEffect && popoverAnchorRect && showOverlay && (
        <ProvisionEffectPopover
          effect={activePopoverEffect}
          anchorRect={popoverAnchorRect}
          onClose={() => {
            setActivePopoverEffect(null);
            setPopoverAnchorRect(null);
          }}
          onOpenDiffModal={onOpenDiffModal}
          onSelectDocument={onSelectDocument}
        />
      )}
    </>
  );
}
