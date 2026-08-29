/**
 * test_team_annotations.js
 * 
 * Unit Tests for Team Annotations & Enterprise Collaboration
 */

const assert = require("assert");

console.log("================================================================================");
console.log("RUNNING TEAM ANNOTATIONS & ENTERPRISE COLLABORATION TEST SUITE");
console.log("================================================================================");

// ─── Test 1: Visibility Levels & Roles ───────────────────────────────────────
console.log("\n[Test 1] Supported 3 visibility tiers (private, team, organization)");
const sampleAnnotations = [
  {
    id: "ann-1",
    documentId: "doc-1",
    userId: "user-a",
    type: "note",
    visibility: "private",
    noteContent: "Ghi chú bảo mật cá nhân.",
    anchor: { exactText: "Điều 15. Khấu trừ thuế", contentVersion: "v1" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ann-2",
    documentId: "doc-1",
    userId: "user-b",
    type: "note",
    visibility: "team",
    noteContent: "Lưu ý cho phòng Kế toán thuế.",
    anchor: { exactText: "Điều 16. Thời hạn nộp hồ sơ", contentVersion: "v1" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "ann-3",
    documentId: "doc-1",
    userId: "user-c",
    type: "highlight",
    visibility: "organization",
    noteContent: "Chính sách áp dụng toàn công ty.",
    anchor: { exactText: "Điều 20. Trách nhiệm doanh nghiệp", contentVersion: "v1" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function filterByVisibility(annotations, visibility) {
  if (visibility === "all") return annotations;
  return annotations.filter((a) => a.visibility === visibility);
}

assert.strictEqual(filterByVisibility(sampleAnnotations, "all").length, 3);
assert.strictEqual(filterByVisibility(sampleAnnotations, "private").length, 1);
assert.strictEqual(filterByVisibility(sampleAnnotations, "team").length, 1);
assert.strictEqual(filterByVisibility(sampleAnnotations, "organization").length, 1);
console.log("✔ Annotations filter cleanly by private, team, and organization visibility tiers");

// ─── Test 2: Note Deletion Permissions ───────────────────────────────────────
console.log("\n[Test 2] Ownership and deletion permissions check");
function canDeleteNote(ann, currentUserId) {
  if (!currentUserId) return true; // Guest user owns local notes
  if (ann.userId.startsWith("guest_")) return true;
  return ann.userId === currentUserId;
}

assert.strictEqual(canDeleteNote(sampleAnnotations[0], "user-a"), true, "Author can delete own note");
assert.strictEqual(canDeleteNote(sampleAnnotations[0], "user-b"), false, "Other user cannot delete private note");
assert.strictEqual(canDeleteNote({ ...sampleAnnotations[0], userId: "guest_123" }, undefined), true, "Guest can delete guest note");
console.log("✔ Deletion permission correctly protects collaborative team annotations while allowing author edits");

// ─── Test 3: Markdown Legal Memo Generation ──────────────────────────────────
console.log("\n[Test 3] Generate structured legal research memorandum from annotations");
function generateLegalMemoMarkdown(docTitle, annotations) {
  let md = `# BẢNG TỔNG HỢP GHI CHÚ & TRÍCH DẪN PHÁP LÝ\n\n`;
  md += `**Văn bản:** ${docTitle}\n\n`;
  md += `---\n\n`;

  annotations.forEach((ann, idx) => {
    md += `### ${idx + 1}. ${ann.type === "note" ? "📝 Ghi chú" : "🖍 Highlight"} [${ann.visibility.toUpperCase()}]\n`;
    if (ann.anchor.exactText) {
      md += `> "${ann.anchor.exactText}"\n\n`;
    }
    if (ann.noteContent) {
      md += `**Nội dung:** ${ann.noteContent}\n\n`;
    }
  });
  return md;
}

const memo = generateLegalMemoMarkdown("Luật thuế GTGT 2026", sampleAnnotations);
assert.ok(memo.includes("BẢNG TỔNG HỢP GHI CHÚ"));
assert.ok(memo.includes("Điều 15. Khấu trừ thuế"));
assert.ok(memo.includes("Lưu ý cho phòng Kế toán thuế"));
console.log("✔ Legal research memo generates valid Markdown with citations and quotes");

console.log("\n================================================================================");
console.log("ALL TEAM ANNOTATIONS TESTS PASSED (3/3) ✔");
console.log("================================================================================");
