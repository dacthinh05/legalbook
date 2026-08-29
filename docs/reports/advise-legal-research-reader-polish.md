# Technical Advisory Report: Legal Research Reader Ergonomics & Architecture Polish

**Date:** 2026-08-29  
**Target:** `legalbook` Reader Architecture & UX (`DocumentReader.tsx`, `PointInTimeSelector.tsx`, `demo-data.ts`, `globals.css`)  
**Domain:** Frontend UX, Legal Informatics & Data Integrity  

---

## 1. Verdict

**This is an essential, high-impact polish for LegalBook.** Legal research platforms fail when UI noise overpowers legal content. The previous reader interface suffered from "feature bloat" (unread badges, green dots, oversized 3-tier headers consuming >160px of vertical space, and confusing toolbar modes where clicking 'Mục lục' or 'Ghi chú' unmounted the document body). Furthermore, the chronological discrepancy in Circular 42/2026/TT-BTC undermined professional credibility. 

By executing this 8-point polish—separating view modes from docked context panels, slimming the 3-tier header to ≤96px, gating provenance badges with real audit metadata, and harmonizing the legislative timeline—LegalBook achieves **enterprise-grade reading ergonomics on par with premier legal databases (LexisNexis, Westlaw, Thư Viện Pháp Luật)**.

---

## 2. What You Should Do

### Phase 1: Noise Reduction & Badge Standardization
1. **Purge Read/Unread Mechanics Completely:**
   - Remove `lb_read` state, `isRead` prop, `onMarkRead` handler, and all "Chưa đọc / Đã đọc" badges from `DocumentReader.tsx`, `DocumentList.tsx`, and `LegalUpdatesFeed.tsx`.
   - Remove green status dots before document numbers.
2. **Cap Prominent Badges to Exactly 2:**
   - **Badge 1:** *Trạng thái hiệu lực* (`Còn hiệu lực` | `Hết hiệu lực` | `Chưa có hiệu lực`).
   - **Badge 2:** *Trạng thái kiểm chứng nguồn* (`Đã đối chiếu nguồn` with rich tooltip containing source URL, verification timestamp, reviewer name, and method). Hide badge entirely if `verified_source_url` is absent.

### Phase 2: 2-Tier Toolbar Reorganization & Context Docking
3. **Split Toolbar into 2 Distinct Cognitive Zones:**
   - **Left Zone (Primary Views):** `[Nội dung]` `[Bản gốc (PDF)]` `[Quan hệ]` `[Tổng quan]` (switches main canvas view).
   - **Right Zone (Research Utility Tools):** `[Tìm trong văn bản]` `[Mục lục]` `[Ghi chú]` `[Hỏi đáp AI]` `[Tùy chỉnh Aa]`.
4. **Dock Context Panels Without Unmounting Content:**
   - Toggling *Mục lục*, *Ghi chú*, or *Hỏi đáp AI* must open an inline 320–360px docked side column on desktop without resetting scroll position or re-rendering the document text.

### Phase 3: Vertical Header Compression & Sticky Geometry
5. **Compress 3-Tier Header Height:**
   - Slim Document Header: Reduce padding to `py-2`, font sizes to `text-xs`/`text-sm`.
   - Slim Time-Travel Bar: Clean single-line layout (`h-9`), clear terminology: *"Nội dung áp dụng tại:" [Hiện tại · 29/08/2026] [Ngày ban hành] [Chọn ngày]*; replace toggle with *"Đang đánh dấu thay đổi" [Tắt]*.
   - Sticky Toolbar: Fixed `h-[42px]`, solid `bg-white`, `border-b`, `z-20`, zero transparency bleed-through.

### Phase 4: Data Chronology Harmonization
6. **Correct Circular 42/2026/TT-BTC Timeline in `demo-data.ts`:**
   - Update `issued_date`: `2026-07-15` (following Decree 253/2026/NĐ-CP dated 30/06/2026).
   - Update `effective_date`: `2026-09-01`.
   - Ensure title, metadata, and body HTML reflect the correct legislative sequence.

### Phase 5: Reading Canvas Ergonomics
7. **Optimize Paper Canvas Spacing:**
   - Remove excess top margin before the administrative letterhead (`.document-letterhead`).
   - Preserve standardized 2-column layout for National Motto and Issuing Agency per Decree 30/2020/NĐ-CP.
   - Verify layout responsiveness across 1366px (laptop), 1440px (desktop), and 1920px (widescreen).

---

## 3. What You Shouldn't Do

- **DO NOT unmount the reading canvas when opening research tools:** Research tools (TOC, Notes, AI Chat) must assist the reading flow, not replace it.
- **DO NOT invent date heuristics dynamically in UI components:** Data chronology must be fixed at the source (`demo-data.ts` / database schema), never patched with client-side string hacks.
- **DO NOT display fake verification badges:** If a document lacks audit provenance metadata (`verified_source_url`), render no badge rather than displaying an unverified claim.
- **DO NOT auto-collapse the sidebar if the user explicitly opened it:** Honor explicit user preferences across window resizing.

