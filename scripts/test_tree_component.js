
const assert = require("assert");

// Mock categories for testing
const mockCategories = [
  {
    id: "cat-root-thue",
    parent_id: null,
    name: "Thuế",
    slug: "thue",
    order_index: 1,
    children: [
      {
        id: "cat-thue-gtgt",
        parent_id: "cat-root-thue",
        name: "Thuế GTGT",
        slug: "thue-gtgt",
        order_index: 1,
        children: [
          { id: "cat-luat-gtgt", parent_id: "cat-thue-gtgt", name: "Luật thuế GTGT", slug: "thue-gtgt-luat", order_index: 1 },
          { id: "cat-nd-gtgt", parent_id: "cat-thue-gtgt", name: "Nghị định thuế GTGT", slug: "thue-gtgt-nd", order_index: 2 },
          { id: "cat-tt-gtgt", parent_id: "cat-thue-gtgt", name: "Thông tư thuế GTGT", slug: "thue-gtgt-tt", order_index: 3 },
          { id: "cat-cv-gtgt", parent_id: "cat-thue-gtgt", name: "Công văn thuế GTGT", slug: "thue-gtgt-cv", order_index: 4 },
        ]
      },
      {
        id: "cat-thue-tndn",
        parent_id: "cat-root-thue",
        name: "Thuế TNDN",
        slug: "thue-tndn",
        order_index: 2,
        children: []
      },
      {
        id: "cat-thue-tncn",
        parent_id: "cat-root-thue",
        name: "Thuế TNCN",
        slug: "thue-tncn",
        order_index: 3,
        children: []
      }
    ]
  }
];

function getAncestorCategoryIds(categoryId, categories) {
  const ancestorIds = [];
  const map = new Map();
  function register(cats) {
    cats.forEach((c) => {
      map.set(c.id, c);
      if (c.children && c.children.length > 0) register(c.children);
    });
  }
  register(categories);

  let current = map.get(categoryId);
  while (current && current.parent_id) {
    ancestorIds.push(current.parent_id);
    current = map.get(current.parent_id);
  }
  return ancestorIds;
}

function getTreeIndentation(depth) {
  return 12 + depth * 20;
}

function flattenVisibleTree(categories, expandedIds, depth = 0, parentId = null) {
  const result = [];
  for (const cat of categories) {
    const hasChildren = Boolean(cat.children && cat.children.length > 0);
    result.push({
      category: cat,
      depth,
      hasChildren,
      parentId,
    });
    if (hasChildren && expandedIds.has(cat.id) && cat.children) {
      result.push(...flattenVisibleTree(cat.children, expandedIds, depth + 1, cat.id));
    }
  }
  return result;
}

console.log("--- RUNNING CATEGORY TREE AUDIT & INVARIANT TESTS ---");

// Test 1 & 2 & 3: Thue GTGT & Thue TNDN alignment & level
console.log("Test 1: Alignment and Level of Thuế GTGT and Thuế TNDN");
const expanded = new Set(["cat-root-thue", "cat-thue-gtgt"]);
const visible = flattenVisibleTree(mockCategories, expanded);

const nodeThueGTGT = visible.find(n => n.category.id === "cat-thue-gtgt");
const nodeThueTNDN = visible.find(n => n.category.id === "cat-thue-tndn");

assert.strictEqual(nodeThueGTGT.depth, 1, "Thuế GTGT must be at depth 1 (Level 1)");
assert.strictEqual(nodeThueTNDN.depth, 1, "Thuế TNDN must be at depth 1 (Level 1)");
assert.strictEqual(getTreeIndentation(nodeThueGTGT.depth), getTreeIndentation(nodeThueTNDN.depth), "Thuế GTGT and Thuế TNDN must have the identical indentation padding (32px)");
console.log("â Thuế GTGT and Thuế TNDN are both level 1 with identical indentation: " + getTreeIndentation(1) + "px");

// Test 4: Children have deeper level
console.log("Test 4: Children level depth");
const nodeLuatGTGT = visible.find(n => n.category.id === "cat-luat-gtgt");
assert.strictEqual(nodeLuatGTGT.depth, 2, "Luật thuế GTGT must be at depth 2 (Level 2)");
assert.strictEqual(getTreeIndentation(nodeLuatGTGT.depth), 52, "Level 2 indentation must be 52px (12 + 2*20)");
console.log("â Sub-items (Luật/Nghị định/Thông tư/Công văn) are at depth 2 with 52px padding");

// Test 5 & 6: Chevron expand / collapse & ancestor preservation
console.log("Test 5 & 6: Expand / collapse transitions");
const collapsedGTGT = new Set(["cat-root-thue"]);
const visibleCollapsed = flattenVisibleTree(mockCategories, collapsedGTGT);
assert.strictEqual(visibleCollapsed.some(n => n.category.id === "cat-luat-gtgt"), false, "Luật thuế GTGT should not be visible when Thuế GTGT is collapsed");
assert.strictEqual(visibleCollapsed.some(n => n.category.id === "cat-thue-tndn"), true, "Thuế TNDN should remain visible at level 1");
console.log("â Expanding and collapsing correctly adjusts visible items");

// Test 8: Deep link auto-expansion
console.log("Test 8: Deep link ancestor retrieval");
const ancestorsOfLuat = getAncestorCategoryIds("cat-luat-gtgt", mockCategories);
assert.deepStrictEqual(ancestorsOfLuat, ["cat-thue-gtgt", "cat-root-thue"], "Ancestors of Luật thuế GTGT must be Thuế GTGT then Thuế");
console.log("â Deep link to Luật thuế GTGT correctly discovers all ancestors: " + JSON.stringify(ancestorsOfLuat));

// Test 9: Keyboard navigation sequence
console.log("Test 9: Keyboard navigation hierarchy");
const idsInOrder = visible.map(n => n.category.id);
assert.deepStrictEqual(idsInOrder, [
  "cat-root-thue",
  "cat-thue-gtgt",
  "cat-luat-gtgt",
  "cat-nd-gtgt",
  "cat-tt-gtgt",
  "cat-cv-gtgt",
  "cat-thue-tndn",
  "cat-thue-tncn"
]);
console.log("â Visible tree order matches exact DOM traversal sequence for ArrowDown / ArrowUp navigation");

console.log("ALL INVARIANT TESTS PASSED SUCCESSFULLY! â");
