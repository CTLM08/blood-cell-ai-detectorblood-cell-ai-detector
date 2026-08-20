// In-browser YOLOv8 inference with onnxruntime-web.
// Ports the verified Python pipeline: letterbox -> infer -> decode -> NMS.
// Runs entirely on the visitor's device — no backend needed.
// Use the CPU "wasm" build (smaller — 13 MB — no WebGPU/jsep).
import * as ort from "onnxruntime-web/wasm";

// Self-host the WASM runtime from /ort/ (same origin) — no external CDN, so it
// works reliably anywhere. Single-threaded so it needs no cross-origin isolation.
ort.env.wasm.wasmPaths = import.meta.env.BASE_URL + "ort/";
ort.env.wasm.numThreads = 1;

const MODEL_URL = import.meta.env.BASE_URL + "best.onnx";
const SIZE = 640;
const CONF_THRESHOLD = 0.4;
const IOU_THRESHOLD = 0.5;

// ONNX class index order (from the trained model's names dict).
const CLASS_NAMES = ["Platelets", "RBC", "WBC"];
// Fold to the app's canonical cell types.
const CANONICAL = { Platelets: "Platelet", RBC: "RBC", WBC: "WBC" };

let sessionPromise = null;
let lbCanvas = null;

export function loadDetector() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
    });
  }
  return sessionPromise;
}

function letterboxToTensor(source, sw, sh) {
  const r = Math.min(SIZE / sw, SIZE / sh);
  const nw = Math.round(sw * r);
  const nh = Math.round(sh * r);
  const left = Math.floor((SIZE - nw) / 2);
  const top = Math.floor((SIZE - nh) / 2);

  if (!lbCanvas) {
    lbCanvas = document.createElement("canvas");
    lbCanvas.width = SIZE;
    lbCanvas.height = SIZE;
  }
  const ctx = lbCanvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "rgb(114,114,114)";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(source, 0, 0, sw, sh, left, top, nw, nh);

  const { data } = ctx.getImageData(0, 0, SIZE, SIZE); // RGBA
  const area = SIZE * SIZE;
  const f = new Float32Array(3 * area);
  for (let i = 0; i < area; i++) {
    f[i]            = data[i * 4]     / 255; // R plane
    f[area + i]     = data[i * 4 + 1] / 255; // G plane
    f[2 * area + i] = data[i * 4 + 2] / 255; // B plane
  }
  return { tensor: new ort.Tensor("float32", f, [1, 3, SIZE, SIZE]), r, left, top };
}

function decode(output, r, left, top) {
  const [, ch, n] = output.dims; // [1, 7, 8400]
  const d = output.data;
  const boxes = [], scores = [], classes = [];
  for (let i = 0; i < n; i++) {
    let best = -1, bestScore = 0;
    for (let c = 4; c < ch; c++) {
      const s = d[c * n + i];
      if (s > bestScore) { bestScore = s; best = c - 4; }
    }
    if (bestScore < CONF_THRESHOLD) continue;
    const cx = d[i], cy = d[n + i], w = d[2 * n + i], h = d[3 * n + i];
    boxes.push([
      (cx - w / 2 - left) / r,
      (cy - h / 2 - top) / r,
      (cx + w / 2 - left) / r,
      (cy + h / 2 - top) / r,
    ]);
    scores.push(bestScore);
    classes.push(best);
  }
  return { boxes, scores, classes };
}

function iou(a, b) {
  const x1 = Math.max(a[0], b[0]), y1 = Math.max(a[1], b[1]);
  const x2 = Math.min(a[2], b[2]), y2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = (a[2] - a[0]) * (a[3] - a[1]);
  const areaB = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (areaA + areaB - inter + 1e-9);
}

function nms(boxes, scores, iouThr) {
  const idxs = scores.map((_, i) => i).sort((x, y) => scores[y] - scores[x]);
  const keep = [];
  const removed = new Array(idxs.length).fill(false);
  for (let a = 0; a < idxs.length; a++) {
    if (removed[a]) continue;
    keep.push(idxs[a]);
    for (let b = a + 1; b < idxs.length; b++) {
      if (!removed[b] && iou(boxes[idxs[a]], boxes[idxs[b]]) >= iouThr) removed[b] = true;
    }
  }
  return keep;
}

/**
 * Run detection on an image source (HTMLImageElement, ImageBitmap, canvas, or video).
 * Returns the same shape the old backend produced.
 */
export async function detect(source, sw, sh) {
  const session = await loadDetector();
  const { tensor, r, left, top } = letterboxToTensor(source, sw, sh);
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  const output = outputs[session.outputNames[0]];
  const { boxes, scores, classes } = decode(output, r, left, top);
  const keep = nms(boxes, scores, IOU_THRESHOLD);

  const detections = [];
  const cell_counts = { RBC: 0, WBC: 0, Platelet: 0 };
  for (const i of keep) {
    const cell = CANONICAL[CLASS_NAMES[classes[i]]];
    if (!cell) continue;
    const [x1, y1, x2, y2] = boxes[i];
    detections.push({
      cell_type: cell,
      confidence: scores[i],
      box: { x: Math.round(x1), y: Math.round(y1), w: Math.round(x2 - x1), h: Math.round(y2 - y1) },
    });
    cell_counts[cell] += 1;
  }
  return { detections, cell_counts, image_width: sw, image_height: sh };
}

/** Detect from an uploaded File (used by the Image tab). */
export async function detectFile(file) {
  const bitmap = await createImageBitmap(file);
  const result = await detect(bitmap, bitmap.width, bitmap.height);
  bitmap.close?.();
  return result;
}
