/**
 * LegalBook Unified Data Service Layer
 * 
 * Strict Legal Data Integrity Policy:
 * 1. In production: Live Supabase database connection is mandatory. If unconfigured or
 *    failing, the service strictly returns 'unavailable' to prevent presenting mock data.
 * 2. Embedded data is ONLY allowed in non-production (development/test) OR when an
 *    explicit NEXT_PUBLIC_DEMO_MODE='true' flag is set.
 */

import { createClient } from './supabase/client';
import { 
  DEMO_CATEGORIES, 
  DEMO_DOCUMENTS, 
  DEMO_RELATIONS,
  buildCategoryTree, 
  getDocumentById as getEmbeddedDocumentById, 
  getDocumentRelations as getEmbeddedDocumentRelations,
  getDocumentsForCategoryTree as getEmbeddedDocsForCategory 
} from './demo-data';
import { getCategoryDocumentType } from './tree-utils';
import { executeSearch } from './search';
import type { LegalDocument, Category, DocumentRelation, DocumentType, DocumentFile, FileType } from '@/types';
export type DataSourceType = 'supabase_live' | 'embedded_repository' | 'unavailable';

export interface DataResult<T> {
  data: T;
  source: DataSourceType;
  error?: string;
}

/**
 * Checks if Supabase credentials are configured and valid.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith('http') && !url.includes('placeholder'));
}

/**
 * Determines whether running in production mode without explicit demo allowance.
 */
export function isStrictProductionMode(): boolean {
  const isProd = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_STRICT_PROD === 'true';
  const isDemoExplicit = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  return isProd && !isDemoExplicit;
}

/**
 * Determines whether embedded mock/demo repository is permitted.
 */
export function isEmbeddedDataPermitted(): boolean {
  return !isStrictProductionMode();
}

interface CachedDocsResult {
  data: LegalDocument[];
  source: DataSourceType;
  timestamp: number;
}
const documentCache = new Map<string, CachedDocsResult>();
const CACHE_TTL_MS = 60000;

export function invalidateDocumentCache(): void {
  documentCache.clear();
}

const STORAGE_KEY_DELETED_DOCS = 'lb_deleted_document_ids';
const inMemoryDeletedIds = new Set<string>();

export function getDeletedDocumentIds(): Set<string> {
  const set = new Set<string>(inMemoryDeletedIds);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DELETED_DOCS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          arr.forEach((id) => set.add(id));
        }
      }
    } catch {}
  }
  return set;
}

export function markDocumentAsDeleted(id: string): void {
  invalidateDocumentCache();
  inMemoryDeletedIds.add(id);
  if (typeof window !== 'undefined') {
    try {
      const existing = getDeletedDocumentIds();
      existing.add(id);
      localStorage.setItem(STORAGE_KEY_DELETED_DOCS, JSON.stringify([...existing]));
    } catch {}
  }
}

export function markDocumentsAsDeleted(ids: string[]): void {
  invalidateDocumentCache();
  ids.forEach((id) => inMemoryDeletedIds.add(id));
  if (typeof window !== 'undefined') {
    try {
      const existing = getDeletedDocumentIds();
      ids.forEach((id) => existing.add(id));
      localStorage.setItem(STORAGE_KEY_DELETED_DOCS, JSON.stringify([...existing]));
    } catch {}
  }
}

/**
 * Restores all deleted documents (clear local deleted cache).
 */
export function restoreAllDeletedDocuments(): void {
  invalidateDocumentCache();
  inMemoryDeletedIds.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_DELETED_DOCS);
    } catch {}
  }
}

/**
 * Permanently deletes a document from Supabase and client persistence.
 */
export async function deleteDocument(id: string): Promise<{ success: boolean; error?: string }> {
  markDocumentAsDeleted(id);

  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/admin/documents?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (err: unknown) {
      console.warn('API remote delete sync warning:', err);
    }
  } else if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.from('legal_documents').delete().eq('id', id);
    } catch (err: unknown) {
      console.warn('Supabase remote delete sync warning:', err);
    }
  }

  return { success: true };
}

/**
 * Batch deletes multiple documents in a single operation.
 */
