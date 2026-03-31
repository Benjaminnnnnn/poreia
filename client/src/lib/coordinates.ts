export function toFiniteCoordinate(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

export function hasFiniteCoordinates(value: {
  lat?: unknown;
  lng?: unknown;
}): value is { lat: number; lng: number } {
  return (
    typeof value.lat === "number" &&
    Number.isFinite(value.lat) &&
    typeof value.lng === "number" &&
    Number.isFinite(value.lng)
  );
}
