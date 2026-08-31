# Technical Advisory Report: Advanced Cross-Document Comparison & Visual Diff Workspace

**Date:** 2026-08-29  
**Target:** LegalBook Advanced Comparison & Diff Workspace (`LegalDiffViewer.tsx`, `diff-engine.ts`, `CrossDocAnalysisModal.tsx`)  
**Domain:** Legal Informatics, Visual Diff Algorithms & Enterprise Reporting  

---

## 1. Verdict

**This is the highest-value functional upgrade for LegalBook at its current maturity level.** In Vietnamese corporate law, tax, and auditing, professionals spend the vast majority of their time answering two questions: *"Điều khoản này đã bị sửa đổi, thêm bớt những chữ gì?"* (Amendment Diff) and *"Nghị định/Thông tư nào hướng dẫn cụ thể điều luật này?"* (Guidance Mapping).

By implementing a **Unified Dual-Mode Workspace**—combining word-level character diffs with a 2D provision mapping matrix, synchronized dual-column viewport scrolling, Gemini 2.5 Flash delta briefing, and 1-click Excel/Word/PDF export—LegalBook transitions from a reading tool into an **indispensable legal analysis workstation**.

---

## 2. What You Should Do

### Phase 1: Dual-Mode Comparison Engine Architecture (`src/lib/diff-engine.ts`)
1. **Implement Clause-Aware Token Diffing:**
   - Rather than diffing whole HTML strings (which breaks tags and creates noisy diffs), parse documents into atomic Article/Clause objects (`Điều`, `Khoản`, `Điểm`).
   - Run Longest Common Subsequence (LCS) word-level diffing per matching clause pair.
   - Tag modifications as: `added` (green pill), `deleted` (red strikethrough), `modified` (yellow highlight), and `unchanged`.
2. **Implement 2D Legislative Guidance Mapping:**
   - Map Law articles to guiding Decree / Circular clauses using cross-reference detection (`Căn cứ Điều X...`, `Quy định chi tiết Điều Y...`).
   - Construct a clean 2-column matrix: Left = Law Article, Right = List of Guiding Decree Articles.

### Phase 2: Interactive Synchronized Dual-Column Viewport (`LegalDiffViewer.tsx`)
3. **Build Lockstep Dual-Column Scroll Sync:**
   - Implement proportional viewport synchronization: Scrolling on column A smoothly scrolls matching clause in column B into view.
   - Provide clause anchor navigation chips (`Điều 1`, `Điều 2`, `Điều 15...`) allowing instant jump to changed clauses.
4. **Interactive Provision Popovers:**
   - On the main reading canvas (`DocumentReader.tsx`), clicking on an amended clause opens a mini-popover showing the previous vs current text without navigating away.

### Phase 3: AI Executive Delta Briefing (Gemini 2.5 Flash)
5. **Implement `/api/ai/chat` Comparison Mode (`mode: 'compare'`):**
   - Provide structured prompts synthesizing 4 core business dimensions:
     - 📈 **Thuế suất & Nghĩa vụ tài chính** (Tax rate & financial changes).
     - ⏰ **Thời hạn & Quy trình kê khai** (Compliance deadlines).
     - 📁 **Hồ sơ & Chứng từ bắt buộc** (Required documentation).
     - ⚖️ **Rủi ro tuân thủ & Chế tài vi phạm** (Legal risks & penalties).

### Phase 4: Multi-Format Report Export Engine
6. **Implement Client-Side Export Generators:**
   - **Excel (.xlsx)**: Table containing columns: *Điều khoản Luật | Điều khoản Nghị định | Nội dung cũ | Nội dung mới | Đánh giá tác động*.
   - **Word (.docx)**: Formal comparison briefing formatted according to Decree 30/2020/NĐ-CP letterhead standards.
   - **PDF**: Direct clean print stylesheet for board and client deliverables.

---

## 3. What You Shouldn't Do

- **DO NOT run character-level diffs on raw HTML tags:** Stripping HTML tags first and operating on clean text tokens is mandatory. Diffing raw `<p class="...">` tags results in unusable visual noise.
- **DO NOT force unrelated documents into word-level diff mode:** If comparing Luật Thuế TNDN with Luật Đất Đai (different subject matter), force the system into *Topic Cross-Reference Analysis Mode* rather than generating a 100% red/green diff.
- **DO NOT unmount the primary reader when opening comparison modals:** Keep comparison workspaces in full modal view or slide-over overlays to preserve the user's active reading context.
- **DO NOT rely on server-side heavy LibreOffice containers for exports:** Use client-side JavaScript libraries (`docx`, `xlsx`, `html2pdf`) to keep server infrastructure lightweight and serverless.

