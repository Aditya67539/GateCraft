const undoStack = [];
const redoStack = [];


export function performCommand(command) {
  const executed = command.do();
  if (executed) {
    undoStack.push(command);
    redoStack.length = 0;
  }
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
  const executed = command.do();
  if (executed) {
    undoStack.push(command);
  }
}

export function canUndo() {
  return undoStack.length > 0;
}

export function canRedo() {
  return redoStack.length > 0;
}