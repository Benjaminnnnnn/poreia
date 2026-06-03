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
      "border-green-400/25 bg-green-400/10 text-green-300/80 hover:bg-green-400/20 hover:border-green-400/40",
    pillClassName:
      "border-green-400/25 bg-green-400/10 text-green-300/80",
  },
  {
    value: "curious",
    label: "Curious",
    activeClassName:
      "border-[rgba(95,156,151,0.34)] bg-[rgba(74,149,144,0.95)] text-white",
    idleClassName:
      "border-teal-400/25 bg-teal-400/10 text-teal-300/80 hover:bg-teal-400/20 hover:border-teal-400/40",
    pillClassName:
      "border-teal-400/25 bg-teal-400/10 text-teal-300/80",
  },
  {
    value: "energized",
    label: "Energized",
    activeClassName:
      "border-[rgba(221,151,80,0.34)] bg-[rgba(226,147,64,0.95)] text-white",
    idleClassName:
      "border-orange-400/25 bg-orange-400/10 text-orange-300/80 hover:bg-orange-400/20 hover:border-orange-400/40",
    pillClassName:
      "border-orange-400/25 bg-orange-400/10 text-orange-300/80",
  },
  {
    value: "overwhelmed",
    label: "Overwhelmed",
    activeClassName:
      "border-[rgba(181,118,105,0.34)] bg-[rgba(188,112,93,0.95)] text-white",
    idleClassName:
      "border-red-400/25 bg-red-400/10 text-red-300/80 hover:bg-red-400/20 hover:border-red-400/40",
    pillClassName:
      "border-red-400/25 bg-red-400/10 text-red-300/80",
  },
  {
    value: "romantic",
    label: "Romantic",
    activeClassName:
      "border-[rgba(189,121,149,0.34)] bg-[rgba(194,115,148,0.95)] text-white",
    idleClassName:
      "border-pink-400/25 bg-pink-400/10 text-pink-300/80 hover:bg-pink-400/20 hover:border-pink-400/40",
    pillClassName:
      "border-pink-400/25 bg-pink-400/10 text-pink-300/80",
  },
  {
    value: "reflective",
    label: "Reflective",
    activeClassName:
      "border-[rgba(127,131,177,0.34)] bg-[rgba(116,124,181,0.95)] text-white",
    idleClassName:
      "border-purple-400/25 bg-purple-400/10 text-purple-300/80 hover:bg-purple-400/20 hover:border-purple-400/40",
    pillClassName:
      "border-purple-400/25 bg-purple-400/10 text-purple-300/80",
  },
] as const;

export const MOOD_OPTION_LOOKUP = new Map(
  MOOD_OPTIONS.map((option) => [option.value, option]),
);
