// Lightweight greedy IoU tracker — the in-browser replacement for the backend's
// ByteTrack. Assigns each cell a persistent ID across frames so we count unique
// cells (not the same cell every frame).

const CELL_TYPES = ["RBC", "WBC", "Platelet"];

function toXYXY(b) {
  return [b.x, b.y, b.x + b.w, b.y + b.h];
}

function iou(a, b) {
  const A = toXYXY(a), B = toXYXY(b);
  const x1 = Math.max(A[0], B[0]), y1 = Math.max(A[1], B[1]);
  const x2 = Math.min(A[2], B[2]), y2 = Math.min(A[3], B[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = a.w * a.h, areaB = b.w * b.h;
  return inter / (areaA + areaB - inter + 1e-9);
}

export class Tracker {
  constructor(iouThreshold = 0.3, maxMissed = 15) {
    this.iouThreshold = iouThreshold;
    this.maxMissed = maxMissed;
    this.nextId = 1;
    this.tracks = [];               // {id, box, cell, missed}
    this.seen = {};                 // cell -> Set of ids
    for (const c of CELL_TYPES) this.seen[c] = new Set();
  }

  reset() {
    this.nextId = 1;
    this.tracks = [];
    for (const c of CELL_TYPES) this.seen[c].clear();
  }

  /** detections: [{cell_type, confidence, box:{x,y,w,h}}] -> {tracks, unique_counts} */
  update(detections) {
    const matched = new Array(this.tracks.length).fill(false);
    const out = [];

    for (const det of detections) {
      let best = -1, bestIoU = this.iouThreshold;
      for (let t = 0; t < this.tracks.length; t++) {
        if (matched[t] || this.tracks[t].cell !== det.cell_type) continue;
        const v = iou(this.tracks[t].box, det.box);
        if (v > bestIoU) { bestIoU = v; best = t; }
      }
      let id;
      if (best >= 0) {
        matched[best] = true;
        this.tracks[best].box = det.box;
        this.tracks[best].missed = 0;
        id = this.tracks[best].id;
      } else {
        id = this.nextId++;
        this.tracks.push({ id, box: det.box, cell: det.cell_type, missed: 0 });
        matched.push(true);
      }
      this.seen[det.cell_type].add(id);
      out.push({ ...det, id });
    }

    // age unmatched tracks; drop the stale ones
    this.tracks = this.tracks.filter((tr, idx) => {
      if (!matched[idx]) tr.missed += 1;
      return tr.missed <= this.maxMissed;
    });

    const unique_counts = {};
    for (const c of CELL_TYPES) unique_counts[c] = this.seen[c].size;
    return { tracks: out, unique_counts };
  }
}
