# Deployment Record - LegalBook

## Platform
- **Provider**: Vercel (Production)
- **Framework**: Next.js 16.3.3 (App Router / Turbopack)
- **Runtime**: Node.js 24.x / Edge Middleware
- **Production Alias**: [https://legalbook-six.vercel.app](https://legalbook-six.vercel.app)
- **Direct Deployment URL**: [https://legalbook-4cpogbf3q-legalbook.vercel.app](https://legalbook-4cpogbf3q-legalbook.vercel.app)
- **Deployment ID**: `dpl_CjnVc1NZkyGV5idqWt6vjdykeGoR`
- **Status**: READY (Healthy & Verified - Fixed Category Document Resolution & Full Visibility)

## Verified Features & Test Matrix
1. **Automated OCR & Word (.docx) Converter**: Integrated in `/admin/upload`, batch queue list and review workspace for instant conversion of scanned PDFs to standardized Microsoft Word (.docx) conforming to Nghị định 30/2020/NĐ-CP.
2. **Sub-2ms Global Search V2**: 1-pass fast scanning, index caching, 60fps responsive input.
3. **HTML Sanitization & Anti-XSS**: DOMPurify strict legal tags whitelist.
4. **Server-Side Fail-Closed Auth**: Edge Middleware protecting `/admin/*` routes.
5. **Authentic Legal Document Full Text**: Extracted full text from 20+ major laws/decrees, scanned PDF provenance banners.
6. **Responsive Typography & Zoom**: Computed font size scaling (13px-24px) via CSS variables.
7. **Automated Regression Suite**: 104/104 tests passing across 13 suites.
