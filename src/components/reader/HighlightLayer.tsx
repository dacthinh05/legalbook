'use client';

/**
 * HighlightLayer.tsx
 * Overlay component that applies annotation marks onto rendered HTML.
 *
 * Principles:
 * - NEVER modifies the original HTML string
 * - Calls annotation-engine.applyAnnotations() AFTER dangerouslySetInnerHTML renders
 * - Separates user annotations from search highlights (different layers, different classes)
 * - Handles re-anchor notifications for orphaned annotations
 * - Supports note margin markers (right-edge dots) for annotations with notes
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  applyAnnotations,
  removeAnnotationMarks,
  reanchorAnnotation,
} from '@/lib/annotation-engine';
import type { DocumentAnnotation } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface HighlightLayerProps {
  /** The container element that holds the rendered HTML. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** User annotations from Supabase. */
  annotations: DocumentAnnotation[];
  /** Called when annotations are found to be orphaned (text no longer matches). */
  onOrphaned?: (ids: string[]) => void;
  /** Called to update anchor after re-anchor. */
  onReanchor?: (id: string, updatedAnchor: DocumentAnnotation['anchor']) => void;
  /** Current content version — triggers re-apply when changed. */
  contentVersion: string;
  /** Whether HTML content has been rendered (controls when to apply). */
  isReady: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HighlightLayer({
  containerRef,
  annotations,
  onOrphaned,
  onReanchor,
  contentVersion,
  isReady,
}: HighlightLayerProps) {
  const prevVersionRef = useRef<string | null>(null);
  const applyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyLayer = useCallback(() => {
    const container = containerRef.current;
    if (!container || !isReady) return;

    // Skip if no annotations
    if (annotations.length === 0) {
      removeAnnotationMarks(container);
      return;
    }

    const { applied, orphaned } = applyAnnotations(container, annotations);

    // Report orphaned annotations
    if (orphaned.length > 0) {
      onOrphaned?.(orphaned);

      // Attempt re-anchor for each orphaned annotation
      for (const id of orphaned) {
        const ann = annotations.find((a) => a.id === id);
        if (!ann) continue;
        const result = reanchorAnnotation(container, ann, contentVersion);
        if (result.status === 'reanchored' && result.updatedAnchor) {
          onReanchor?.(id, result.updatedAnchor);
        }
      }
    }

    // Track content version
    prevVersionRef.current = contentVersion;

    void applied; // used for future analytics
  }, [annotations, containerRef, contentVersion, isReady, onOrphaned, onReanchor]);

  // Apply annotations whenever they change or content updates
  useEffect(() => {
    if (!isReady) return;

    // Debounce slightly to batch rapid changes
    if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);
    applyTimeoutRef.current = setTimeout(applyLayer, 50);

    return () => {
      if (applyTimeoutRef.current) clearTimeout(applyTimeoutRef.current);
    };
  }, [applyLayer, isReady, contentVersion, annotations]);

  // Cleanup marks on unmount
  useEffect(() => {
    const container = containerRef.current;
    return () => {
      if (container) removeAnnotationMarks(container);
    };
  }, [containerRef]);

  // This component renders nothing itself — it only mutates the container's DOM
  return null;
}