export async function batchDeleteDocuments(ids: string[]): Promise<{ success: boolean; count: number; error?: string }> {
  if (!ids || ids.length === 0) return { success: true, count: 0 };

  markDocumentsAsDeleted(ids);

  if (typeof window !== 'undefined') {
    try {
      await fetch(`/api/admin/documents?ids=${encodeURIComponent(ids.join(','))}`, {
        method: 'DELETE',
      });
    } catch (err: unknown) {
      console.warn('API remote batch delete sync warning:', err);
    }
  } else if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.from('legal_documents').delete().in('id', ids);
    } catch (err: unknown) {
      console.warn('Supabase remote batch delete sync warning:', err);
    }
  }

  return { success: true, count: ids.length };
}
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ensureValidUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function sanitizeStorageKey(filename: string): string {
  const str = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/_+/g, '_');
}

export interface FileAttachmentInput {
  id?: string;
  fileBuffer?: Uint8Array | ArrayBuffer | Blob;
  originalFileName: string;
  fileType: 'pdf' | 'docx' | 'doc' | 'html';
  fileSize?: number;
  isPrimary?: boolean;
}

/**
 * Checks if a document with the same document_number or title exists to prevent duplication.
 */
export async function checkDuplicateDocument(
  docNumber?: string | null,
  title?: string | null,
  excludeId?: string | null
): Promise<{ isDuplicate: boolean; matchedDoc?: Partial<LegalDocument>; matchType?: 'exact_number' | 'exact_title' | 'none' }> {
  const isConfigured = isSupabaseConfigured();
  const cleanNum = (docNumber || '').trim();
  const cleanTitle = (title || '').trim();

  if (!cleanNum && !cleanTitle) {
    return { isDuplicate: false, matchType: 'none' };
  }

  if (isConfigured) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('legal_documents')
        .select('id, document_number, title, document_type, status, issued_date')
        .eq('is_deleted', false);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      if (cleanNum) {
        const { data: numMatch } = await query.ilike('document_number', cleanNum).maybeSingle();
        if (numMatch) {
          return { isDuplicate: true, matchedDoc: numMatch, matchType: 'exact_number' };
        }
      }

      if (cleanTitle) {
        const { data: titleMatch } = await query.ilike('title', cleanTitle).maybeSingle();
        if (titleMatch) {
          return { isDuplicate: true, matchedDoc: titleMatch, matchType: 'exact_title' };
        }
      }
    } catch (err) {
      console.warn('Supabase checkDuplicateDocument warning:', err);
    }
  }

  // Fallback check against in-memory repository
  const normNewNum = (cleanNum || '').toUpperCase().replace(/[\/\-\.\s]/g, '');
  for (const d of DEMO_DOCUMENTS) {
    if (excludeId && d.id === excludeId) continue;
    const normExisting = (d.document_number || '').toUpperCase().replace(/[\/\-\.\s]/g, '');
    if (normNewNum && normExisting && normNewNum === normExisting) {
      return { isDuplicate: true, matchedDoc: d, matchType: 'exact_number' };
    }
    if (cleanTitle && d.title && cleanTitle.toLowerCase() === d.title.trim().toLowerCase()) {
      return { isDuplicate: true, matchedDoc: d, matchType: 'exact_title' };
    }
  }

  return { isDuplicate: false, matchType: 'none' };
}

/**
 * Saves or updates a legal document into Supabase (including Storage upload for attachments) and/or client persistence.
 * Automatically prevents duplicate records for identical document numbers.
 */
