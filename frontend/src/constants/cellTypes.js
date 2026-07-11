// Cell type definitions — add new entries here to extend in Phase 2.
// Colours are used both for the legend and the canvas bounding boxes,
// chosen as three distinct hues that read clearly over stained smears.
export const CELL_TYPES = {
  RBC: {
    label:  "Red Blood Cell",
    short:  "RBC",
    colour: "#f43f5e",   // rose
  },
  WBC: {
    label:  "White Blood Cell",
    short:  "WBC",
    colour: "#10b981",   // emerald
  },
  Platelet: {
    label:  "Platelet",
    short:  "Platelet",
    colour: "#f59e0b",   // amber
  },
};

export const CELL_TYPE_KEYS = Object.keys(CELL_TYPES);
