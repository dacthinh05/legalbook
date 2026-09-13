# Ultra Verifier Tournament: Best-of-5 Plan Candidates

**Rubric Dimensions:**
1. *Faithfulness & Directness* (Does it eliminate all 59 synthetic/stub docs without hallucinating new ones?)
2. *Evidence Grounding* (Does it map directly to the 214 authentic `.docx` in `public/documents/`?)
3. *Test Preservation & Contract Stability* (Does it keep 318 regression tests green without breaking regressions?)
4. *Honesty about Unknowns & Operational Simplicity* (Zero unnecessary migrations or broken schemas)

---

### Candidate 1: In-Place Scrub & Authentic DOCX Expansion
- **Strategy:** Retain all verified authentic statutes/dispatches in `demo-data.ts`. Purge the 59 synthetic/broken documents. Ingest missing real full-text statutes from `public/documents/*.docx` using Mammoth. Re-link relations and categories.
- **Score:** 96/100 (Winning Candidate)
- **Strengths:** Cleanest cutover, preserves regression tests, zero downtime, restores authentic fulltext, keeps bundle size lean.
- **Failure Condition:** If any regression test strictly depended on a deleted synthetic document ID rather than number/type. (Checked: tests depend on doc numbers `200/2014/TT-BTC`, `123/2020`, etc., which are kept).

### Candidate 2: Complete Re-crawl from External Government Portals
- **Strategy:** Run live portal crawlers against `thuvienphapluat.vn` / `chinhphu.vn` to replace the entire corpus from scratch.
- **Score:** 64/100
- **Failure Condition:** Rate limits, CAPTCHA, network dependency, long crawling duration (hours), potential scraping failures.

### Candidate 3: UI-Layer Filter Only (`is_simulated = false`)
- **Strategy:** Keep synthetic documents in `demo-data.ts`, but add a boolean flag `is_simulated: true` and filter them out in `data-service.ts`.
- **Score:** 52/100
- **Failure Condition:** Fails user intent: fake documents still linger in bundle, memory, search vectors, and AI RAG contexts.

### Candidate 4: Empty Local Corpus & Require Live Supabase Connection
- **Strategy:** Wipe `demo-data.ts` down to `[]`, forcing all environments to query Supabase live database.
- **Score:** 58/100
- **Failure Condition:** Destroys offline demo mode, fails 45 offline regression test suites that rely on embedded data.

### Candidate 5: Full LLM-Generated Synthetic Law Overhaul
- **Strategy:** Use Gemini / GPT-4 to re-write all 59 synthetic laws with realistic legal wording.
- **Score:** 35/100
- **Failure Condition:** Violates Vietnamese legal accuracy; generating fake legal provisions by AI is illegal and dangerous for tax/legal practice.

---

### Verifier Selection
**Selected Winner:** **Candidate 1 (In-Place Scrub & Authentic DOCX Expansion)**.
It directly resolves the root cause with zero fluff, grounded in the 214 authentic files already present in the workspace.
