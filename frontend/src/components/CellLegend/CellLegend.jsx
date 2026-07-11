import { CELL_TYPES } from "../../constants/cellTypes";
import "./CellLegend.css";

export default function CellLegend() {
  return (
    <div className="card cell-legend">
      <h3 className="card-label">Cell types</h3>
      <ul className="legend-list">
        {Object.values(CELL_TYPES).map((cell) => (
          <li key={cell.short} className="legend-item">
            <span className="legend-dot" style={{ background: cell.colour }} />
            <span className="legend-short">{cell.short}</span>
            <span className="legend-label">{cell.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
