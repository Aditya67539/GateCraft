import { showToast } from "../ui/toast.js";
import { instantiate, wasmInstance } from "./wasmCore.js";

/**
 * Loads and instantiates the WASM module in a browser environment.
 */
export async function initWasm() {
  if (wasmInstance) return;

  const wasmUrl = new URL("./evaluate.wasm", import.meta.url);
  const response = await fetch(wasmUrl);
  const wasmBuffer = await response.arrayBuffer();

  const ok = await instantiate(wasmBuffer);
  if (!ok) {
    showToast("Failed to load or instantiate WebAssembly", { type: "error" });
  }
}