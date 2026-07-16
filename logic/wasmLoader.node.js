import fs from "fs";
import { instantiate, wasmInstance } from "./wasmCore.js";

/**
 * Loads and instantiates the WASM module in a Node/test environment.
 */
export async function initWasm() {
  if (wasmInstance) return;

  const wasmUrl = new URL("./evaluate.wasm", import.meta.url);
  const wasmBuffer = fs.readFileSync(wasmUrl);

  const ok = await instantiate(wasmBuffer);
  if (!ok) {
    console.error("Failed to load or instantiate WebAssembly module");
  }
}