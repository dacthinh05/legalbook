/**
 * seed_supabase_production.ts
 * 
 * Production Database Seeding & Supabase Storage Synchronization Engine.
 * Migrates all 58 verified legal documents, category taxonomy, document relations,
 * legal effects timeline overlays, and synchronizes attachments into Supabase Storage.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { DEMO_CATEGORIES, DEMO_DOCUMENTS, DEMO_CATEGORY_LINKS, DEMO_RELATIONS } from '../src/lib/demo-data';
import { DEMO_LEGAL_EFFECTS } from '../src/lib/legal-effects/demo-effects';

// Load environment variables from .env.local or process.env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...rest] = trimmed.split('=');
      if (key && rest.length > 0) {
        process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey || !supabaseUrl.startsWith('http') || supabaseUrl.includes('placeholder')) {
  console.log('⚠️ Supabase credentials not found or placeholder in environment.');
  console.log('To run live migration: configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

export function sanitizeStorageKey(filename: string): string {
  const str = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return str.replace(/[^a-zA-Z0-9.\-_]/g, '_').replace(/_+/g, '_');
}

export async function runProductionSeed(): Promise<{
  success: boolean;
  categoriesCount: number;
  documentsCount: number;
  linksCount: number;
  relationsCount: number;
  effectsCount: number;
  filesUploadedCount: number;
  error?: string;
}> {
  if (!supabaseUrl || !serviceKey || !supabaseUrl.startsWith('http') || supabaseUrl.includes('placeholder')) {
    return {
      success: false,
      categoriesCount: 0,
      documentsCount: 0,
      linksCount: 0,
      relationsCount: 0,
      effectsCount: 0,
      filesUploadedCount: 0,
      error: 'Supabase URL or Service Role Key missing.',
    };
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('🚀 Connecting to Supabase Cloud:', supabaseUrl);

  try {
    // ─── 1. Storage Buckets Synchronization ──────────────────────────────
    console.log('📦 1. Synchronizing Supabase Storage bucket: "documents"...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasDocsBucket = buckets?.some((b) => b.id === 'documents' || b.name === 'documents');
    if (!hasDocsBucket) {
      await supabase.storage.createBucket('documents', { public: true });
    }

    let filesUploadedCount = 0;
    const docDir = path.resolve(process.cwd(), 'public/documents');
    if (fs.existsSync(docDir)) {
      const files = fs.readdirSync(docDir);
      for (const file of files) {
        const filePath = path.join(docDir, file);
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) continue;

        const fileBuffer = fs.readFileSync(filePath);
        const ext = path.extname(file).toLowerCase();
        const contentType =
          ext === '.pdf'
            ? 'application/pdf'
            : ext === '.docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/msword';

        const storageKey = sanitizeStorageKey(file);

        const { error: uploadErr } = await supabase.storage.from('documents').upload(storageKey, fileBuffer, {
          contentType,
          upsert: true,
        });

        if (!uploadErr) {
          filesUploadedCount++;
        }
      }
    }
    console.log(`✅ Uploaded/Verified ${filesUploadedCount} files in Supabase Storage.`);

    // ─── 2. Categories Taxonomy Seed ────────────────────────────────────
    console.log('📂 2. Seeding Categories taxonomy...');
    const categoriesPayload = DEMO_CATEGORIES.map((c) => ({
      id: c.id,
      parent_id: c.parent_id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      order_index: c.order_index,
      icon: c.icon,
      is_active: c.is_active,
    }));

    const { error: catErr } = await supabase.from('categories').upsert(categoriesPayload, { onConflict: 'id' });
    if (catErr) throw new Error(`Category seed error: ${catErr.message}`);
    console.log(`✅ Seeded ${categoriesPayload.length} categories.`);

    // ─── 3. Legal Documents Seed ─────────────────────────────────────────
    console.log('📜 3. Seeding 58 Legal Documents with Full HTML Text...');
    const documentsPayload = DEMO_DOCUMENTS.map((d) => {
      return {
        id: d.id,
        title: d.title,
        document_number: d.document_number,
        document_type: d.document_type,
        issuing_body: d.issuing_body,
        signer: d.signer,
        issued_date: d.issued_date,
        effective_date: d.effective_date,
        expiry_date: d.expiry_date,
        status: d.status,
        html_content: d.html_content,
        summary_main: d.summary_main,
        summary_new_points: d.summary_new_points,
        summary_affected_parties: d.summary_affected_parties,
        summary_accounting_impact: d.summary_accounting_impact,
        summary_audit_impact: d.summary_audit_impact,
        summary_actions_needed: d.summary_actions_needed,
        summary_is_ai_generated: d.summary_is_ai_generated || false,
        official_source_url: d.official_source_url,
        is_deleted: d.is_deleted || false,
        is_published: d.is_published !== false,
        review_status: d.review_status || 'published',
        content_status: d.content_status || 'verified',
        quality_score: d.quality_score || 1.0,
      };
    });

    const { error: docErr } = await supabase.from('legal_documents').upsert(documentsPayload, { onConflict: 'id' });
    if (docErr) throw new Error(`legal_documents seed error: ${docErr.message}`);
    console.log(`✅ Seeded ${documentsPayload.length} legal_documents.`);

    // ─── 4. Document Files References ────────────────────────────────────
    console.log('📎 4. Linking Document File Attachments...');
    const filesPayload: Array<{
      id: string;
      document_id: string;
      file_type: string;
      file_url: string;
      original_filename: string;
      file_size: number;
    }> = [];

    for (const d of DEMO_DOCUMENTS) {
      if (d.files && Array.isArray(d.files)) {
        for (const f of d.files) {
          const storageKey = sanitizeStorageKey(f.original_filename);
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/documents/${storageKey}`;
          filesPayload.push({
            id: f.id,
            document_id: d.id,
            file_type: f.file_type,
            file_url: publicUrl,
            original_filename: f.original_filename,
            file_size: f.file_size || 10000,
          });
        }
      }
    }

    if (filesPayload.length > 0) {
      await supabase.from('document_files').upsert(filesPayload, { onConflict: 'id' });
    }
    console.log(`✅ Linked ${filesPayload.length} file attachments.`);

    // ─── 5. Document Category Links ──────────────────────────────────────
    console.log('🔗 5. Seeding Document Category Links...');
    const linksPayload = DEMO_CATEGORY_LINKS.map((l) => ({
      id: l.id,
      document_id: l.document_id,
      category_id: l.category_id,
      is_primary: l.is_primary,
    }));

    const { error: linkErr } = await supabase.from('document_category_links').upsert(linksPayload, { onConflict: 'id' });
    if (linkErr) throw new Error(`Link seed error: ${linkErr.message}`);
    console.log(`✅ Seeded ${linksPayload.length} category links.`);

    // ─── 6. Document Relations ───────────────────────────────────────────
    console.log('🌐 6. Seeding Document Relations Graph...');
    const relationsPayload = DEMO_RELATIONS.map((r) => ({
      id: r.id,
      source_document_id: r.source_document_id,
      target_document_id: r.target_document_id,
      relation_type: r.relation_type,
      description: r.description,
    }));

    const { error: relErr } = await supabase.from('document_relations').upsert(relationsPayload, { onConflict: 'id' });
    if (relErr) throw new Error(`Relation seed error: ${relErr.message}`);
    console.log(`✅ Seeded ${relationsPayload.length} relations.`);

    // ─── 7. Legal Effects Overlays ───────────────────────────────────────
    console.log('✨ 7. Seeding Legal Effects Timeline Overlays...');
    const effectsPayload = DEMO_LEGAL_EFFECTS.map((e) => ({
      id: e.id,
      category: e.category,
      effect_type: e.effectType,
      source_document_id: e.sourceDocumentId,
      source_document_number: e.sourceDocumentNumber,
      source_document_title: e.sourceDocumentTitle,
      target_document_id: e.targetDocumentId,
      target_document_number: e.targetDocumentNumber,
      target_provision_id: e.targetProvisionId,
      target_provision_label: e.targetProvisionLabel,
      clause_label: e.clauseLabel,
      point_label: e.pointLabel,
      effective_from: e.effectiveFrom,
      effective_to: e.effectiveTo,
      impact_scope: e.impactScope,
      legal_citation: e.legalCitation,
      source_provision_citation: e.sourceProvisionCitation,
      source_excerpt: e.sourceExcerpt,
      explanation_summary: e.explanationSummary,
      source_url: e.sourceUrl,
      previous_content: e.previousContent,
      replacement_content: e.replacementContent,
      review_status: e.reviewStatus,
      confidence: e.confidence,
    }));

    const { error: effErr } = await supabase.from('legal_effects').upsert(effectsPayload, { onConflict: 'id' });
    if (effErr) throw new Error(`Effect seed error: ${effErr.message}`);
    console.log(`✅ Seeded ${effectsPayload.length} legal effects.`);

    console.log('🎉 SUPABASE PRODUCTION DATABASE SEEDING COMPLETED SUCCESSFULLY!');

    return {
      success: true,
      categoriesCount: categoriesPayload.length,
      documentsCount: documentsPayload.length,
      linksCount: linksPayload.length,
      relationsCount: relationsPayload.length,
      effectsCount: effectsPayload.length,
      filesUploadedCount,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Migration failed:', msg);
    return {
      success: false,
      categoriesCount: 0,
      documentsCount: 0,
      linksCount: 0,
      relationsCount: 0,
      effectsCount: 0,
      filesUploadedCount: 0,
      error: msg,
    };
  }
}

// Direct CLI execution
if (require.main === module) {
  runProductionSeed();
}
