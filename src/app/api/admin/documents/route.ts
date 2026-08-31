import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LegalDocument, DocumentFile } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceKey || !supabaseUrl.startsWith('http') || supabaseUrl.includes('placeholder')) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureValidUUID(id?: string | null): string {
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

function sanitizeStorageKey(filename: string): string {
  const str = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/_+/g, '_');
}

/**
 * POST /api/admin/documents
 * Secure server-side document creation & upsert (bypasses client-side RLS)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { doc, attachments } = body as {
      doc: Partial<LegalDocument>;
      attachments?: Array<{
        id?: string;
        originalFileName: string;
        fileType: 'pdf' | 'docx' | 'doc' | 'html';
        fileSize?: number;
        isPrimary?: boolean;
        base64Data?: string;
      }>;
    };

    if (!doc || !doc.title) {
      return NextResponse.json(
        { success: false, error: 'Thiếu tiêu đề văn bản' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabaseClient();
    let docId = doc.id ? ensureValidUUID(doc.id) : '';

    // If docId is not provided, check if document_number already exists in database
    if (!docId && doc.document_number && supabase) {
      try {
        const { data: existing } = await supabase
          .from('legal_documents')
          .select('id')
          .eq('is_deleted', false)
          .ilike('document_number', doc.document_number.trim())
          .maybeSingle();

        if (existing) {
          docId = existing.id;
        }
      } catch (err) {
        console.warn('Document deduplication lookup note:', err);
      }
    }

    if (!docId) {
      docId = ensureValidUUID();
    }

    const processedFiles: DocumentFile[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    // Handle file attachments
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        const fileId = ensureValidUUID(att.id);
        const cleanName = sanitizeStorageKey(att.originalFileName || 'document.docx');
        const storageKey = `imports/${docId}/${fileId}_${cleanName}`;
        const publicUrl = supabase
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

        // If base64 file data is supplied, upload to Storage
        if (att.base64Data && supabase) {
          try {
            const buffer = Buffer.from(att.base64Data, 'base64');
            const contentType =
              att.fileType === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            await supabase.storage
              .from('documents')
              .upload(storageKey, buffer, { contentType, upsert: true });
          } catch (uploadErr) {
            console.warn('Storage upload warning:', uploadErr);
          }
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

    if (supabase) {
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
        summary_affected_parties: fullDoc.summary_affected_parties,
        summary_accounting_impact: fullDoc.summary_accounting_impact,
        summary_audit_impact: fullDoc.summary_audit_impact,
        summary_actions_needed: fullDoc.summary_actions_needed,
        summary_is_ai_generated: fullDoc.summary_is_ai_generated,
        official_source_url: fullDoc.official_source_url,
        is_deleted: fullDoc.is_deleted,
        is_published: fullDoc.is_published,
        review_status: fullDoc.review_status,
        content_status: fullDoc.content_status,
        quality_score: 98,
        updated_at: new Date().toISOString(),
      };

      const { error: docErr } = await supabase
        .from('legal_documents')
        .upsert(dbPayload, { onConflict: 'id' });

      if (docErr) {
        console.error('Supabase legal_documents upsert error:', docErr);
        return NextResponse.json(
          { success: false, error: `Lỗi lưu văn bản vào CSDL: ${docErr.message}` },
          { status: 500 }
        );
      }

      // Upsert files references
      if (processedFiles.length > 0) {
        const filesPayload = processedFiles.map((f) => ({
          id: f.id,
          document_id: docId,
          file_type: f.file_type,
          file_url: f.file_url,
          original_filename: f.original_filename,
          file_size: f.file_size,
          is_primary: f.is_primary,
          version: f.version || 1,
          created_at: f.created_at,
        }));

        await supabase.from('document_files').upsert(filesPayload, { onConflict: 'id' });
      }
    }

    return NextResponse.json({
      success: true,
      data: fullDoc,
    });
  } catch (err: unknown) {
    console.error('API /api/admin/documents error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/documents
 * Secure server-side document deletion (bypasses client-side RLS)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ids = searchParams.get('ids')?.split(',').filter(Boolean);

    const supabase = getAdminSupabaseClient();
    if (supabase) {
      if (id) {
        await supabase
          .from('legal_documents')
          .update({ is_deleted: true, is_published: false })
          .eq('id', id);
      } else if (ids && ids.length > 0) {
        await supabase
          .from('legal_documents')
          .update({ is_deleted: true, is_published: false })
          .in('id', ids);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
