const undoStack = [];
const redoStack = [];


export function performCommand(command) {
  command.do();
  undoStack.push(command);
  redoStack.length = 0;
}

export function undo() {
  if (undoStack.length === 0) return;

  const command = undoStack.pop();
  command.undo();
  redoStack.push(command);
}

export function redo() {
  if (redoStack.length === 0) return;

  const command = redoStack.pop();
  command.do();
  undoStack.push(command);
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}