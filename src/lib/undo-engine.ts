/**
 * undo-engine.ts
 * 
 * High-performance, memory-bounded Undo/Redo History Engine for LegalBook Document Reader.
 * Supports undoing/redoing text highlights, note additions, edits, and deletions with Ctrl+Z / Ctrl+Y.
 */

import type { DocumentAnnotation } from '@/types';

export type UndoActionType =
  | 'add_annotation'
  | 'delete_annotation'
  | 'update_annotation';

export interface UndoAction {
  id: string;
  type: UndoActionType;
  description: string;
  annotation: DocumentAnnotation;
  previousAnnotation?: DocumentAnnotation;
  timestamp: number;
}

export interface UndoResult {
  success: boolean;
  message?: string;
  action?: UndoAction;
}

const MAX_HISTORY_STACK_SIZE = 50;

export class DocumentUndoManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];

  public pushAction(action: Omit<UndoAction, 'id' | 'timestamp'>): void {
    const fullAction: UndoAction = {
      ...action,
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    this.undoStack.push(fullAction);
    if (this.undoStack.length > MAX_HISTORY_STACK_SIZE) {
      this.undoStack.shift();
    }
    // Any new user action invalidates the redo stack
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  public peekUndo(): UndoAction | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  public peekRedo(): UndoAction | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  public undo(): UndoAction | null {
    const action = this.undoStack.pop();
    if (!action) return null;

    this.redoStack.push(action);
    return action;
  }

  public redo(): UndoAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    this.undoStack.push(action);
    return action;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
