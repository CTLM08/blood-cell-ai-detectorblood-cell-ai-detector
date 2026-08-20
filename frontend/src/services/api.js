// The app now runs the model in the browser (see services/detector.js), so
// there is no backend to call. These wrappers keep the old function names/shape
// used by the components.
import { detectFile, loadDetector } from "./detector";

/**
 * Detect cells in an uploaded image File — runs the ONNX model in the browser.
 * @param {File} file
 * @returns {Promise<{image_width:number, image_height:number, detections:Array, cell_counts:object}>}
 */
export async function detectCells(file) {
  return detectFile(file);
}

/** Kick off model download/compile early (e.g. on app load) so the first
 *  detection isn't slow. Safe to call multiple times. */
export function warmUp() {
  return loadDetector();
}
