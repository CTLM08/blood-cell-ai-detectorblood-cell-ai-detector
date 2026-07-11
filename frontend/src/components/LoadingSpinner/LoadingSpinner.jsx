import { Icon } from "@iconify/react";
import "./LoadingSpinner.css";

export default function LoadingSpinner({ message = "Analysing cells…" }) {
  return (
    <div className="card spinner-wrapper">
      <Icon
        className="spinner-icon"
        icon="svg-spinners:90-ring-with-bg"
        width="22"
        height="22"
      />
      <p className="spinner-message">{message}</p>
    </div>
  );
}
