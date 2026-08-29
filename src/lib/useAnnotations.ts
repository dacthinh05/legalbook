'use client';

/**
 * useAnnotations.ts
 * React hook for managing document annotations backed by Supabase with local-storage fallback.
 *
 * Responsibilities:
 * - Fetch annotations for a document (own + team/org) from Supabase
 * - Seamless local storage fallback for guest/offline readers
 * - Optimistic local state for fast UI feedback
 * - Add / update / delete (soft-delete) annotations
 * - Re-anchor orphaned annotations after content version changes
 * - Realtime subscription for collaborative note visibility (team/org)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DocumentAnnotation, AnnotationAnchor, AnnotationAnchorStatus, AnnotationColor } from '@/types';

// ─── DB row type ──────────────────────────────────────────────────────────────

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

// ─── LocalStorage Helpers ─────────────────────────────────────────────────────

function getStorageKey(docId: string) {
  return `lb_annotations_${docId}`;
}

function loadLocalAnnotations(docId: string): DocumentAnnotation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(docId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((a: DocumentAnnotation) => a.anchorStatus !== 'deleted');
      }
    }
  } catch {}
  return [];
}

function saveLocalAnnotations(docId: string, list: DocumentAnnotation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(docId), JSON.stringify(list));
  } catch {}
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAnnotationsOptions {
  documentId: string;
  contentVersion: string;
}

export interface UseAnnotationsReturn {
  annotations: DocumentAnnotation[];
  isLoading: boolean;
  error: string | null;

  addAnnotation: (
    draft: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<DocumentAnnotation | null>;

  updateAnnotation: (
    id: string,
    patch: Partial<Pick<DocumentAnnotation, 'noteContent' | 'color' | 'visibility'>>
  ) => Promise<void>;

  deleteAnnotation: (id: string) => Promise<void>;

  reanchorAnnotation: (
    id: string,
    updatedAnchor: AnnotationAnchor
  ) => Promise<void>;

  refresh: () => Promise<void>;
}

export function useAnnotations({
  documentId,
  contentVersion,
}: UseAnnotationsOptions): UseAnnotationsReturn {
  const supabase = createClient();
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>(() => {
    return loadLocalAnnotations(documentId);
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentVersionRef = useRef(contentVersion);

  useEffect(() => {
    contentVersionRef.current = contentVersion;
  }, [contentVersion]);

  // Sync to local storage whenever annotations change
  const persistLocally = useCallback(
    (nextList: DocumentAnnotation[]) => {
      setAnnotations(nextList);
      saveLocalAnnotations(documentId, nextList);
    },
    [documentId]
  );

  // ── Fetch from Supabase with Local Merge ───────────────────────────────────

  const fetchAnnotations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const localList = loadLocalAnnotations(documentId);

    try {
      const { data, error: fetchError } = await supabase
        .from('document_annotations')
        .select('*')
        .eq('document_id', documentId)
        .neq('anchor_status', 'deleted')
        .order('created_at', { ascending: true });

      if (fetchError) {
        // Fallback to local
        setAnnotations(localList);
      } else if (data && Array.isArray(data)) {
        const remoteList = (data as AnnotationRow[]).map(rowToAnnotation);
        // Merge remote + local (avoid duplicate IDs)
        const remoteIds = new Set(remoteList.map((r) => r.id));
        const nonDuplicateLocals = localList.filter((l) => !remoteIds.has(l.id));
        const combined = [...remoteList, ...nonDuplicateLocals];
        persistLocally(combined);
      }
    } catch {
      setAnnotations(localList);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, supabase, persistLocally]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchAnnotations();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchAnnotations]);
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
            setAnnotations((prev) => {
              const next = prev.some((a) => a.id === newAnn.id) ? prev : [...prev, newAnn];
              saveLocalAnnotations(documentId, next);
              return next;
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = rowToAnnotation(payload.new as AnnotationRow);
            setAnnotations((prev) => {
              const next =
                updated.anchorStatus === 'deleted'
                  ? prev.filter((a) => a.id !== updated.id)
                  : prev.map((a) => (a.id === updated.id ? updated : a));
              saveLocalAnnotations(documentId, next);
              return next;
            });
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old;
            const deletedId = oldRecord && typeof oldRecord === 'object' && 'id' in oldRecord ? String(oldRecord.id) : null;
            if (deletedId) {
              setAnnotations((prev) => {
                const next = prev.filter((a) => a.id !== deletedId);
                saveLocalAnnotations(documentId, next);
                return next;
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId, supabase]);

  // ── Add Annotation (Works seamlessly for Auth & Guest) ───────────────────

  const addAnnotation = useCallback(
    async (
      draft: Omit<DocumentAnnotation, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<DocumentAnnotation | null> => {
      const tempId = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const nowStr = new Date().toISOString();

      let effectiveUserId = draft.userId;
      if (!effectiveUserId || effectiveUserId === 'guest_user') {
        effectiveUserId = `guest_${documentId.slice(0, 8)}`;
      }

      const newAnnotation: DocumentAnnotation = {
        ...draft,
        id: tempId,
        userId: effectiveUserId,
        createdAt: nowStr,
        updatedAt: nowStr,
        anchorStatus: 'active',
      };

      // Optimistic & local save immediately
      setAnnotations((prev) => {
        const next = [...prev, newAnnotation];
        saveLocalAnnotations(documentId, next);
        return next;
      });

      // Attempt Supabase sync if user is logged in
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const insertRow = {
            document_id: draft.documentId,
            user_id: user.id,
            node_id: draft.nodeId ?? null,
            ...anchorToRow(draft.anchor),
            annotation_type: draft.type,
            color: draft.color ?? 'yellow',
            note_content: draft.noteContent ?? null,
            visibility: draft.visibility,
            anchor_status: 'active',
          };

          const { data, error: insertError } = await supabase
            .from('document_annotations')
            .insert(insertRow)
            .select()
            .single();

          if (!insertError && data) {
            const remoteCreated = rowToAnnotation(data as AnnotationRow);
            setAnnotations((prev) => {
              const next = prev.map((a) => (a.id === tempId ? remoteCreated : a));
              saveLocalAnnotations(documentId, next);
              return next;
            });
            return remoteCreated;
          }
        }
      } catch {
        // Safe fallback: local annotation persists
      }

      return newAnnotation;
    },
    [documentId, supabase]
  );

  // ── Update Annotation ─────────────────────────────────────────────────────

  const updateAnnotation = useCallback(
    async (
      id: string,
      patch: Partial<Pick<DocumentAnnotation, 'noteContent' | 'color' | 'visibility'>>
    ) => {
      const nowStr = new Date().toISOString();

      setAnnotations((prev) => {
        const next = prev.map((a) =>
          a.id === id
            ? {
                ...a,
                noteContent: patch.noteContent !== undefined ? patch.noteContent : a.noteContent,
                color: patch.color !== undefined ? patch.color : a.color,
                visibility: patch.visibility !== undefined ? patch.visibility : a.visibility,
                updatedAt: nowStr,
              }
            : a
        );
        saveLocalAnnotations(documentId, next);
        return next;
      });

      try {
        const dbPatch: Record<string, unknown> = {};
        if (patch.noteContent !== undefined) dbPatch.note_content = patch.noteContent;
        if (patch.color !== undefined) dbPatch.color = patch.color;
        if (patch.visibility !== undefined) dbPatch.visibility = patch.visibility;

        await supabase.from('document_annotations').update(dbPatch).eq('id', id);
      } catch {}
    },
    [documentId, supabase]
  );

  // ── Delete Annotation ─────────────────────────────────────────────────────

  const deleteAnnotation = useCallback(
    async (id: string) => {
      setAnnotations((prev) => {
        const next = prev.filter((a) => a.id !== id);
        saveLocalAnnotations(documentId, next);
        return next;
      });

      try {
        await supabase
          .from('document_annotations')
          .update({ anchor_status: 'deleted' })
          .eq('id', id);
      } catch {}
    },
    [documentId, supabase]
  );

  // ── Re-anchor Annotation ──────────────────────────────────────────────────

  const reanchorAnnotation = useCallback(
    async (id: string, updatedAnchor: AnnotationAnchor) => {
      setAnnotations((prev) => {
        const next = prev.map((a) =>
          a.id === id
            ? {
                ...a,
                anchor: updatedAnchor,
                anchorStatus: 'reanchored' as AnnotationAnchorStatus,
                updatedAt: new Date().toISOString(),
              }
            : a
        );
        saveLocalAnnotations(documentId, next);
        return next;
      });

      try {
        await supabase
          .from('document_annotations')
          .update({
            ...anchorToRow(updatedAnchor),
            anchor_status: 'reanchored',
          })
          .eq('id', id);
      } catch {}
    },
    [documentId, supabase]
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
