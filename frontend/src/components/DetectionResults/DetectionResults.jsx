import { CELL_TYPES } from "../../constants/cellTypes";
import "./DetectionResults.css";

/**
 * Props:
 *   cellCounts  {object}  — { RBC: 12, WBC: 3, Platelet: 7 }
 *   totalCells  {number}  — total detections
 */
export default function DetectionResults({ cellCounts = {}, totalCells = 0 }) {
  return (
    <div className="detection-results">
      <h3 className="results-title">Detection Summary</h3>
      <p className="results-total">
        Total cells detected: <strong>{totalCells}</strong>
      </p>
      <table className="results-table">
        <thead>
          <tr>
            <th>Cell Type</th>
            <th>Count</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(CELL_TYPES).map(([key, info]) => {
            const count = cellCounts[key] ?? 0;
            const pct = totalCells > 0
              ? ((count / totalCells) * 100).toFixed(1)
              : "0.0";
            return (
              <tr key={key}>
                <td>
                  <span
                    className="cell-dot"
                    style={{ backgroundColor: info.colour }}
                  />
                  {info.short}
                </td>
                <td>{count}</td>
                <td>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
