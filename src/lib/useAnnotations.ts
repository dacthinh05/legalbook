'use client';

/**
 * useAnnotations.ts
 * React hook for managing document annotations backed by Supabase.
 *
 * Responsibilities:
 * - Fetch annotations for a document (own + team/org) from Supabase
 * - Optimistic local state for fast UI feedback
 * - Add / update / delete (soft-delete) annotations
 * - Re-anchor orphaned annotations after content version changes
 * - Realtime subscription for collaborative note visibility (team/org)
 *
 * Security:
 * - RLS on DB enforces access. This hook never bypasses it.
 * - All user_id values come from the authenticated session, never from props.
 * - note_content is sanitized by annotation-engine before calling addAnnotation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DocumentAnnotation, AnnotationAnchor, AnnotationAnchorStatus, AnnotationColor } from '@/types';

// ─── DB row type (matches migration columns) ──────────────────────────────────

interface AnnotationRow {
  id: string;
  document_id: string;
  user_id: string;
  node_id: string | null;
  anchor_exact_text: string;
  anchor_prefix: string | null;
  anchor_suffix: string | null;
  anchor_start_offset: number | null;
  anchor_end_offset: number | null;
  anchor_content_version: string;
  anchor_content_hash: string | null;
  annotation_type: 'highlight' | 'note';
  color: AnnotationColor;
  note_content: string | null;
  visibility: 'private' | 'team' | 'organization';
  anchor_status: AnnotationAnchorStatus;
  created_at: string;
  updated_at: string;
}

// ─── Converters ───────────────────────────────────────────────────────────────

function rowToAnnotation(row: AnnotationRow): DocumentAnnotation {
  return {
    id: row.id,
    documentId: row.document_id,
    userId: row.user_id,
    nodeId: row.node_id ?? undefined,
    anchor: {
      exactText: row.anchor_exact_text,
      prefix: row.anchor_prefix ?? undefined,
      suffix: row.anchor_suffix ?? undefined,
      startOffset: row.anchor_start_offset ?? undefined,
      endOffset: row.anchor_end_offset ?? undefined,
      contentVersion: row.anchor_content_version,
      contentHash: row.anchor_content_hash ?? undefined,
    },
    type: row.annotation_type,
    color: row.color,
    noteContent: row.note_content ?? undefined,
    visibility: row.visibility,
    anchorStatus: row.anchor_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function anchorToRow(anchor: AnnotationAnchor) {
  return {
    anchor_exact_text: anchor.exactText,
    anchor_prefix: anchor.prefix ?? null,
    anchor_suffix: anchor.suffix ?? null,
    anchor_start_offset: anchor.startOffset ?? null,
    anchor_end_offset: anchor.endOffset ?? null,
    anchor_content_version: anchor.contentVersion,
    anchor_content_hash: anchor.contentHash ?? null,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAnnotationsOptions {
  documentId: string;
  /** Current content version (e.g. doc.updated_at or a hash). Used to detect content changes. */
  contentVersion: string;
}

export interface UseAnnotationsReturn {
  annotations: DocumentAnnotation[];
  isLoading: boolean;
  error: string | null;

  /** Add a new highlight or note annotation. Returns the created annotation or null on error. */
  addAnnotation: (
    draft: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<DocumentAnnotation | null>;

  /** Update note_content, color, or visibility of an owned annotation. */
  updateAnnotation: (
    id: string,
    patch: Partial<Pick<DocumentAnnotation, 'noteContent' | 'color' | 'visibility'>>
  ) => Promise<void>;

  /** Soft-delete: set anchor_status = 'deleted' (can be hard-deleted by user explicitly). */
  deleteAnnotation: (id: string) => Promise<void>;

  /** Mark orphaned annotations as re-anchored after content version change. */
  reanchorAnnotation: (
    id: string,
    updatedAnchor: AnnotationAnchor
  ) => Promise<void>;

  /** Re-fetch from server. */
  refresh: () => Promise<void>;
}

export function useAnnotations({
  documentId,
  contentVersion,
}: UseAnnotationsOptions): UseAnnotationsReturn {
  const supabase = createClient();
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentVersionRef = useRef(contentVersion);

  useEffect(() => {
    contentVersionRef.current = contentVersion;
  }, [contentVersion]);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchAnnotations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('document_annotations')
        .select('*')
        .eq('document_id', documentId)
        .neq('anchor_status', 'deleted')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setAnnotations((data as AnnotationRow[]).map(rowToAnnotation));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải ghi chú';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, supabase]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('document_annotations')
          .select('*')
          .eq('document_id', documentId)
          .neq('anchor_status', 'deleted')
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        if (active) {
          setAnnotations((data as AnnotationRow[]).map(rowToAnnotation));
        }
      } catch (err: unknown) {
        if (active) {
          const message = err instanceof Error ? err.message : 'Không thể tải ghi chú';
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => { active = false; };
  }, [documentId, supabase]);

