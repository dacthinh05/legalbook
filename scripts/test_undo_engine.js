/**
 * test_undo_engine.js
 * 
 * Unit Tests for Document Reader Undo/Redo Engine (Ctrl+Z / Ctrl+Y)
 */

const assert = require("assert");

class DocumentUndoManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
    this.MAX_HISTORY = 50;
  }

  pushAction(action) {
    const fullAction = {
      ...action,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    this.undoStack.push(fullAction);
    if (this.undoStack.length > this.MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    const action = this.undoStack.pop();
    if (!action) return null;
    this.redoStack.push(action);
    return action;
  }

  redo() {
    const action = this.redoStack.pop();
    if (!action) return null;
    this.undoStack.push(action);
    return action;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

console.log("================================================================================");
console.log("RUNNING DOCUMENT READER UNDO/REDO ENGINE TEST SUITE");
console.log("================================================================================");

// ─── Test 1: Push Action and Undo (Ctrl+Z) ───────────────────────────────────
console.log("\n[Test 1] Record action and undo via Ctrl+Z");
const manager = new DocumentUndoManager();
assert.strictEqual(manager.canUndo(), false);
assert.strictEqual(manager.canRedo(), false);

manager.pushAction({
  type: "add_annotation",
  description: "Tô màu đoạn văn",
  annotation: { id: "ann-1", type: "highlight", color: "yellow" },
});

assert.strictEqual(manager.canUndo(), true);
assert.strictEqual(manager.canRedo(), false);

const undone = manager.undo();
assert.ok(undone);
assert.strictEqual(undone.type, "add_annotation");
assert.strictEqual(undone.annotation.id, "ann-1");
assert.strictEqual(manager.canUndo(), false);
assert.strictEqual(manager.canRedo(), true);
console.log("✔ Action successfully records and undos with reverse state transitions");

// ─── Test 2: Redo Action (Ctrl+Y) ────────────────────────────────────────────
console.log("\n[Test 2] Redo previously undone action via Ctrl+Y");
const redone = manager.redo();
assert.ok(redone);
assert.strictEqual(redone.annotation.id, "ann-1");
assert.strictEqual(manager.canUndo(), true);
assert.strictEqual(manager.canRedo(), false);
console.log("✔ Redo restores action accurately to active undo stack");

// ─── Test 3: New Action Clears Redo Stack ────────────────────────────────────
console.log("\n[Test 3] New user action invalidates redo history branch");
manager.undo();
assert.strictEqual(manager.canRedo(), true);

manager.pushAction({
  type: "add_annotation",
  description: "Tô màu mới",
  annotation: { id: "ann-2", type: "highlight", color: "green" },
});

assert.strictEqual(manager.canRedo(), false, "Redo stack must be cleared when new action occurs");
assert.strictEqual(manager.canUndo(), true);
console.log("✔ Redo stack invalidation prevents branching history corruption");

// ─── Test 4: Stack Capacity Clamping (Max 50 actions) ─────────────────────────
console.log("\n[Test 4] History stack bounded to 50 items preventing memory leaks");
manager.clear();
for (let i = 0; i < 60; i++) {
  manager.pushAction({
    type: "add_annotation",
    description: `Thao tác ${i}`,
    annotation: { id: `ann-${i}`, type: "highlight" },
  });
}
assert.strictEqual(manager.undoStack.length, 50, "Stack size must be clamped to 50");
console.log("✔ Memory bounded: stack size never exceeds 50 items under intense usage");

console.log("\n================================================================================");
console.log("ALL UNDO/REDO ENGINE TESTS PASSED (4/4) ✔");
console.log("================================================================================");
