# Deployment Record - LegalBook

## Platform
- **Provider**: Vercel (Production)
- **Framework**: Next.js 16.3.3 (App Router / Turbopack)
- **Runtime**: Node.js 24.x / Edge Middleware
- **Production Alias**: [https://legalbook-six.vercel.app](https://legalbook-six.vercel.app)
- **Direct Deployment URL**: [https://legalbook-e6dismzgc-legalbook.vercel.app](https://legalbook-e6dismzgc-legalbook.vercel.app)
- **Deployment ID**: `dpl_Cs9sQgcc7K7VLWrcQe3RrS5MEEFY`
- **Status**: READY (Healthy & Verified - Decree 30/2020 Semantic Layout, Hybrid Search RPC, 58 Verified Legal Docs, 40 Categories)

## Verified Features & Test Matrix
1. **Document Reader & Legal Typography**:
   - Conforming to Nghị định 30/2020/NĐ-CP (2-column administrative letterhead on desktop).
   - 4-row structured Header & sticky Toolbar (48–52px) with non-disruptive Context Panels.
   - Dedicated Focus Mode ("Tập trung đọc") with 1-click layout restore preserving scroll position.
2. **Label & Title Deduplication**:
   - Removed duplicate status countdown tags and redundant type prefixes in feeds and lists.
   - Title normalizer cleans repeated document numbers without mutating source text.
3. **Automated OCR & Word (.docx) Converter**: Integrated in `/admin/upload`, batch queue list and review workspace for instant conversion of scanned PDFs.
4. **Sub-2ms Global Search V2**: 1-pass fast scanning, index caching, 60fps responsive input.
5. **Automated Regression Suite**: 113/113 tests passing across 15 test suites.
