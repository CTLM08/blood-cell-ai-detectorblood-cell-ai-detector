import { CELL_TYPES } from "../../constants/cellTypes";
import "./DetectionResults.css";

/**
 * Props:
 *   cellCounts  {object}  — { RBC: 12, WBC: 3, Platelet: 7 }
 *   totalCells  {number}  — total detections
 *   title       {string}  — section heading
 *   caption     {string}  — caption after the headline number
 */
export default function DetectionResults({
  cellCounts = {},
  totalCells = 0,
  title = "Detection summary",
  caption = "cells detected",
}) {
  return (
    <div className="card detection-results">
      <h3 className="card-label">{title}</h3>

      <div className="results-total">
        <span className="results-total-num">{totalCells}</span>
        <span className="results-total-cap">{caption}</span>
      </div>

      <ul className="results-list">
        {Object.entries(CELL_TYPES).map(([key, info]) => {
          const count = cellCounts[key] ?? 0;
          const pct = totalCells > 0 ? (count / totalCells) * 100 : 0;
          return (
            <li key={key} className="result-row">
              <div className="result-head">
                <span className="result-name">
                  <span className="result-dot" style={{ background: info.colour }} />
                  {info.short}
                </span>
                <span className="result-figures">
                  <span className="result-count">{count}</span>
                  <span className="result-pct">{pct.toFixed(0)}%</span>
                </span>
              </div>
              <div className="result-bar">
                <span
                  className="result-bar-fill"
                  style={{ width: `${pct}%`, background: info.colour }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
