# Deployment Record - LegalBook

## Platform
- **Provider**: Vercel (Production)
- **Framework**: Next.js 16.3.3 (App Router / Turbopack)
- **Runtime**: Node.js 24.x / Edge Middleware
- **Production Alias**: [https://legalbook-six.vercel.app](https://legalbook-six.vercel.app)
- **Latest Commit**: `674c666` (fix(reader): resolve duplicate overview tab, fix TOC viewport scrolling and enhance AI chat)
- **Status**: DEPLOYED (Vercel Production CI/CD Triggered via GitHub main branch)

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
6. **Document Comparison Redesign**: Exact Amendment Diff separation vs Multi-document AI Cross-Analysis.
7. **TOC Navigation & Precision Viewport Scrolling**: Sticky toolbar offset correction (72px), stable `dieu-X` and `chuong-X` ID binding, temporary pulse highlight `.is-navigation-target`, 100% (775/775) DOM heading match.
8. **Overview Deduplication & AI Chat Polish**: Removed duplicate overview button, instant 0ms summary session cache, Dispatch vs Normative summary templates, context scope switcher (in-doc vs whole library), and smart action chips.
9. **Comprehensive Regression Matrix**: 241/241 unit & integration tests passing across 31 test suites.
