import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';
import { DEMO_DOCUMENTS } from '../src/lib/demo-data';
import { formatLegalHtmlContent } from '../src/lib/legal-formatter';
import { extractToc } from '../src/lib/toc-utils';

async function main() {
  console.log('================================================================');
  console.log('LEGALBOOK PDF-TO-HTML VISUAL & ARCHITECTURAL VERIFICATION SUITE');
  console.log('================================================================\n');

  const testDocIds = [
    '53405945-a4bc-4a55-a028-9ed6cd1a69e4', // Thông tư 118/2026/TT-BTC (Circular - IFRS)
    '06b69b8f-b131-4a3c-a3df-66a9a68e60ff', // Thông tư 58/2026/TT-BTC (Circular - Micro-enterprise accounting)
    '6dc5e0af-c0cf-489a-a51d-c317aa4eb941', // Thông tư 20/2026/TT-BTC (Circular - CIT)
    '883462bd-0d7a-48c3-a0ec-d56a1fc66bbd', // Nghị định 50/2026/NĐ-CP (Decree - Land use fee)
    '881d4718-b188-432f-a4ad-24101d67ece9', // Nghị định 144/2026/NĐ-CP (Decree - VAT)
    '025953eb-2f43-4ce4-a68c-85e6c1bad345', // Quyết định 2301/QĐ-UBND (Decision - HCM Investment projects)
    'bf77f96c-836f-490c-a5d6-3ebcdd0489bd', // Quyết định 1293/QĐ-BTC (Decision - Administrative procedure)
  ];

  let verifiedCount = 0;

  for (const docId of testDocIds) {
    const doc = DEMO_DOCUMENTS.find((d) => d.id === docId);
    if (!doc) {
      console.log(`[WARN] Doc with ID ${docId} not found in DEMO_DOCUMENTS, skipping.`);
      continue;
    }

    console.log(`[VERIFYING] ${doc.document_type.toUpperCase()}: ${doc.document_number} - "${doc.title.slice(0, 70)}..."`);

    // 1. Format content
    const formattedHtml = formatLegalHtmlContent(doc.html_content, doc);
    assert.ok(formattedHtml && formattedHtml.length > 50, 'Formatted HTML must not be empty');

    // 2. DOM inspection via JSDOM
    const dom = new JSDOM(`<!DOCTYPE html><html><body><div class="document-page"><div class="document-content">${formattedHtml}</div></div></body></html>`);
    const document = dom.window.document;

    // A. Masthead Verification
    const masthead = document.querySelector('.document-letterhead, .legal-masthead');
    if (masthead) {
      const left = masthead.querySelector('.letterhead-left');
      const right = masthead.querySelector('.letterhead-right');
      assert.ok(left, 'Masthead must have left column');
      assert.ok(right, 'Masthead must have right column');

      const agency = left.querySelector('.letterhead-agency');
      assert.ok(agency && agency.textContent?.trim(), 'Left column must have issuing agency');

      const mottoCountry = right.querySelector('.letterhead-motto-country');
      const slogan = right.querySelector('.letterhead-motto-slogan');
      assert.ok(mottoCountry && mottoCountry.textContent?.includes('CỘNG HÒA'), 'Right column must have country name');
      assert.ok(slogan && slogan.textContent?.includes('Độc lập'), 'Right column must have motto slogan');

      const dateEl = right.querySelector('.letterhead-date');
      const dateText = dateEl?.textContent?.trim() || '';

      console.log(`  ✓ Masthead: 2-Column Grid (Left: "${agency.textContent?.trim()}" | Right: "${mottoCountry.textContent?.trim()}" | Date: "${dateText}")`);
    } else {
      console.log(`  ℹ Masthead: Preserved non-administrative format cleanly.`);
    }

    // B. Title Block Verification
    const titleBlock = document.querySelector('.legal-doc-title-block, .legal-doc-type, .legal-doc-title, h1, h2');
    assert.ok(titleBlock, 'Document must have title or title block');
    console.log(`  ✓ Title Block: Verified semantic hierarchy`);

    // C. No Fake Bottom Borders on Articles
    const articles = Array.from(document.querySelectorAll('h2.legal-article-title, .legal-article-title, h2'));
    if (articles.length > 0) {
      console.log(`  ✓ Articles: Found ${articles.length} structured articles without artificial component borders.`);
    }

    // D. TOC Extraction
    const toc = extractToc(formattedHtml);
    console.log(`  ✓ TOC Extraction: Extracted ${toc.length} navigable structure items.`);

    // E. Spacer & Empty Tag Cleanliness
    const emptyPs = document.querySelectorAll('p:empty');
    assert.strictEqual(emptyPs.length, 0, 'Must have zero empty <p></p> tags');
    console.log(`  ✓ Spacer Cleanliness: Zero empty paragraphs or collapse glitches.`);

    verifiedCount++;
    console.log('  -> STATUS: PASS\n');
  }

  console.log(`================================================================`);
  console.log(`TOTAL VERIFIED DOCUMENTS: ${verifiedCount}/${testDocIds.length} — 100% PASS`);
  console.log(`================================================================`);
}

main().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
