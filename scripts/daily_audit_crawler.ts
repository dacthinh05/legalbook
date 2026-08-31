/**
 * daily_audit_crawler.ts
 * 
 * Automated Daily Legal Crawler & Classifier for Audit & Accounting.
 * 
 * Features:
 * 1. Scrapes latest official legal notices & dispatches from Government Portal,
 *    General Department of Taxation (gdt.gov.vn), and Ministry of Finance (mof.gov.vn).
 * 2. Filters strictly for Auditing (VSA), Accounting (VAS/IFRS), Corporate Tax (CIT/VAT/PIT),
 *    Transfer Pricing, and Invoices. Discards all non-relevant legislation.
 * 3. On-Demand / Automated synchronization into LegalBook repository.
 */

import * as fs from 'fs';
import * as path from 'path';
import { scanGovernmentLegalPortals } from '../src/lib/crawler/portal-crawler';
import { getSafeSourceUrl } from '../src/lib/utils';
import { DEMO_DOCUMENTS } from '../src/lib/demo-data';

const AUDIT_TAX_KEYWORDS = [
  'thuế',
  'tndn',
  'gtgt',
  'tncn',
  'hóa đơn',
  'kế toán',
  'kiểm toán',
  'báo cáo tài chính',
  'khấu trừ',
  'chi phí được trừ',
  'giao dịch liên kết',
  'chuyển giá',
  'lãi vay',
  'ifrs',
  'vfrs',
  'vsa',
  'chứng từ',
  'tiền lương',
  'bảo hiểm xã hội',
  'khấu hao',
  'dự phòng',
  'hoàn thuế'
];

export async function runDailyAuditCrawler() {
  console.log('🚀 Starting Daily Legal Crawler for Auditing & Accounting...');
  const startTime = Date.now();

  try {
    const scanResult = await scanGovernmentLegalPortals();
    console.log(`📡 Scanned ${scanResult.portals.length} official government & ministry portals:`);
    scanResult.portals.forEach((p) => {
      console.log(`  - [${p.status === 'scanned_ok' ? 'OK' : 'FALLBACK'}] ${p.portalName} (${p.discoveredCount} items, ${p.responseTimeMs}ms)`);
    });

    const existingNumbers = new Set(DEMO_DOCUMENTS.map((d) => d.document_number));
    const allDiscovered = scanResult.portals.flatMap((p) => p.items);

    // Apply strict Audit & Tax Filter Gate
    const auditRelevant = allDiscovered.filter((item) => {
      const text = `${item.title} ${item.summary_main} ${item.document_number}`.toLowerCase();
      const isRelevant = AUDIT_TAX_KEYWORDS.some((kw) => text.includes(kw));
      const isNew = !existingNumbers.has(item.document_number);
      return isRelevant && isNew;
    });

    console.log(`\n🔍 Found ${allDiscovered.length} total legal notices.`);
    console.log(`✅ Filtered ${auditRelevant.length} new documents relevant to Auditing, Accounting & Tax:`);

    auditRelevant.forEach((item, idx) => {
      console.log(`\n  ${idx + 1}. [${item.document_number}] ${item.title}`);
      console.log(`     - Lĩnh vực: ${item.domain.toUpperCase()}`);
      console.log(`     - Cơ quan: ${item.issuing_body} | Ngày ban hành: ${item.issued_date}`);
      console.log(`     - Nguồn: ${item.sourceUrl}`);
    });

    const reportPath = path.resolve(process.cwd(), 'scripts/latest_crawled_audit_feed.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      crawled_at: new Date().toISOString(),
      execution_time_ms: Date.now() - startTime,
      total_scanned: allDiscovered.length,
      audit_relevant_count: auditRelevant.length,
      items: auditRelevant
    }, null, 2), 'utf8');

    console.log(`\n📄 Staging report saved to: ${reportPath}`);
    return { success: true, count: auditRelevant.length, items: auditRelevant };
  } catch (err: unknown) {
    console.error('❌ Daily crawler error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Run CLI directly if executed
if (process.argv[1]?.endsWith('daily_audit_crawler.ts') || process.argv[1]?.endsWith('daily_audit_crawler.js')) {
  runDailyAuditCrawler();
}
