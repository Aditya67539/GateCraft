/**
 * Lightweight toast notification system.
 *
 * Usage:
 *   import { showToast } from "./ui/toast.js";
 *   showToast("Something happened!");
 *   showToast("Saved!", { type: "success", duration: 2000 });
 *   showToast("Oops", { type: "error" });
 */

const DEFAULTS = {
  duration: 2500,  // ms before auto-dismiss
  type: "info",    // "info" | "success" | "warning" | "error"
};

let container = null;

function getContainer() {
  if (container) return container;
  container = document.createElement("div");
  container.className = "toast-container";
  document.body.appendChild(container);
  return container;
}

/**
 * Show a temporary toast notification.
 *
 * @param {string} message - Text to display
 * @param {Object} [opts] - Options
 * @param {"info"|"success"|"warning"|"error"} [opts.type="info"] - Visual style
 * @param {number} [opts.duration=2500] - Auto-dismiss delay in ms
 */
export function showToast(message, opts = {}) {
  const { duration, type } = { ...DEFAULTS, ...opts };
  const host = getContainer();

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.textContent = message;

  host.appendChild(toast);

  // Trigger entrance animation on next frame
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(), duration);

  // Allow manual dismiss on click
  toast.addEventListener("click", () => {
    clearTimeout(timer);
    dismiss();
  });

  function dismiss() {
    toast.classList.remove("toast--visible");
    toast.classList.add("toast--exit");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }
}
