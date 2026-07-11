import { useEffect, useRef, useState } from "react";
import { CELL_TYPES } from "../../constants/cellTypes";
import "./ImageCanvas.css";

/**
 * Renders an image with detection bounding boxes overlaid via HTML5 Canvas.
 *
 * Props:
 *   imageFile   {File}    — the original uploaded image file
 *   detections  {Array}   — [{cell_type, confidence, box: {x,y,w,h}}, ...]
 */
export default function ImageCanvas({ imageFile, detections = [] }) {
  const imgRef    = useRef(null);
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!imageFile) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    drawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections, imageUrl]);

  function roundRect(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
  }

  function drawOverlay() {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext("2d");
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scale    = canvas.width / 640;          // normalise to a 640px reference
    const lineW    = Math.max(1.5, 2 * scale);
    const fontSize = Math.max(11, 13 * scale);
    const radius   = Math.max(3, 5 * scale);

    detections.forEach(({ cell_type, confidence, box }) => {
      const colour = CELL_TYPES[cell_type]?.colour ?? "#ffffff";
      const { x, y, w, h } = box;

      // bounding box — rounded, thin
      ctx.lineWidth   = lineW;
      ctx.strokeStyle = colour;
      ctx.beginPath();
      roundRect(ctx, x, y, w, h, radius);
      ctx.stroke();

      // label pill
      const label = `${cell_type}  ${(confidence * 100).toFixed(0)}%`;
      ctx.font = `600 ${fontSize}px ${getComputedStyle(document.body).fontFamily}`;
      const padX = 7 * scale;
      const padY = 4 * scale;
      const textW  = ctx.measureText(label).width;
      const pillW  = textW + padX * 2;
      const pillH  = fontSize + padY * 2;
      const pillX  = x - lineW / 2;
      const pillY  = y > pillH + 2 ? y - pillH - 2 * scale : y + h + 2 * scale;

      ctx.fillStyle = colour;
      ctx.beginPath();
      roundRect(ctx, pillX, pillY, pillW, pillH, radius);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(label, pillX + padX, pillY + pillH / 2 + 0.5 * scale);
    });
  }

  return (
    <div className="image-canvas-wrapper">
      {imageUrl && (
        <>
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Uploaded blood cell"
            className="base-image"
            onLoad={drawOverlay}
          />
          <canvas ref={canvasRef} className="overlay-canvas" />
        </>
      )}
    </div>
  );
}
