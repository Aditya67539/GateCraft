export var wasmInstance = null;
export var wasmMemory = null;

/**
 * Instantiates a WebAssembly module from raw bytes and allocates shared memory.
 *
 * This is environment-agnostic: it doesn't care whether the bytes came from
 * `fetch` (browser) or `fs.readFileSync` (Node) — that's the loader's job.
 *
 * @param {ArrayBuffer|Uint8Array} wasmBuffer - Raw bytes of the compiled WASM module.
 * @returns {Promise<boolean>} true if instantiation succeeded, false otherwise.
 */
export async function instantiate(wasmBuffer) {
  if (wasmInstance) return true;

  wasmMemory = new WebAssembly.Memory({ initial: 256, maximum: 256 }); // 16MB
  const env = { memory: wasmMemory };

  try {
    const { instance } = await WebAssembly.instantiate(wasmBuffer, { env });
    wasmInstance = instance;

    if (instance.exports._initialize) {
      instance.exports._initialize();
    }
    return true;
  } catch (error) {
    console.error("Failed to load or instantiate WebAssembly module:", error);
    return false;
  }
}