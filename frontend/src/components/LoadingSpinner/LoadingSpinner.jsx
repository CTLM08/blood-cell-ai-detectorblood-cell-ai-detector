import "./LoadingSpinner.css";

export default function LoadingSpinner({ message = "Analysing cells..." }) {
  return (
    <div className="spinner-wrapper">
      <div className="spinner" aria-label="loading" />
      <p className="spinner-message">{message}</p>
    </div>
  );
}