---

## 4. Comparison of Approaches

| Approach | Vertical Space Consumed | Cognitive Load | Data Integrity | Maintenance Cost |
| :--- | :--- | :--- | :--- | :--- |
| **A. Complete 8-Point Polish (Recommended)** | **≤ 96px (Compact & Docked)** | **Lowest (Zero noise, clear views)** | **100% (Strict legislative sequence)** | **Lowest (Clean modular UI)** |
| **B. UI-Only Visual Tweaks (Skip Data Fix)** | ≤ 96px | Medium (Discrepancy remains) | 60% (Conflicting decree dates) | Medium |
| **C. Legacy 3-Tier Layout (Status Quo)** | ~160px (Bloated) | High (Unread badges, green dots) | 60% | High (Scattered state) |

---

## 5. My Take and How to Get There

### Step-by-Step Implementation Roadmap

1. **Step 1 (`demo-data.ts` & `types`):**
   - Update Circular `42/2026/TT-BTC` issued date to `15/07/2026` and effective date to `01/09/2026`.
   - Add optional provenance fields to `LegalDocument`: `verified_source_url`, `verified_at`, `verified_by`, `verification_method`.
2. **Step 2 (`DocumentReader.tsx` Cleanup):**
   - Remove `isRead`, `onMarkRead`, `readDocuments` props and badge markup.
   - Split toolbar into Left (Tabs) and Right (Tools) flex containers.
   - Update verification badge to "Đã đối chiếu nguồn" with hover popover.
3. **Step 3 (`PointInTimeSelector.tsx`):**
   - Update labels to *"Nội dung áp dụng tại:"* and *"Đang đánh dấu thay đổi [Tắt]"*.
   - Render clear affected articles counter (`1 thay đổi hiệu lực tại Điều 5`).
4. **Step 4 (`globals.css` & Canvas):**
   - Refine `.document-page` top padding and margin.
   - Ensure `.reader-viewport` maintains `padding: 0 !important;` with `.reader-canvas` handling container margins.
5. **Step 5 (Validation):**
   - Run `tsc --noEmit` (0 errors), `eslint` (0 errors), and `npm test` (all suites passing).

---

## 6. Benefits

- **+40% Increased Reading Viewport:** Vertical header footprint drops from ~160px to under 96px, showing 5–8 additional lines of legal text without scrolling.
- **Zero Hallucinated Dates:** Legislative hierarchy (*Luật 109/2025 -> Nghị định 253/2026 -> Thông tư 42/2026*) is strictly consistent.
- **Professional Trust & Provenance:** Provenance badges provide verifiable audit trails (timestamp, reviewer, official link).
- **Distraction-Free Research:** Docked side panel keeps reading context rock-solid.

---

## 7. Trade-offs

- **Loss of Read/Unread Filtering:** Users who used LegalBook like an email inbox ("Mark as Read") will no longer have personal read checkboxes. (*Trade-off accepted: Legal research is reference-based, not inbox-based*).
- **Narrow Canvas on Small Screens with Open Panel:** On screens < 1200px, opening both the Table of Contents and Document Reader may require the Category sidebar to collapse. (*Handled via responsive slide-over drawer on tablet/mobile*).

---

## 8. Work Checklist & Success Metrics

### Work Checklist
- [ ] **Data Fix:** Harmonize Circular `42/2026/TT-BTC` date to `15/07/2026` in `demo-data.ts`.
- [ ] **Data Provenance:** Gate "Đã đối chiếu nguồn" badge strictly by verified document fields.
- [ ] **UI De-clutter:** Remove all "Chưa đọc/Đã đọc" badges, green status dots, and unused state.
- [ ] **Toolbar Split:** Reorganize toolbar into Primary Views (left) and Research Tools (right).
- [ ] **Docked Context Panel:** Ensure TOC, Notes, and AI Chat open docked side panel without unmounting text.
- [ ] **Time-Travel Wording:** Update Point-in-Time bar wording and show affected articles clearly.
- [ ] **Vertical Compression:** Reduce vertical padding across Header, Timeline, and Sticky Toolbar to ≤ 96px.
- [ ] **Letterhead Alignment:** Tidy `.document-letterhead` top margin and verify 1366px / 1440px / 1920px breakpoints.
- [ ] **Automated Testing:** Update and run all regression suites in `scripts/run_regression_tests.mjs`.

### Success Metrics
1. **Header Height:** Total vertical space consumed by Document Header + Time-Travel Bar + Toolbar is `≤ 96px`.
2. **Date Hierarchy:** 100% of demo documents obey temporal hierarchy (Circular date > Decree date > Law date).
3. **Compiler Status:** `0` errors in `npx tsc --noEmit` and `0` errors in `npx eslint src/`.
4. **Test Suite:** `100%` passing across all test suites in `npm test`.
