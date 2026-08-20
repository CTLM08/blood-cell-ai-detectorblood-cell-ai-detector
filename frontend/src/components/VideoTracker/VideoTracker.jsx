import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { CELL_TYPES } from "../../constants/cellTypes";
import { detect, loadDetector } from "../../services/detector";
import { Tracker } from "../../services/tracker";
import CellLegend from "../CellLegend/CellLegend";
import DetectionResults from "../DetectionResults/DetectionResults";
import "./VideoTracker.css";

const TRAIL_LEN = 16; // points kept per motion trail

export default function VideoTracker() {
  const videoRef   = useRef(null);
  const overlayRef = useRef(null);   // canvas drawn over the video
  const streamRef  = useRef(null);   // webcam MediaStream
  const objUrlRef  = useRef(null);   // uploaded-file object URL
  const rafRef     = useRef(null);
  const inFlight   = useRef(false);  // backpressure: one inference at a time
  const trails     = useRef(new Map());
  const trackerRef = useRef(new Tracker());
  const fileInput  = useRef(null);

  const [source, setSource]   = useState("webcam");   // "webcam" | "file"
  const [running, setRunning] = useState(false);
  const [status, setStatus]   = useState("idle");     // idle|loading|live|stopped|error
  const [error, setError]     = useState(null);
  const [counts, setCounts]   = useState({ RBC: 0, WBC: 0, Platelet: 0 });

  useEffect(() => () => teardown(), []);   // cleanup on unmount

  // ── source setup ────────────────────────────────────────────────────────
  async function startWebcam() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await v.play();
      begin();
    } catch {
      setError("Could not access the webcam. Check browser permissions.");
      setStatus("error");
    }
  }

  function startFile(file) {
    setError(null);
    if (!file || !file.type.startsWith("video/")) {
      setError("Please choose a video file (mp4, mov, webm).");
      return;
    }
    const url = URL.createObjectURL(file);
    objUrlRef.current = url;
    const v = videoRef.current;
    v.srcObject = null;
    v.src = url;
    v.loop = true;
    v.play().then(begin).catch(() => {
      setError("Could not play that video file.");
      setStatus("error");
    });
  }

  // ── local inference loop ─────────────────────────────────────────────────
  async function begin() {
    setStatus("loading");
    trackerRef.current.reset();
    trails.current.clear();
    inFlight.current = false;
    setCounts({ RBC: 0, WBC: 0, Platelet: 0 });
    try {
      await loadDetector();          // download + compile the model once
    } catch {
      setError("Could not load the detection model.");
      setStatus("error");
      return;
    }
    setRunning(true);
    setStatus("live");
    loop();
  }

  function loop() {
    rafRef.current = requestAnimationFrame(loop);
    const v = videoRef.current;
    if (!v || inFlight.current || v.readyState < 2 || !v.videoWidth) return;

    inFlight.current = true;
    detect(v, v.videoWidth, v.videoHeight)
      .then(({ detections }) => {
        const { tracks, unique_counts } = trackerRef.current.update(detections);
        setCounts(unique_counts);
        draw(tracks, v.videoWidth, v.videoHeight);
      })
      .catch(() => {})
      .finally(() => { inFlight.current = false; });
  }

  // ── overlay drawing ─────────────────────────────────────────────────────
  function draw(tracks, vw, vh) {
    const ov = overlayRef.current;
    if (!ov) return;
    ov.width = vw;
    ov.height = vh;
    const ctx = ov.getContext("2d");
    ctx.clearRect(0, 0, ov.width, ov.height);
    const font = getComputedStyle(document.body).fontFamily;
    const scale = vw / 640;
    const lineW = Math.max(1.5, 2 * scale);
    const fontSize = Math.max(11, 13 * scale);

    // update + draw trails (under the boxes)
    tracks.forEach((t) => {
      const cx = t.box.x + t.box.w / 2, cy = t.box.y + t.box.h / 2;
      const arr = trails.current.get(t.id) || [];
      arr.push([cx, cy]);
      if (arr.length > TRAIL_LEN) arr.shift();
      trails.current.set(t.id, arr);
    });
    tracks.forEach((t) => {
      const arr = trails.current.get(t.id);
      if (!arr || arr.length < 2) return;
      ctx.strokeStyle = CELL_TYPES[t.cell_type]?.colour ?? "#fff";
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = lineW;
      ctx.beginPath();
      arr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // boxes + id labels
    ctx.font = `600 ${fontSize}px ${font}`;
    ctx.textBaseline = "middle";
    tracks.forEach((t) => {
      const colour = CELL_TYPES[t.cell_type]?.colour ?? "#fff";
      const { x, y, w, h } = t.box;
      ctx.strokeStyle = colour;
      ctx.lineWidth = lineW;
      ctx.strokeRect(x, y, w, h);

      const label = `#${t.id} ${t.cell_type}`;
      const tw = ctx.measureText(label).width;
      const pillH = fontSize + 5;
      const ly = y > pillH ? y - pillH : y + h;
      ctx.fillStyle = colour;
      ctx.fillRect(x, ly, tw + 8, pillH);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, ly + pillH / 2 + 0.5);
    });
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  function start() {
    if (source === "webcam") startWebcam();
    else fileInput.current?.click();
  }

  function stop() {
    setRunning(false);
    setStatus("stopped");
    teardown();
  }

  function teardown() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
    inFlight.current = false;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const statusText = {
    idle: "Ready", loading: "Loading model…", live: "Tracking live",
    stopped: "Stopped", error: "Error",
  }[status];

  return (
    <div className="layout">
      <section className="video-main">
        <div className="video-controls">
          <div className="seg">
            <button
              className={`seg-btn ${source === "webcam" ? "on" : ""}`}
              onClick={() => !running && setSource("webcam")}
              disabled={running}
            >
              <Icon icon="lucide:video" width="15" height="15" /> Webcam
            </button>
            <button
              className={`seg-btn ${source === "file" ? "on" : ""}`}
              onClick={() => !running && setSource("file")}
              disabled={running}
            >
              <Icon icon="lucide:file-video" width="15" height="15" /> Upload
            </button>
          </div>

          {!running ? (
            <button className="btn-accent" onClick={start}>
              <Icon icon="lucide:play" width="15" height="15" /> Start
            </button>
          ) : (
            <button className="btn-ghost" onClick={stop}>
              <Icon icon="lucide:square" width="14" height="14" /> Stop
            </button>
          )}

          <span className={`live-badge ${status}`}>
            {status === "live" && <span className="pulse" />}
            {statusText}
          </span>
        </div>

        <div className="video-stage">
          <video ref={videoRef} className="video-el" muted playsInline />
          <canvas ref={overlayRef} className="video-overlay" />
          {!running && status !== "loading" && (
            <div className="video-placeholder">
              <Icon icon="lucide:scan-eye" width="30" height="30" />
              <p>{source === "webcam" ? "Start to track cells from your webcam" : "Start, then choose a video file"}</p>
            </div>
          )}
          {error && (
            <div className="video-error">
              <Icon icon="lucide:triangle-alert" width="16" height="16" /> {error}
            </div>
          )}
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="video/*"
          style={{ display: "none" }}
          onChange={(e) => startFile(e.target.files[0])}
        />
      </section>

      <aside className="video-side">
        <CellLegend />
        <DetectionResults
          cellCounts={counts}
          totalCells={total}
          title="Tracking summary"
          caption="unique cells"
        />
      </aside>
    </div>
  );
}
