const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Send an image file to the backend for cell detection.
 * @param {File} file - the image File object from an <input> or drop event
 * @returns {Promise<object>} - { image_width, image_height, detections, cell_counts }
 */
export async function detectCells(file) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Server error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch the list of supported cell types and their colours from the backend.
 * @returns {Promise<Array<{name: string, colour: string}>>}
 */
export async function fetchCellTypes() {
  const response = await fetch(`${API_BASE}/cells`);
  if (!response.ok) throw new Error("Failed to fetch cell types");
  const data = await response.json();
  return data.cell_types;
}
