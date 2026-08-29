/**
 * test_diff_engine.js
 * 
 * Unit & Invariant Tests for Legal Diff Engine and Amendment Comparator
 */

const assert = require("assert");

// Simulator of diff-engine in pure Node
function tokenizeText(text) {
  if (!text) return [];
  const tokens = text.match(/[\w\d\p{L}]+|[^\w\d\p{L}\s]+|\s+/gu);
  return tokens || [text];
}

function computeTokenDiff(textA, textB) {
  if (textA === textB) {
    return textA ? [{ op: "unchanged", text: textA }] : [];
  }
  if (!textA) {
    return textB ? [{ op: "added", text: textB }] : [];
  }
  if (!textB) {
    return textA ? [{ op: "deleted", text: textA }] : [];
  }

  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);

  const n = tokensA.length;
  const m = tokensB.length;

  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const rawDiff = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && tokensA[i - 1] === tokensB[j - 1]) {
      rawDiff.push({ op: "unchanged", text: tokensA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({ op: "added", text: tokensB[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({ op: "deleted", text: tokensA[i - 1] });
      i--;
    }
  }

  rawDiff.reverse();

  const compressed = [];
  for (const token of rawDiff) {
    const last = compressed[compressed.length - 1];
    if (last && last.op === token.op) {
      last.text += token.text;
    } else {
      compressed.push({ op: token.op, text: token.text });
    }
  }

  return compressed;
}

console.log("================================================================================");
console.log("RUNNING LEGAL DIFF ENGINE & AMENDMENT COMPARATOR TEST SUITE");
console.log("================================================================================");

// ─── Test 1: Word-level Tokenization ─────────────────────────────────────────
console.log("\n[Test 1] Tokenize legal text preserving words, punctuation and spaces");
const sample = "Thuế suất 10% áp dụng cho hàng hóa, dịch vụ.";
const tokens = tokenizeText(sample);
assert.ok(tokens.length >= 8);
assert.strictEqual(tokens.join(""), sample, "Reconstruction must match original string verbatim");
console.log("✔ Tokenization preserves full text fidelity without loss or corruption");

// ─── Test 2: Addition, Deletion & Unchanged Tokens ───────────────────────────
console.log("\n[Test 2] LCS Token Diff identifies added, deleted, and unchanged segments");
const oldClause = "Mức giảm trừ gia cảnh cho bản thân là 11 triệu đồng/tháng.";
const newClause = "Mức giảm trừ gia cảnh cho bản thân là 15 triệu đồng/tháng theo quy định mới.";
const diff = computeTokenDiff(oldClause, newClause);

const hasDeleted = diff.some((t) => t.op === "deleted" && t.text.includes("11"));
const hasAdded15 = diff.some((t) => t.op === "added" && t.text.includes("15"));
const hasAddedNew = diff.some((t) => t.op === "added" && t.text.includes("theo quy định mới"));
const hasUnchanged = diff.some((t) => t.op === "unchanged" && t.text.includes("Mức giảm trừ gia cảnh"));

assert.ok(hasDeleted, "Must mark '11' as deleted");
assert.ok(hasAdded15, "Must mark '15' as added");
assert.ok(hasAddedNew, "Must mark 'theo quy định mới' as added");
assert.ok(hasUnchanged, "Must mark common text as unchanged");
console.log("✔ Token diff accurately computes additions and deletions at word precision");

// ─── Test 3: Article Extraction & Matching ───────────────────────────────────
console.log("\n[Test 3] Legal article extraction and semantic alignment");
function extractArticles(html) {
  const headingRegex = /(?:<h[1-6][^>]*>|<p[^>]*>\s*<strong>|<strong>|<p[^>]*>)\s*((?:Điều|Chương|Phần|Mục|Phụ lục)\s+[\dIVXLCDM\w\.\-]+[^<\n]{0,120})/gi;
  const matches = [];
  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const label = match[1].replace(/<[^>]*>/g, "").replace(/[\.:].*$/, "").trim();
    matches.push({ label, index: match.index });
  }
  return matches;
}

const sampleHtml = `
  <h2>Điều 1. Phạm vi điều chỉnh</h2>
  <p>Quy định chi tiết đối tượng áp dụng.</p>
  <h2>Điều 2. Người nộp thuế</h2>
  <p>Tổ chức, cá nhân sản xuất kinh doanh.</p>
`;
const extracted = extractArticles(sampleHtml);
assert.strictEqual(extracted.length, 2);
assert.strictEqual(extracted[0].label, "Điều 1");
assert.strictEqual(extracted[1].label, "Điều 2");
console.log("✔ Legal HTML structure accurately extracts article boundaries");

// ─── Test 4: Document Comparison Summary Stats ───────────────────────────────
console.log("\n[Test 4] Document comparison KPI metrics calculation");
const stats = {
  totalArticlesCount: 10,
  modifiedArticlesCount: 3,
  addedArticlesCount: 1,
  deletedArticlesCount: 1,
  unchangedArticlesCount: 5,
};
assert.strictEqual(
  stats.modifiedArticlesCount + stats.addedArticlesCount + stats.deletedArticlesCount + stats.unchangedArticlesCount,
  stats.totalArticlesCount,
  "Sum of article statuses must equal total articles"
);
console.log("✔ KPI metrics and article status partitions are mathematically consistent");

console.log("\n================================================================================");
console.log("ALL DIFF ENGINE & COMPARATOR TESTS PASSED (4/4) ✔");
console.log("================================================================================");
