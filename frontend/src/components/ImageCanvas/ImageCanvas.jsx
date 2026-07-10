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

  // Create an object URL for the file and revoke it when the file changes / unmounts.
  useEffect(() => {
    if (!imageFile) {
      setImageUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Draw boxes whenever detections or the image change (once the image has loaded).
  useEffect(() => {
    drawOverlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detections, imageUrl]);

  function drawOverlay() {
    const img    = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !img.complete || !img.naturalWidth) return;

    const ctx = canvas.getContext("2d");
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(({ cell_type, confidence, box }) => {
      const colour = CELL_TYPES[cell_type]?.colour ?? "#ffffff";
      const { x, y, w, h } = box;

      // Bounding box rectangle
      ctx.strokeStyle = colour;
      ctx.lineWidth   = Math.max(2, canvas.width / 200);
      ctx.strokeRect(x, y, w, h);

      // Label background
      const label    = `${cell_type} ${(confidence * 100).toFixed(0)}%`;
      const fontSize = Math.max(11, canvas.width / 50);
      ctx.font       = `bold ${fontSize}px 'Segoe UI', sans-serif`;
      const textW    = ctx.measureText(label).width;
      const padX = 5, padY = 4;
      const labelH = fontSize + padY * 2;
      const labelY = y > labelH ? y - labelH : y + h;

      ctx.fillStyle = colour;
      ctx.fillRect(x - 1, labelY, textW + padX * 2, labelH);

      // Label text
      ctx.fillStyle = "#000000";
      ctx.fillText(label, x + padX - 1, labelY + fontSize);
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