export async function saveDocument(
  doc: Partial<LegalDocument>,
  attachments?: FileAttachmentInput[]
): Promise<{ success: boolean; data?: LegalDocument; isUpdatedExisting?: boolean; error?: string }> {
  invalidateDocumentCache();

  // Client-side execution: Send request to secure server API to bypass RLS policies
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc, attachments }),
      });

      const result = await res.json();
      if (result.success && result.data) {
        const saved = result.data as LegalDocument;
        const idx = DEMO_DOCUMENTS.findIndex(
          (d) => d.id === saved.id || (saved.document_number && d.document_number === saved.document_number)
        );
        if (idx >= 0) {
          DEMO_DOCUMENTS[idx] = saved;
        } else {
          DEMO_DOCUMENTS.unshift(saved);
        }
        return { success: true, data: saved };
      }
      if (!result.success && result.error) {
        return { success: false, error: result.error };
      }
    } catch (apiErr) {
      console.warn('API /api/admin/documents network note:', apiErr);
    }
  }

  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();
  let isExplicitNewDoc = !doc.id;
  let docId = doc.id ? ensureValidUUID(doc.id) : '';
  let isUpdatedExisting = false;

  // Auto-deduplication: If doc.id is not provided, check if document_number already exists in database
  if (!docId && doc.document_number && isConfigured) {
    try {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('legal_documents')
        .select('id')
        .eq('is_deleted', false)
        .ilike('document_number', doc.document_number.trim())
        .maybeSingle();

      if (existing) {
        docId = existing.id;
        isExplicitNewDoc = false;
        isUpdatedExisting = true;
      }
    } catch {}
  }

  if (!docId) {
    docId = ensureValidUUID();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  const processedFiles: DocumentFile[] = [];
  const fileUploadTasks: Array<{ storageKey: string; buffer: Uint8Array | ArrayBuffer | Blob; contentType: string }> = [];

  // Build document files payload with namespaced unique storage keys
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const fileId = ensureValidUUID(att.id);
      const cleanName = sanitizeStorageKey(att.originalFileName || 'document.docx');
      const storageKey = `imports/${docId}/${fileId}_${cleanName}`;
      const publicUrl = isConfigured
        ? `${supabaseUrl}/storage/v1/object/public/documents/${storageKey}`
        : `/documents/${att.originalFileName}`;

      processedFiles.push({
        id: fileId,
        document_id: docId,
        file_type: (att.fileType === 'pdf' || att.fileType === 'html') ? att.fileType : 'docx',
        file_url: publicUrl,
        original_filename: att.originalFileName || 'document.docx',
        file_size: att.fileSize || 0,
        is_primary: att.isPrimary ?? true,
        version: 1,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      });

      if (att.fileBuffer) {
        const contentType =
          att.fileType === 'pdf'
            ? 'application/pdf'
            : att.fileType === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/octet-stream';
        fileUploadTasks.push({ storageKey, buffer: att.fileBuffer, contentType });
      }
    }
  } else if (doc.files && doc.files.length > 0) {
    for (const f of doc.files) {
      processedFiles.push({
        ...f,
        id: ensureValidUUID(f.id),
        document_id: docId,
      });
    }
  }

  const fullDoc: LegalDocument = {
    id: docId,
    title: doc.title || 'Văn bản chưa đặt tên',
    document_number: doc.document_number || '',
    document_type: doc.document_type || 'thong_tu',
    status: doc.status || 'hieu_luc',
    issuing_body: doc.issuing_body || '',
    signer: doc.signer || '',
    issued_date: doc.issued_date || new Date().toISOString().slice(0, 10),
    effective_date: doc.effective_date || new Date().toISOString().slice(0, 10),
    expiry_date: doc.expiry_date || null,
    html_content: doc.html_content || '',
    summary_main: doc.summary_main || '',
    summary_new_points: doc.summary_new_points || '',
    summary_affected_parties: doc.summary_affected_parties || null,
    summary_accounting_impact: doc.summary_accounting_impact || null,
    summary_audit_impact: doc.summary_audit_impact || null,
    summary_actions_needed: doc.summary_actions_needed || null,
    summary_is_ai_generated: doc.summary_is_ai_generated ?? false,
    official_source_url: doc.official_source_url || null,
    is_deleted: doc.is_deleted ?? false,
    is_published: doc.is_published ?? true,
    review_status: doc.review_status || 'published',
    view_count: doc.view_count || 0,
    created_by: doc.created_by || null,
    created_at: doc.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    content_status: doc.content_status || 'verified',
    source_type: doc.source_type || 'manual',
    files: processedFiles,
  };
  if (isConfigured) {
    const uploadedKeys: string[] = [];
    const supabase = createClient();

    try {
      // 1. Upload binary file buffers to Supabase Storage with unique keys
      for (const task of fileUploadTasks) {
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(task.storageKey, task.buffer, { contentType: task.contentType, upsert: true });

        if (uploadErr) {
          if (uploadedKeys.length > 0) {
            await supabase.storage.from('documents').remove(uploadedKeys);
          }
          return { success: false, error: `Lỗi upload tệp đính kèm lên Storage: ${uploadErr.message}` };
        }
        uploadedKeys.push(task.storageKey);
      }

      // 2. Upsert legal_documents record
      const dbPayload = {
        id: fullDoc.id,
        title: fullDoc.title,
        document_number: fullDoc.document_number,
        document_type: fullDoc.document_type,
        status: fullDoc.status,
        issuing_body: fullDoc.issuing_body,
        signer: fullDoc.signer,
        issued_date: fullDoc.issued_date,
        effective_date: fullDoc.effective_date,
        html_content: fullDoc.html_content,
        summary_main: fullDoc.summary_main,
        summary_new_points: fullDoc.summary_new_points,
        is_deleted: false,
        is_published: true,
        review_status: 'published',
        created_by: null,
        updated_at: fullDoc.updated_at,
      };

      const { error: docErr } = await supabase.from('legal_documents').upsert(dbPayload, { onConflict: 'id' });
      if (docErr) {
        if (uploadedKeys.length > 0) {
          await supabase.storage.from('documents').remove(uploadedKeys);
        }
        return { success: false, error: `Lỗi lưu văn bản vào CSDL: ${docErr.message}` };
      }

      // 3. Upsert document_files table records
      if (processedFiles.length > 0) {
        const filesPayload = processedFiles.map((f) => ({
          id: f.id,
          document_id: fullDoc.id,
          file_type: f.file_type || 'docx',
          file_url: f.file_url || '',
          file_size: f.file_size || 0,
          original_filename: f.original_filename || 'document.docx',
          is_primary: f.is_primary ?? true,
          version: f.version || 1,
          uploaded_by: null,
        }));

        const { error: fileErr } = await supabase.from('document_files').upsert(filesPayload, { onConflict: 'id' });
        if (fileErr) {
          if (uploadedKeys.length > 0) {
            await supabase.storage.from('documents').remove(uploadedKeys);
          }
          // Only rollback parent document if this was a brand-new insert to prevent deleting pre-existing docs on update
          if (isExplicitNewDoc) {
            await supabase.from('legal_documents').delete().eq('id', fullDoc.id);
          }
          return { success: false, error: `Lỗi lưu thông tin tệp đính kèm: ${fileErr.message}` };
        }
      }

      return { success: true, data: fullDoc };
    } catch (err: unknown) {
      if (uploadedKeys.length > 0) {
        await supabase.storage.from('documents').remove(uploadedKeys);
      }
      if (isExplicitNewDoc) {
        await supabase.from('legal_documents').delete().eq('id', fullDoc.id);
      }
      return { success: false, error: `Không thể kết nối CSDL: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // Fallback to in-memory collection ONLY in non-production environments when permitted
  if (!isConfigured && isEmbeddedDataPermitted()) {
    const idx = DEMO_DOCUMENTS.findIndex((d) => d.id === fullDoc.id);
    if (idx >= 0) {
      DEMO_DOCUMENTS[idx] = fullDoc;
    } else {
      DEMO_DOCUMENTS.unshift(fullDoc);
    }
    return { success: true, data: fullDoc };
  }

  return { success: false, error: 'CSDL Supabase chưa được cấu hình trên môi trường Production.' };
}

/**
 * Fetches all categories with hierarchical tree computation.
 */
export async function getCategories(): Promise<DataResult<{
  categories: Category[];
  tree: Category[];
}>> {
  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();

  if (isConfigured) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        if (isStrictProd) {
          return {
            data: { categories: [], tree: [] },
            source: 'unavailable',
            error: `Lỗi truy vấn CSDL danh mục: ${error.message}`,
          };
        }
      } else if (data && data.length > 0) {
        const categories = data as Category[];
        return {
          data: {
            categories,
            tree: buildCategoryTree(categories),
          },
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      if (isStrictProd) {
        return {
          data: { categories: [], tree: [] },
          source: 'unavailable',
          error: `Không thể kết nối CSDL danh mục: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  // Strict production: KHÔNG bao giờ rơi về dữ liệu mô phỏng
  if (isStrictProd) {
    return {
      data: { categories: [], tree: [] },
      source: 'unavailable',
      error: 'CSDL danh mục chính thức chưa được cấu hình.',
    };
  }

  // Return verified embedded category tree if live DB is unseeded
  return {
    data: {
      categories: DEMO_CATEGORIES,
      tree: buildCategoryTree(DEMO_CATEGORIES),
    },
    source: 'embedded_repository',
  };
}

/**
 * Fetches documents optionally filtered by category.
 */
export async function getDocuments(categoryId?: string | null): Promise<DataResult<LegalDocument[]>> {
  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();
  const cacheKey = categoryId || '__ALL__';
  const cached = documentCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    const deletedIds = isConfigured ? inMemoryDeletedIds : getDeletedDocumentIds();
    const filtered = cached.data.filter((d) => !deletedIds.has(d.id));
    return {
      data: filtered,
      source: cached.source,
    };
  }

  if (isConfigured) {
    try {
      const supabase = createClient();
      let query = supabase
        .from('legal_documents')
        .select('*, files:document_files(*)')
        .eq('is_deleted', false);

      if (categoryId) {
        // Compute all descendant category IDs so clicking a parent category shows all child documents
        const { data: allCats } = await supabase.from('categories').select('id, parent_id, slug, name');
        const targetIds = new Set<string>([categoryId]);
        if (allCats) {
          let added = true;
          while (added) {
            added = false;
            for (const c of allCats) {
              if (c.parent_id && targetIds.has(c.parent_id) && !targetIds.has(c.id)) {
                targetIds.add(c.id);
                added = true;
              }
            }
          }
        }

        const selectedCat = allCats?.find((c) => c.id === categoryId);
        const targetType = selectedCat ? getCategoryDocumentType(selectedCat as Category) : null;
        const searchCatIds = new Set<string>(targetIds);
        if (selectedCat && selectedCat.parent_id && targetType) {
          searchCatIds.add(selectedCat.parent_id);
        }

        const { data: links, error: linkErr } = await supabase
          .from('document_category_links')
          .select('document_id, category_id')
          .in('category_id', Array.from(searchCatIds));

        if (linkErr && isStrictProd) {
          return {
            data: [],
            source: 'unavailable',
            error: `Lỗi liên kết danh mục: ${linkErr.message}`,
          };
        }

        if (links && links.length > 0) {
          const directDocIds = new Set(
            links.filter((l) => targetIds.has(l.category_id)).map((l) => l.document_id)
          );
          const allLinkedDocIds = Array.from(new Set(links.map((l) => l.document_id)));
          query = query.in('id', allLinkedDocIds);
          
          const { data, error } = await query.order('effective_date', { ascending: false });
          if (error) {
            if (isStrictProd) {
              return {
                data: [],
                source: 'unavailable',
                error: `Lỗi truy vấn văn bản: ${error.message}`,
              };
            }
          } else if (data && data.length > 0) {
            let docs = data as LegalDocument[];
            if (selectedCat && selectedCat.parent_id && targetType) {
              docs = docs.filter((d) => directDocIds.has(d.id) || d.document_type === targetType);
            }
            return {
              data: docs,
              source: 'supabase_live',
            };
          }
        }
      }

      const { data, error } = await query.order('effective_date', { ascending: false });

      if (error) {
        if (isStrictProd) {
          return {
            data: [],
            source: 'unavailable',
            error: `Lỗi truy vấn văn bản: ${error.message}`,
          };
        }
      } else if (data && data.length > 0) {
        const rawList = data as LegalDocument[];
        documentCache.set(cacheKey, {
          data: rawList,
          source: 'supabase_live',
          timestamp: now,
        });
        const deletedIds = inMemoryDeletedIds;
        const filtered = deletedIds.size > 0 ? rawList.filter((d) => !deletedIds.has(d.id)) : rawList;
        return {
          data: filtered,
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      if (isStrictProd) {
        return {
          data: [],
          source: 'unavailable',
          error: `Không thể kết nối CSDL văn bản: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  // Strict production: KHÔNG bao giờ rơi về dữ liệu mô phỏng
  if (isStrictProd) {
    return {
      data: [],
      source: 'unavailable',
      error: 'CSDL văn bản pháp luật chính thức chưa được cấu hình.',
    };
  }

  // Return verified embedded documents if live DB is unseeded (filtered by deleted IDs)
  const rawDocs = categoryId
    ? (getEmbeddedDocsForCategory(categoryId) as unknown as LegalDocument[])
    : (DEMO_DOCUMENTS as unknown as LegalDocument[]);

  documentCache.set(cacheKey, {
    data: rawDocs,
    source: 'embedded_repository',
    timestamp: now,
  });

  const deletedIds = getDeletedDocumentIds();
  const docs = rawDocs.filter((d) => !deletedIds.has(d.id));

  return {
    data: docs,
    source: 'embedded_repository',
  };
}

/**
 * Fetches a single document by ID.
 */
export async function getDocumentById(id: string): Promise<DataResult<LegalDocument | null>> {
  if (!id) {
    return { data: null, source: 'unavailable', error: 'Thiếu ID văn bản' };
  }

  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();
  const isUUID = UUID_REGEX.test(id);

  if (isConfigured) {
    try {
      const supabase = createClient();
      let data = null;
      let error = null;

      if (isUUID) {
        const res = await supabase
          .from('legal_documents')
          .select('*, files:document_files(*)')
          .eq('id', id)
          .maybeSingle();
        data = res.data;
        error = res.error;
      } else {
        // Fallback: search by document_number or slug
        const res = await supabase
          .from('legal_documents')
          .select('*, files:document_files(*)')
          .or(`document_number.eq.${id},slug.eq.${id}`)
          .limit(1)
          .maybeSingle();
        data = res.data;
        error = res.error;
      }

      if (data) {
        return {
          data: data as LegalDocument,
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      if (isStrictProd) {
        return {
          data: null,
          source: 'unavailable',
          error: `Không thể tìm văn bản: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  if (isStrictProd) {
    return {
      data: null,
      source: 'unavailable',
      error: 'Văn bản không tồn tại trong CSDL chính thức.',
    };
  }

  const doc = getEmbeddedDocumentById(id) || DEMO_DOCUMENTS.find(
    (d) => d.id === id || d.document_number === id || (d.slug && d.slug === id)
  );
  return {
    data: doc ? (doc as unknown as LegalDocument) : null,
    source: 'embedded_repository',
  };
}
export interface StatutoryChainNode {
  document_id: string;
  document_number: string;
  title: string;
  document_type: string;
  effective_date: string | null;
  status: string;
  relation_type: string;
  direction: 'self' | 'upstream' | 'downstream';
  depth: number;
  path: string[];
}

export async function getStatutoryKnowledgeChain(
  docId: string,
  maxDepth: number = 4
): Promise<DataResult<StatutoryChainNode[]>> {
  const isConfigured = isSupabaseConfigured();

  if (isConfigured) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('get_document_statutory_chain', {
        p_document_id: docId,
        p_max_depth: maxDepth,
      });

      if (!error && data && data.length > 0) {
        return {
          data: data as StatutoryChainNode[],
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      console.warn('Supabase statutory chain query fallback triggered:', err);
    }
  }

  const allDocs = DEMO_DOCUMENTS as unknown as LegalDocument[];
  const allRels = DEMO_RELATIONS as unknown as DocumentRelation[];
  const rootDoc = allDocs.find((d) => d.id === docId);

  if (!rootDoc) {
    return { data: [], source: 'embedded_repository' };
  }

  const nodes: StatutoryChainNode[] = [
    {
      document_id: rootDoc.id,
      document_number: rootDoc.document_number || '',
      title: rootDoc.title,
      document_type: rootDoc.document_type,
      effective_date: rootDoc.effective_date,
      status: rootDoc.status,
      relation_type: 'root',
      direction: 'self',
      depth: 0,
      path: [rootDoc.id],
    },
  ];

  const visited = new Set<string>([rootDoc.id]);

  const downstreamRels = allRels.filter((r) => r.target_document_id === rootDoc.id);
  downstreamRels.forEach((r) => {
    const child = allDocs.find((d) => d.id === r.source_document_id);
    if (child && !visited.has(child.id)) {
      visited.add(child.id);
      nodes.push({
        document_id: child.id,
        document_number: child.document_number || '',
        title: child.title,
        document_type: child.document_type,
        effective_date: child.effective_date,
        status: child.status,
        relation_type: r.relation_type,
        direction: 'downstream',
        depth: 1,
        path: [rootDoc.id, child.id],
      });
    }
  });

  const upstreamRels = allRels.filter((r) => r.source_document_id === rootDoc.id);
  upstreamRels.forEach((r) => {
    const parent = allDocs.find((d) => d.id === r.target_document_id);
    if (parent && !visited.has(parent.id)) {
      visited.add(parent.id);
      nodes.push({
        document_id: parent.id,
        document_number: parent.document_number || '',
        title: parent.title,
        document_type: parent.document_type,
        effective_date: parent.effective_date,
        status: parent.status,
        relation_type: r.relation_type,
        direction: 'upstream',
        depth: 1,
        path: [rootDoc.id, parent.id],
      });
    }
  });

  return {
    data: nodes,
    source: 'embedded_repository',
  };
}

export async function getDocumentRelations(docId: string): Promise<DataResult<{
  as_source: DocumentRelation[];
  as_target: DocumentRelation[];
}>> {
  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();
  const isUUID = UUID_REGEX.test(docId);

  if (isConfigured && isUUID) {
    try {
      const supabase = createClient();
      const [srcRes, tgtRes] = await Promise.all([
        supabase
          .from('document_relations')
          .select('*, target_document:legal_documents!document_relations_target_document_id_fkey(*)')
          .eq('source_document_id', docId),
        supabase
          .from('document_relations')
          .select('*, source_document:legal_documents!document_relations_source_document_id_fkey(*)')
          .eq('target_document_id', docId),
      ]);

      if (!srcRes.error && !tgtRes.error && ((srcRes.data && srcRes.data.length > 0) || (tgtRes.data && tgtRes.data.length > 0))) {
        return {
          data: {
            as_source: (srcRes.data || []) as DocumentRelation[],
            as_target: (tgtRes.data || []) as DocumentRelation[],
          },
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      console.warn('Supabase relations fetch note:', err);
    }
  }

  const rels = getEmbeddedDocumentRelations(docId);
  return {
    data: {
      as_source: rels?.as_source || [],
      as_target: rels?.as_target || [],
    },
    source: 'embedded_repository',
  };
}


export interface HybridSearchParams {
  query: string;
  docType?: string | null;
  status?: string | null;
  categoryId?: string | null;
  limit?: number;
  offset?: number;
}

export interface HybridSearchResult {
  documents: LegalDocument[];
  totalCount: number;
}

/**
 * Hybrid Search function combining Supabase PostgreSQL tsvector + pg_trgm
 * with fallback to high-speed client/embedded search.
 */
export async function searchDocumentsHybrid(
  params: HybridSearchParams
): Promise<DataResult<HybridSearchResult>> {
  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();

  if (isConfigured) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc('search_legal_documents_hybrid', {
        query_text: params.query || '',
        filter_doc_type: params.docType || null,
        filter_status: params.status || null,
        filter_category_id: params.categoryId || null,
        limit_val: params.limit || 20,
        offset_val: params.offset || 0,
      });

      if (error) {
        if (isStrictProd) {
          return {
            data: { documents: [], totalCount: 0 },
            source: 'unavailable',
            error: `Lỗi tìm kiếm: ${error.message}`,
          };
        }
      } else if (data && Array.isArray(data)) {
        let total = data.length;
        if (data.length > 0 && data[0] && typeof data[0] === 'object' && 'total_count' in data[0]) {
          const rawTotal = (data[0] as Record<string, unknown>).total_count;
          if (typeof rawTotal === 'number' || typeof rawTotal === 'string') {
            total = Number(rawTotal);
          }
        }
        return {
          data: {
            documents: data as unknown as LegalDocument[],
            totalCount: total,
          },
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      if (isStrictProd) {
        return {
          data: { documents: [], totalCount: 0 },
          source: 'unavailable',
          error: `Không thể thực hiện tìm kiếm: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  if (isStrictProd) {
    return {
      data: { documents: [], totalCount: 0 },
      source: 'unavailable',
      error: 'CSDL tra cứu văn bản chính thức chưa được cấu hình.',
    };
  }

  // High-speed embedded fallback
  const allEmbeddedDocs = DEMO_DOCUMENTS as unknown as LegalDocument[];
  const embeddedMatches = executeSearch(allEmbeddedDocs, params.query || '', {
    typeFilter: params.docType ? (params.docType as unknown as DocumentType) : 'all',
    statusFilter: 'all',
  });

  const deletedIds = getDeletedDocumentIds();
  const docMap = new Map(allEmbeddedDocs.map((d) => [d.id, d]));
  const matchedDocs: LegalDocument[] = [];
  for (const m of embeddedMatches) {
    const found = docMap.get(m.id);
    if (found && !deletedIds.has(found.id)) matchedDocs.push(found);
  }

  const offset = params.offset || 0;
  const limit = params.limit || 20;
  const paged = matchedDocs.slice(offset, offset + limit);

  return {
    data: {
      documents: paged,
      totalCount: matchedDocs.length,
    },
    source: 'embedded_repository',
  };
}

/**
 * Headless On-Demand Document Resolver:
 * Resolves legal document metadata & citations dynamically from knowledge network.
 */
export async function fetchDocumentOnDemand(lookupKey: string): Promise<LegalDocument | null> {
  try {
    const res = await fetch(`/api/documents/on-demand?q=${encodeURIComponent(lookupKey)}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.documents?.[0] || null;
  } catch {
    return null;
  }
}
