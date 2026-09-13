# Evidence Packet: LegalBook Corpus Integrity & Anti-Hallucination Audit

## 1. Problem Statement
The user reports: "DỰ ÁN TÔI KHÁ NHIỀU BUG, VĂN BẢN ẢO, LÀM THẾ NÀO ĐỂ KHẮC PHỤC"
(Project has many bugs, fake/hallucinated legal documents, how to fix).

## 2. Quantitative Codebase Audit Findings
- **Embedded Corpus (`src/lib/demo-data.ts`)**: 179 documents total, size 7.36MB, 13,548 lines.
- **Hallucinated / Synthetic Documents Identified**: 59 documents contain severe defects:
  1. *Future or Unpromulgated Numbers*: `58/2026/TT-BTC`, `144/2026/NĐ-CP`, `08/2026/TT-BLĐTBXH`, `20/2026/TT-BTC`, `121/2026/TT-BKHĐT`, `87/2026/TT-BTC`, `99/2025/TT-BTC`, `320/2025/NĐ-CP`, `181/2025/NĐ-CP`, `67/2025/QH15`, `76/2025/QH15`, `110/2025/UBTVQH15`.
  2. *Malformed / Broken Number Formats*: `2026` (title "58 HD che do ke toan cho DN sieu nho"), `20/2025NĐ-CP` (missing slash), `70/2025NĐ-CP` (missing slash), `20-2026-TT-BTC` (wrong hyphenated dispatch code).
  3. *Generic Placeholder Signer*: Exactly 59 documents list `"Lãnh đạo cơ quan ban hành"` as signer instead of real officials (e.g. Mai Sơn, Cao Anh Tuấn, Võ Thành Hưng, Vương Đình Huệ).
  4. *Content Stubs (< 2,000 chars)*: Several statutory acts contain only preamble lines with zero actual Articles/Clauses.
- **Physical Authentic Assets (`public/documents/`)**:
  - Contains 214 authentic `.docx` files:
    - Core enacted statutes: `Luat_48.2024.QH15.docx` (VAT Law 2024), `ND 74.2024.NĐ-CP`, `TT 214.2012.TT-BTC`, `ND 125/2020`, `ND 123/2020`, `TT 80/2021`, `TT 200/2014`, etc.
    - 90+ Authentic Official Dispatches from General Department of Taxation (TCT-CS), Cục Thuế Hà Nội (CTHN), TP.HCM (CTTPHCM), Đà Nẵng, Bình Dương (2020-2024).
- **Test Invariants (`scripts/run_regression_tests.mjs`)**:
  - 318 passing tests across 45 test suites.
  - Tests 7, 16, 17, 32 contain small string assertions using synthetic samples as mock input strings for normalization functions (e.g., `normalizeLegalNumber('Thông tư 99/2025/TT-BTC')`).
  - Core assertions on line 3399 require: `doc200` must exist (`assert.ok(doc200, 'Doc 200/2014/TT-BTC or replacement 99/2025/TT-BTC must exist')`).
  - Therefore, keeping authentic historical documents (`200/2014/TT-BTC`, `125/2020/NĐ-CP`, `123/2020/NĐ-CP`, `48/2024/QH15`) preserves 100% test compatibility while removing fake entries.
