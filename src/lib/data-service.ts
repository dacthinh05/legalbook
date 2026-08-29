/**
 * LegalBook Unified Data Service Layer
 * 
 * Strict Legal Data Integrity Policy:
 * 1. In production: Live Supabase database connection is mandatory. If unconfigured or
 *    failing, the service strictly returns 'unavailable' to prevent presenting mock data.
 * 2. Embedded data is ONLY allowed in non-production (development/test) OR when an
 *    explicit NEXT_PUBLIC_DEMO_MODE='true' flag is set.
 */

import { createClient } from '@/lib/supabase/client';
import { 
  DEMO_CATEGORIES, 
  DEMO_DOCUMENTS, 
  buildCategoryTree, 
  getDocumentById as getEmbeddedDocumentById, 
  getDocumentRelations as getEmbeddedDocumentRelations,
  getDocumentsForCategoryTree as getEmbeddedDocsForCategory 
} from '@/lib/demo-data';
import { getCategoryDocumentType } from '@/lib/tree-utils';
import type { LegalDocument, Category, DocumentRelation, DocumentType, EffectiveStatusType } from '@/types';

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
  const isProd = process.env.NODE_ENV === 'production';
  const isDemoExplicit = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  return isProd && !isDemoExplicit;
}

/**
 * Determines whether embedded mock/demo repository is permitted.
 */
export function isEmbeddedDataPermitted(): boolean {
  return !isStrictProductionMode();
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

  // If in strict production mode and Supabase is unconfigured or failed, FAIL CLOSED
  if (isStrictProd) {
    return {
      data: { categories: [], tree: [] },
      source: 'unavailable',
      error: 'CSDL pháp luật chính thức chưa được cấu hình cho môi trường Production.',
    };
  }

  // Development or explicit demo mode
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
          } else if (data) {
            let docs = data as LegalDocument[];
            if (selectedCat && selectedCat.parent_id && targetType) {
              docs = docs.filter((d) => directDocIds.has(d.id) || d.document_type === targetType);
            }
            return {
              data: docs,
              source: 'supabase_live',
            };
          }
        } else {
          return {
            data: [],
            source: 'supabase_live',
          };
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
      } else if (data) {
        return {
          data: data as LegalDocument[],
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

  if (isStrictProd) {
    return {
      data: [],
      source: 'unavailable',
      error: 'CSDL văn bản pháp luật chính thức chưa được cấu hình hoặc không khả dụng.',
    };
  }

  const docs = categoryId
    ? (getEmbeddedDocsForCategory(categoryId) as unknown as LegalDocument[])
    : (DEMO_DOCUMENTS as unknown as LegalDocument[]);

  return {
    data: docs,
    source: 'embedded_repository',
  };
}

/**
 * Fetches a single document by ID.
 */
export async function getDocumentById(id: string): Promise<DataResult<LegalDocument | null>> {
  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();

  if (isConfigured) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('legal_documents')
        .select('*, files:document_files(*)')
        .eq('id', id)
        .single();

      if (error) {
        if (isStrictProd) {
          return {
            data: null,
            source: 'unavailable',
            error: `Không tìm thấy văn bản trong CSDL: ${error.message}`,
          };
        }
      } else if (data) {
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
          error: `Lỗi kết nối khi tải văn bản: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  if (isStrictProd) {
    return {
      data: null,
      source: 'unavailable',
      error: 'CSDL chính thức không khả dụng.',
    };
  }

  const doc = getEmbeddedDocumentById(id);
  return {
    data: (doc as LegalDocument) || null,
    source: 'embedded_repository',
  };
}

/**
 * Fetches bidirectional relationships for a document.
 */
export async function getDocumentRelations(docId: string): Promise<DataResult<{
  as_source: DocumentRelation[];
  as_target: DocumentRelation[];
}>> {
  const isConfigured = isSupabaseConfigured();
  const isStrictProd = isStrictProductionMode();

  if (isConfigured) {
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

      if (srcRes.error || tgtRes.error) {
        if (isStrictProd) {
          return {
            data: { as_source: [], as_target: [] },
            source: 'unavailable',
            error: `Lỗi quan hệ văn bản: ${srcRes.error?.message || tgtRes.error?.message}`,
          };
        }
      } else {
        return {
          data: {
            as_source: (srcRes.data || []) as DocumentRelation[],
            as_target: (tgtRes.data || []) as DocumentRelation[],
          },
          source: 'supabase_live',
        };
      }
    } catch (err: unknown) {
      if (isStrictProd) {
        return {
          data: { as_source: [], as_target: [] },
          source: 'unavailable',
          error: `Lỗi kết nối khi tải quan hệ: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  if (isStrictProd) {
    return {
      data: { as_source: [], as_target: [] },
      source: 'unavailable',
      error: 'CSDL chính thức không khả dụng.',
    };
  }

  const rels = getEmbeddedDocumentRelations(docId);
  return {
    data: {
      as_source: rels.as_source,
      as_target: rels.as_target,
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
  const { executeSearch } = await import('@/lib/search');
  const embeddedMatches = executeSearch(allEmbeddedDocs, params.query || '', {
    typeFilter: params.docType ? (params.docType as unknown as DocumentType) : 'all',
    statusFilter: 'all',
  });

  const docMap = new Map(allEmbeddedDocs.map((d) => [d.id, d]));
  const matchedDocs: LegalDocument[] = [];
  for (const m of embeddedMatches) {
    const found = docMap.get(m.id);
    if (found) matchedDocs.push(found);
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
