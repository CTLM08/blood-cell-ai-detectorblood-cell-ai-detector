import { useState } from "react";
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
        <h1 className="app-title">🔬 Blood Cell AI Detector</h1>
        <p className="app-subtitle">
          Upload a microscope image — AI will detect and label every cell
        </p>
      </header>

      <main className="app-main">
        {/* Left panel */}
        <section className="left-panel">
          {!imageFile ? (
            <UploadPanel onFileSelect={handleFileSelect} />
          ) : (
            <div className="image-section">
              <ImageCanvas imageFile={imageFile} detections={detections} />
              <button className="reset-btn" onClick={handleReset}>
                ↩ Upload another image
              </button>
            </div>
          )}

          {isLoading && <LoadingSpinner />}

          {error && (
            <div className="error-banner" role="alert">
              ⚠️ {error}
            </div>
          )}
        </section>

        {/* Right panel */}
        <aside className="right-panel">
          <CellLegend />
          {hasResults && (
            <DetectionResults
              cellCounts={cellCounts}
              totalCells={totalCells}
            />
          )}
        </aside>
      </main>
    </div>
  );
}
