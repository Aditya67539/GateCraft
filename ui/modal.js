export function createModal({ overlay, focusElement, onConfirm, onCancel, onOpen, onClose }) {
  function open() {
    overlay.classList.add("open");
    focusElement?.focus();
    onOpen?.();
  }

  function close() {
    overlay.classList.remove("open");
    onClose?.();
  }

  function confirm(...args) {
    const result = onConfirm?.(...args);
    if (result !== false) close();
  }

  function cancel(...args) {
    onCancel(...args);
    close();
  }

  overlay.addEventListener("click", e => {
    if (e.target === overlay) close();
  });

  return { open, close, confirm, cancel };
}