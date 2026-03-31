export type WorkspaceTab = "itinerary" | "notes";

export const COLORS = [
  "#e66a3f",
  "#ffbf69",
  "#4ba9a8",
  "#c85b53",
  "#f3a65d",
  "#7bb0a6",
];

export const DAY_MARKER_COLORS = [
  "#e66a3f",
  "#4ba9a8",
  "#c85b53",
  "#d49a2a",
  "#7d8fcb",
  "#7bb0a6",
];

export const DAY_CONTAINER_PATTERN = /^day-(\d+)$/;

export const MOOD_OPTIONS = [
  {
    value: "rested",
    label: "Rested",
    activeClassName:
      "border-[rgba(112,168,120,0.34)] bg-[rgba(123,176,130,0.95)] text-white",
    idleClassName:
      "border-[rgba(170,202,175,0.72)] bg-[rgba(241,248,242,0.96)] text-[rgba(70,113,76,0.92)] hover:border-[rgba(123,176,130,0.72)]",
    pillClassName:
      "border-[rgba(170,202,175,0.72)] bg-[rgba(241,248,242,0.96)] text-[rgba(70,113,76,0.92)]",
  },
  {
    value: "curious",
    label: "Curious",
    activeClassName:
      "border-[rgba(95,156,151,0.34)] bg-[rgba(74,149,144,0.95)] text-white",
    idleClassName:
      "border-[rgba(157,209,204,0.72)] bg-[rgba(236,248,247,0.96)] text-[rgba(52,112,109,0.94)] hover:border-[rgba(74,149,144,0.72)]",
    pillClassName:
      "border-[rgba(157,209,204,0.72)] bg-[rgba(236,248,247,0.96)] text-[rgba(52,112,109,0.94)]",
  },
  {
    value: "energized",
    label: "Energized",
    activeClassName:
      "border-[rgba(221,151,80,0.34)] bg-[rgba(226,147,64,0.95)] text-white",
    idleClassName:
      "border-[rgba(242,201,150,0.74)] bg-[rgba(255,245,231,0.96)] text-[rgba(159,94,29,0.94)] hover:border-[rgba(226,147,64,0.72)]",
    pillClassName:
      "border-[rgba(242,201,150,0.74)] bg-[rgba(255,245,231,0.96)] text-[rgba(159,94,29,0.94)]",
  },
  {
    value: "overwhelmed",
    label: "Overwhelmed",
    activeClassName:
      "border-[rgba(181,118,105,0.34)] bg-[rgba(188,112,93,0.95)] text-white",
    idleClassName:
      "border-[rgba(226,185,175,0.74)] bg-[rgba(252,241,238,0.96)] text-[rgba(138,81,69,0.94)] hover:border-[rgba(188,112,93,0.72)]",
    pillClassName:
      "border-[rgba(226,185,175,0.74)] bg-[rgba(252,241,238,0.96)] text-[rgba(138,81,69,0.94)]",
  },
  {
    value: "romantic",
    label: "Romantic",
    activeClassName:
      "border-[rgba(189,121,149,0.34)] bg-[rgba(194,115,148,0.95)] text-white",
    idleClassName:
      "border-[rgba(233,191,209,0.74)] bg-[rgba(253,241,246,0.96)] text-[rgba(145,79,104,0.94)] hover:border-[rgba(194,115,148,0.72)]",
    pillClassName:
      "border-[rgba(233,191,209,0.74)] bg-[rgba(253,241,246,0.96)] text-[rgba(145,79,104,0.94)]",
  },
  {
    value: "reflective",
    label: "Reflective",
    activeClassName:
      "border-[rgba(127,131,177,0.34)] bg-[rgba(116,124,181,0.95)] text-white",
    idleClassName:
      "border-[rgba(191,195,230,0.74)] bg-[rgba(241,242,252,0.96)] text-[rgba(79,86,137,0.94)] hover:border-[rgba(116,124,181,0.72)]",
    pillClassName:
      "border-[rgba(191,195,230,0.74)] bg-[rgba(241,242,252,0.96)] text-[rgba(79,86,137,0.94)]",
  },
] as const;

export const MOOD_OPTION_LOOKUP = new Map(
  MOOD_OPTIONS.map((option) => [option.value, option]),
);