  // ── Realtime subscription (team/org notes) ───────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`annotations:${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_annotations',
          filter: `document_id=eq.${documentId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAnn = rowToAnnotation(payload.new as AnnotationRow);
            setAnnotations((prev) =>
              prev.some((a) => a.id === newAnn.id) ? prev : [...prev, newAnn]
            );
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToAnnotation(payload.new as AnnotationRow);
            setAnnotations((prev) =>
              updated.anchorStatus === 'deleted'
                ? prev.filter((a) => a.id !== updated.id)
                : prev.map((a) => (a.id === updated.id ? updated : a))
            );
          } else if (payload.eventType === 'DELETE') {
            setAnnotations((prev) => prev.filter((a) => a.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, supabase]);

  // ── Add ─────────────────────────────────────────────────────────────────

  const addAnnotation = useCallback(
    async (
      draft: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<DocumentAnnotation | null> => {
      // Get authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Bạn cần đăng nhập để tạo ghi chú');
        return null;
      }

      const insertRow = {
        document_id: draft.documentId,
        user_id: user.id, // Always from session, never from prop
        node_id: draft.nodeId ?? null,
        ...anchorToRow(draft.anchor),
        annotation_type: draft.type,
        color: draft.color ?? 'yellow',
        note_content: draft.noteContent ?? null,
        visibility: draft.visibility,
        anchor_status: 'active',
      };

      // Optimistic insert
      const tempId = `optimistic-${Date.now()}`;
      const optimistic: DocumentAnnotation = {
        ...draft,
        id: tempId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        anchorStatus: 'active',
      };
      setAnnotations((prev) => [...prev, optimistic]);

      try {
        const { data, error: insertError } = await supabase
          .from('document_annotations')
          .insert(insertRow)
          .select()
          .single();

        if (insertError) throw insertError;

        const created = rowToAnnotation(data as AnnotationRow);
        // Replace optimistic entry
        setAnnotations((prev) =>
          prev.map((a) => (a.id === tempId ? created : a))
        );
        return created;
      } catch (err: unknown) {
        // Rollback optimistic
        setAnnotations((prev) => prev.filter((a) => a.id !== tempId));
        const message = err instanceof Error ? err.message : 'Không thể lưu ghi chú';
        setError(message);
        return null;
      }
    },
    [supabase]
  );

  // ── Update ───────────────────────────────────────────────────────────────

  const updateAnnotation = useCallback(
    async (
      id: string,
      patch: Partial<Pick<DocumentAnnotation, 'noteContent' | 'color' | 'visibility'>>
    ) => {
      // Optimistic update
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                noteContent: patch.noteContent ?? a.noteContent,
                color: patch.color ?? a.color,
                visibility: patch.visibility ?? a.visibility,
                updatedAt: new Date().toISOString(),
              }
            : a
        )
      );

      const dbPatch: Record<string, unknown> = {};
      if (patch.noteContent !== undefined) dbPatch.note_content = patch.noteContent;
      if (patch.color !== undefined) dbPatch.color = patch.color;
      if (patch.visibility !== undefined) dbPatch.visibility = patch.visibility;

      const { error: updateError } = await supabase
        .from('document_annotations')
        .update(dbPatch)
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
        // Re-fetch to restore correct state
        await fetchAnnotations();
      }
    },
    [supabase, fetchAnnotations]
  );

  // ── Delete (soft) ────────────────────────────────────────────────────────

  const deleteAnnotation = useCallback(
    async (id: string) => {
      // Optimistic remove
      setAnnotations((prev) => prev.filter((a) => a.id !== id));

      const { error: delError } = await supabase
        .from('document_annotations')
        .update({ anchor_status: 'deleted' })
        .eq('id', id);

      if (delError) {
        setError(delError.message);
        await fetchAnnotations();
      }
    },
    [supabase, fetchAnnotations]
  );

  // ── Re-anchor ────────────────────────────────────────────────────────────

  const reanchorAnnotation = useCallback(
    async (id: string, updatedAnchor: AnnotationAnchor) => {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, anchor: updatedAnchor, anchorStatus: 'reanchored' as AnnotationAnchorStatus }
            : a
        )
      );

      const { error: updateError } = await supabase
        .from('document_annotations')
        .update({
          ...anchorToRow(updatedAnchor),
          anchor_status: 'reanchored',
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message);
      }
    },
    [supabase]
  );

  return {
    annotations,
    isLoading,
    error,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    reanchorAnnotation,
    refresh: fetchAnnotations,
  };
}