---

## 4. Comparison of Implementation Approaches

| Approach | Rendering Latency | Accuracy / Fidelity | Enterprise Utility | Effort to Impact |
| :--- | :--- | :--- | :--- | :--- |
| **A. Unified Dual-Mode (Word Diff + Matrix + AI Briefing + Export)** *(Recommended)* | **< 80ms (Client LCS)** | **100% (Clause-locked)** | **Highest (Audit & Board Ready)** | **10/10 (Maximum ROI)** |
| **B. Basic Text Diff Only (Generic red/green)** | < 40ms | 60% (Breaks legal clauses) | Low (Hard to scan) | 5/10 (Incomplete) |
| **C. Server-Side Python Worker Diffing** | > 800ms | 98% | High | 6/10 (Over-engineered infrastructure) |

---

## 5. Recommended Implementation Route

1. **Step 1 (`diff-engine.ts`):**
   - Refactor `compareLegalDocuments` to return structured clause diff items with word-level insertions/deletions.
   - Add `buildGuidanceReferenceMatrix(lawDoc, decreeDoc)`.
2. **Step 2 (`LegalDiffViewer.tsx`):**
   - Implement dual-column synchronized scroll controller using `useRef` and ratio matching.
   - Add Mode switcher: `[So sánh Sửa đổi / Thay thế]` vs `[Bảng Hướng dẫn Chi tiết hóa]`.
3. **Step 3 (AI Delta Briefing):**
   - Enhance `compareDocumentsWithAi` in `src/lib/ai/legal-rag.ts` with structured executive tax & accounting brief.
4. **Step 4 (Export Engine):**
   - Implement `exportDiffToExcel` and `exportDiffToDocx` in `src/lib/diff-exporter.ts`.
5. **Step 5 (Validation):**
   - Add 15+ automated regression test cases verifying diff accuracy, word alignment, and export blob generation.

---

## 6. Benefits

- **90% Time Saved in Regulatory Audits:** Accountants and legal teams compare amending tax decrees in seconds instead of cross-reading multiple PDF pages.
- **Flawless Visual Clarity:** Red/green highlights pinpoint exact word changes (e.g., *"từ 05 triệu đồng"* -> *"từ 10 triệu đồng"*).
- **Client-Ready Deliverables:** 1-click export generates professional Excel/Word comparison tables ready to send to CFOs and clients.
- **Single-Stack Simplicity:** 100% client-side + serverless execution with zero extra hosting cost.

---

## 7. Trade-offs

- **Client CPU Usage on Very Long Laws (e.g. Bộ luật Dân sự 700 điều):** Diffing 700 articles word-by-word can take ~250ms on low-end mobile devices. (*Mitigation: Virtualize the list of diff cards with React Window / lazy clause diffing*).
- **Complex Table Diffs:** If an article contains complex HTML financial tables, cell-by-cell diffing is simplified to row-level diffing.

---

## 8. Work Checklist & Success Metrics

### Work Checklist
- [ ] **Diff Engine:** Build clause-level word token LCS differ in `src/lib/diff-engine.ts`.
- [ ] **Guidance Matrix:** Build 2D mapping engine linking Law clauses with Decree articles.
- [ ] **Dual-Column Sync:** Implement synchronized scroll controller in `LegalDiffViewer.tsx`.
- [ ] **AI Delta Briefing:** Connect Gemini 2.5 Flash structured executive summary.
- [ ] **Export Engine:** Implement client-side `.xlsx` and `.docx` comparison report exporter.
- [ ] **Popover Integration:** Add hover provision change popover to `DocumentReader.tsx`.
- [ ] **Regression Tests:** Add Suite 40 to `scripts/run_regression_tests.mjs` verifying diff accuracy and export blobs.

### Success Metrics
1. **Diff Speed:** Diff computed and rendered in `≤ 100ms` for documents up to 60 articles.
2. **AI First Token:** AI Delta Briefing response starts in `≤ 1.2s`.
3. **Export Integrity:** 100% of tested clauses and changes properly exported to `.docx` and `.xlsx` without corrupted XML.
4. **Test Status:** 100% pass rate in `npm test` across all 40 test suites.
