import { useRef, useState } from "react";
import { Icon } from "@iconify/react";
import "./UploadPanel.css";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/bmp"];

export default function UploadPanel({ onFileSelect }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);

  function handleFile(file) {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Unsupported file type. Please upload a JPEG or PNG image.");
      return;
    }
    setError(null);
    onFileSelect(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div
      className={`upload-panel ${isDragging ? "dragging" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="Upload blood cell image"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        style={{ display: "none" }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <span className="upload-icon">
        <Icon icon="lucide:image-up" width="26" height="26" />
      </span>
      <p className="upload-title">Drop a blood cell image</p>
      <p className="upload-subtitle">or click to browse — JPEG, PNG</p>
      {error && (
        <p className="upload-error">
          <Icon icon="lucide:triangle-alert" width="14" height="14" />
          {error}
        </p>
      )}
    </div>
  );
}
