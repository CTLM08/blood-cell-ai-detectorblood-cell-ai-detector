import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { CELL_TYPES } from "../../constants/cellTypes";
import { trackSocketUrl } from "../../services/api";
import CellLegend from "../CellLegend/CellLegend";
import DetectionResults from "../DetectionResults/DetectionResults";
import "./VideoTracker.css";

const TARGET_W = 800;        // frames are downscaled to this width before sending
// 800 (not 480): microscope footage packs many small cells into a frame, and at
// 480 they shrink below what the detector can resolve. Costs some fps on CPU.
const TRAIL_LEN = 16;        // points kept per motion trail
const JPEG_QUALITY = 0.6;

export default function VideoTracker() {
  const videoRef   = useRef(null);
  const captureRef = useRef(null);   // hidden canvas used to grab frames
  const overlayRef = useRef(null);   // canvas drawn over the video
  const wsRef      = useRef(null);
  const streamRef  = useRef(null);   // webcam MediaStream
  const objUrlRef  = useRef(null);   // uploaded-file object URL
  const rafRef     = useRef(null);
  const inFlight   = useRef(false);  // backpressure: one frame in flight at a time
  const trails     = useRef(new Map());
  const fileInput  = useRef(null);

  const [source, setSource]   = useState("webcam");   // "webcam" | "file"
  const [running, setRunning] = useState(false);
  const [status, setStatus]   = useState("idle");     // idle|connecting|live|stopped|error
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
      connect();
    } catch (e) {
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
    v.play().then(connect).catch(() => {
      setError("Could not play that video file.");
      setStatus("error");
    });
  }

  // ── websocket + frame loop ──────────────────────────────────────────────
  function connect() {
    setStatus("connecting");
    resetTracking();
    const ws = new WebSocket(trackSocketUrl());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "ready") {
        setRunning(true);
        setStatus("live");
        loop();
      } else if (msg.type === "result") {
        inFlight.current = false;
        setCounts(msg.unique_counts);
        draw(msg.tracks);
      } else if (msg.type === "error") {
        inFlight.current = false;   // skip the bad frame, keep going
      }
    };
    ws.onerror = () => { setError("Connection to the tracking server failed."); setStatus("error"); };
    ws.onclose = () => { if (status === "live") setStatus("stopped"); };
  }

  function loop() {
    rafRef.current = requestAnimationFrame(loop);
    const v = videoRef.current, ws = wsRef.current;
    if (!v || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (inFlight.current || v.readyState < 2 || !v.videoWidth) return;

    const cap = captureRef.current;
    const h = Math.round(TARGET_W * (v.videoHeight / v.videoWidth));
    cap.width = TARGET_W;
    cap.height = h;
    cap.getContext("2d").drawImage(v, 0, 0, TARGET_W, h);

    inFlight.current = true;
    cap.toBlob(
      (blob) => {
        if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob);
        else inFlight.current = false;
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  // ── overlay drawing ─────────────────────────────────────────────────────
  function draw(tracks) {
    const cap = captureRef.current, ov = overlayRef.current;
    if (!cap || !ov) return;
    ov.width = cap.width;
    ov.height = cap.height;
    const ctx = ov.getContext("2d");
    ctx.clearRect(0, 0, ov.width, ov.height);
    const font = getComputedStyle(document.body).fontFamily;

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
      ctx.lineWidth = 2;
      ctx.beginPath();
      arr.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // boxes + id labels
    ctx.font = `600 12px ${font}`;
    ctx.textBaseline = "middle";
    tracks.forEach((t) => {
      const colour = CELL_TYPES[t.cell_type]?.colour ?? "#fff";
      const { x, y, w, h } = t.box;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      const label = `#${t.id} ${t.cell_type}`;
      const tw = ctx.measureText(label).width;
      const pillH = 16;
      const ly = y > pillH ? y - pillH : y + h;
      ctx.fillStyle = colour;
      ctx.fillRect(x, ly, tw + 8, pillH);
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + 4, ly + pillH / 2 + 0.5);
    });
  }

  // ── lifecycle ───────────────────────────────────────────────────────────
  function resetTracking() {
    trails.current.clear();
    inFlight.current = false;
    setCounts({ RBC: 0, WBC: 0, Platelet: 0 });
  }

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
    if (wsRef.current) { try { wsRef.current.close(); } catch {} wsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (objUrlRef.current) { URL.revokeObjectURL(objUrlRef.current); objUrlRef.current = null; }
    inFlight.current = false;
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const statusText = {
    idle: "Ready", connecting: "Connecting…", live: "Tracking live",
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
          {!running && status !== "connecting" && (
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

        <canvas ref={captureRef} style={{ display: "none" }} />
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
