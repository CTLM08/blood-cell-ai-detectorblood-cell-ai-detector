import { useState } from "react";
import { Icon } from "@iconify/react";
import UploadPanel       from "./components/UploadPanel/UploadPanel";
import ImageCanvas       from "./components/ImageCanvas/ImageCanvas";
import DetectionResults  from "./components/DetectionResults/DetectionResults";
import CellLegend        from "./components/CellLegend/CellLegend";
import LoadingSpinner    from "./components/LoadingSpinner/LoadingSpinner";
import { detectCells }   from "./services/api";
import "./App.css";

export default function App() {
  const [imageFile,   setImageFile]   = useState(null);
  const [detections,  setDetections]  = useState([]);
  const [cellCounts,  setCellCounts]  = useState({});
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);
  const [hasResults,  setHasResults]  = useState(false);

  async function handleFileSelect(file) {
    setImageFile(file);
    setDetections([]);
    setCellCounts({});
    setHasResults(false);
    setError(null);
    setIsLoading(true);

    try {
      const result = await detectCells(file);
      setDetections(result.detections);
      setCellCounts(result.cell_counts);
      setHasResults(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleReset() {
    setImageFile(null);
    setDetections([]);
    setCellCounts({});
    setHasResults(false);
    setError(null);
  }

  const totalCells = Object.values(cellCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <Icon icon="lucide:microscope" width="20" height="20" />
          </span>
          <div className="brand-text">
            <h1 className="brand-title">Blood Cell Detector</h1>
            <p className="brand-sub">AI microscopy analysis</p>
          </div>
        </div>
        <a
          className="header-link"
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noreferrer"
        >
          <Icon icon="lucide:code-xml" width="15" height="15" />
          API
        </a>
      </header>

      <main className="app-main">
        <section className="left-panel">
          {!imageFile ? (
            <UploadPanel onFileSelect={handleFileSelect} />
          ) : (
            <div className="image-section">
              <div className="image-toolbar">
                <span className="image-status">
                  {isLoading ? (
                    <>
                      <Icon icon="svg-spinners:90-ring-with-bg" width="15" height="15" />
                      Analysing
                    </>
                  ) : hasResults ? (
                    <>
                      <Icon icon="lucide:circle-check" width="15" height="15" className="ok" />
                      {totalCells} cells detected
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:image" width="15" height="15" />
                      Preview
                    </>
                  )}
                </span>
                <button className="btn-ghost" onClick={handleReset}>
                  <Icon icon="lucide:rotate-ccw" width="15" height="15" />
                  New image
                </button>
              </div>
              <ImageCanvas imageFile={imageFile} detections={detections} />
            </div>
          )}

          {isLoading && !imageFile && <LoadingSpinner />}

          {error && (
            <div className="error-banner" role="alert">
              <Icon icon="lucide:triangle-alert" width="17" height="17" />
              <span>{error}</span>
            </div>
          )}
        </section>

        <aside className="right-panel">
          <CellLegend />
          {hasResults && (
            <DetectionResults cellCounts={cellCounts} totalCells={totalCells} />
          )}
          {isLoading && imageFile && <LoadingSpinner />}
        </aside>
      </main>

      <footer className="app-footer">
        <span>YOLOv8 · FastAPI · React</span>
        <span className="dot" />
        <span>RBC · WBC · Platelet detection</span>
      </footer>
    </div>
  );
}
