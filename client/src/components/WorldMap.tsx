import L from "leaflet";
import { Locate, Minus, Plus } from "lucide-react";
import React, {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { hasFiniteCoordinates } from "../lib/coordinates";
import { MapPinData } from "../types";
import Button from "./ui/Button";

interface WorldMapProps {
  pins: MapPinData[];
  onPinClick: (pin: MapPinData) => void;
  selectedPinId?: string;
  className?: string;
  showControls?: boolean;
}

const CLUSTER_DISTANCE_KM = 35;
const DEFAULT_PIN_COLOR = "#3f9b9a";

function hasUsableViewport(map: L.Map) {
  const container = map.getContainer();
  const width = container.clientWidth;
  const height = container.clientHeight;

  return width > 0 && height > 0;
}

function hexToRgba(color: string, alpha: number) {
  if (!color.startsWith("#")) {
    return color;
  }

  const normalized =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getDistanceInKm(first: MapPinData, second: MapPinData) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

function getPinBoundsArea(pins: MapPinData[]) {
  if (!pins.length) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudes = pins.map((pin) => pin.lat);
  const longitudes = pins.map((pin) => pin.lng);

  return (
    (Math.max(...latitudes) - Math.min(...latitudes)) *
    (Math.max(...longitudes) - Math.min(...longitudes))
  );
}

function getPrimaryPinCluster(pins: MapPinData[]) {
  if (pins.length <= 2) {
    return pins;
  }

  const visited = new Set<string>();
  const clusters: MapPinData[][] = [];

  pins.forEach((pin) => {
    if (visited.has(pin.id)) {
      return;
    }

    const cluster: MapPinData[] = [];
    const queue = [pin];
    visited.add(pin.id);

    while (queue.length) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      cluster.push(current);

      pins.forEach((candidate) => {
        if (visited.has(candidate.id)) {
          return;
        }

        if (getDistanceInKm(current, candidate) <= CLUSTER_DISTANCE_KM) {
          visited.add(candidate.id);
          queue.push(candidate);
        }
      });
    }

    clusters.push(cluster);
  });

  const [largestCluster] = [...clusters].sort((left, right) => {
    if (right.length !== left.length) {
      return right.length - left.length;
    }

    return getPinBoundsArea(left) - getPinBoundsArea(right);
  });

  if (!largestCluster || largestCluster.length === 1) {
    return pins;
  }

  return largestCluster;
}

function getPinImage(pin: MapPinData) {
  return (
    pin.image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      pin.name,
    )}&background=random&color=fff&size=64`
  );
}

function createMarkerIcon(pin: MapPinData, isSelected: boolean) {
  const pinColor = pin.dayColor || DEFAULT_PIN_COLOR;
  const pinGlow = hexToRgba(pinColor, 0.22);
  const pinBadge = hexToRgba(pinColor, 0.14);
  const pinLabel =
    pin.badgeLabel || (pin.dayNumber ? `Day ${pin.dayNumber}` : "Featured");
  const pinImage = getPinImage(pin);
  const markerValue =
    pin.markerValue || (pin.dayNumber ? String(pin.dayNumber) : null);

  return L.divIcon({
    className: "custom-pin-icon",
    html: `
      <div class="relative flex h-12 w-12 items-center justify-center group transition-all duration-300 ${isSelected ? "z-[1000] scale-110" : "z-[500]"}">
        ${isSelected ? `<div class="absolute h-14 w-14 rounded-full animate-ping opacity-75" style="background: ${pinGlow}"></div>` : ""}
        <div class="absolute h-12 w-12 rounded-full" style="background: ${pinGlow}"></div>
        <div class="absolute bottom-full left-1/2 mb-3 flex w-48 origin-bottom -translate-x-1/2 scale-95 items-center gap-3 rounded-2xl border border-white/70 p-2 opacity-0 shadow-xl transition-opacity duration-200 group-hover:scale-100 group-hover:opacity-100 pointer-events-none z-[1000] ${isSelected ? "opacity-100" : ""}" style="background: rgba(255, 250, 244, 0.96)">
          <img src="${pinImage}" class="h-8 w-8 shrink-0 rounded-lg bg-slate-100 object-cover" alt="${pin.name}" />
          <div class="flex flex-col overflow-hidden text-left">
            <span class="mb-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.16em] leading-none" style="background: ${pinBadge}; color: ${pinColor}">${pinLabel}</span>
            <span class="w-full truncate text-[0.875rem] font-bold leading-[1.2]" style="color: rgba(72, 42, 27, 0.96)">${pin.name}</span>
            <span class="w-full truncate text-[0.75rem] leading-[1.35]" style="color: rgba(116, 79, 56, 0.76)">${pin.description}</span>
          </div>
          <div class="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white"></div>
        </div>
        <div class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${isSelected ? "scale-110 ring-2 ring-white/75" : ""}" style="background: ${pinColor}">
          <div class="absolute inset-[5px] rounded-full border border-white/25"></div>
          ${
            markerValue
              ? `<span class="relative text-[11px] font-black leading-none text-white">${markerValue}</span>`
              : '<div class="relative h-3 w-3 rounded-full bg-white"></div>'
          }
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function shouldRefreshMarker(nextPin: MapPinData, previousPin?: MapPinData) {
  if (!previousPin) {
    return true;
  }

  return (
    previousPin.lat !== nextPin.lat ||
    previousPin.lng !== nextPin.lng ||
    previousPin.name !== nextPin.name ||
    previousPin.description !== nextPin.description ||
    previousPin.dayNumber !== nextPin.dayNumber ||
    previousPin.dayColor !== nextPin.dayColor ||
    previousPin.image !== nextPin.image ||
    previousPin.badgeLabel !== nextPin.badgeLabel ||
    previousPin.markerValue !== nextPin.markerValue
  );
}

const WorldMap: React.FC<WorldMapProps> = ({
  pins,
  onPinClick,
  selectedPinId,
  className = "w-full h-full",
  showControls = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const markerPinsRef = useRef<Record<string, MapPinData>>({});
  const previousSelectedPinIdRef = useRef<string | undefined>(selectedPinId);
  const selectedPinIdRef = useRef<string | undefined>(selectedPinId);
  const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);
  const userPulseRef = useRef<L.Layer | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const validPins = useMemo(
    () => pins.filter((pin) => hasFiniteCoordinates(pin)),
    [pins],
  );
  const pinViewportKey = useMemo(
    () =>
      validPins
        .map((pin) => `${pin.id}:${pin.lat.toFixed(4)}:${pin.lng.toFixed(4)}`)
        .sort()
        .join("|"),
    [validPins],
  );
  const pinLookup = useMemo(
    () => new Map(validPins.map((pin) => [pin.id, pin])),
    [validPins],
  );

  const handleMarkerClick = useEffectEvent((pinId: string) => {
    const pin = pinLookup.get(pinId);
    if (pin) {
      onPinClick(pin);
    }
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2.5,
      zoomControl: false,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);

    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      setIsMapReady(false);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isMapReady || !mapContainerRef.current || !mapInstanceRef.current) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });

    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, [isMapReady]);

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) {
      return;
    }

    const map = mapInstanceRef.current;
    const nextPinIds = new Set(validPins.map((pin) => pin.id));

    Object.keys(markersRef.current).forEach((pinId) => {
      if (nextPinIds.has(pinId)) {
        return;
      }

      markersRef.current[pinId].remove();
      delete markersRef.current[pinId];
      delete markerPinsRef.current[pinId];
    });

    validPins.forEach((pin) => {
      const marker = markersRef.current[pin.id];
      const previousPin = markerPinsRef.current[pin.id];

      if (!marker) {
        const nextMarker = L.marker([pin.lat, pin.lng], {
          icon: createMarkerIcon(pin, selectedPinIdRef.current === pin.id),
        })
          .addTo(map)
          .on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            handleMarkerClick(pin.id);
          });

        markersRef.current[pin.id] = nextMarker;
        markerPinsRef.current[pin.id] = pin;
        return;
      }

      if (!shouldRefreshMarker(pin, previousPin)) {
        return;
      }

      marker.setLatLng([pin.lat, pin.lng]);
      marker.setIcon(
        createMarkerIcon(pin, selectedPinIdRef.current === pin.id),
      );
      markerPinsRef.current[pin.id] = pin;
    });
  }, [handleMarkerClick, isMapReady, validPins]);

  useEffect(() => {
    const previousSelectedPinId = previousSelectedPinIdRef.current;
    selectedPinIdRef.current = selectedPinId;

    if (previousSelectedPinId && previousSelectedPinId !== selectedPinId) {
      const previousMarker = markersRef.current[previousSelectedPinId];
      const previousPin = markerPinsRef.current[previousSelectedPinId];
      if (previousMarker && previousPin) {
        previousMarker.setIcon(createMarkerIcon(previousPin, false));
      }
    }

    if (selectedPinId) {
      const selectedMarker = markersRef.current[selectedPinId];
      const selectedPin = markerPinsRef.current[selectedPinId];
      if (selectedMarker && selectedPin) {
        selectedMarker.setIcon(createMarkerIcon(selectedPin, true));
      }
    }

    previousSelectedPinIdRef.current = selectedPinId;
  }, [selectedPinId]);

  useEffect(() => {
    if (!mapInstanceRef.current || !validPins.length || selectedPinId) {
      return;
    }

    const map = mapInstanceRef.current;
    let frameId = 0;

    const syncViewport = () => {
      if (!hasUsableViewport(map)) {
        frameId = window.requestAnimationFrame(syncViewport);
        return;
      }

      map.invalidateSize(false);

      const primaryPins = getPrimaryPinCluster(validPins);

      if (primaryPins.length === 1) {
        map.flyTo([primaryPins[0].lat, primaryPins[0].lng], 12, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
        return;
      }

      const bounds = L.latLngBounds(
        primaryPins.map((pin) => [pin.lat, pin.lng] as [number, number]),
      );
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      if (southWest.lat === northEast.lat && southWest.lng === northEast.lng) {
        map.flyTo([southWest.lat, southWest.lng], 12, {
          duration: 1.2,
          easeLinearity: 0.25,
        });
        return;
      }

      map.flyToBounds(bounds.pad(0.28), {
        duration: 1.2,
        easeLinearity: 0.25,
        maxZoom: 13,
      });
    };

    frameId = window.requestAnimationFrame(syncViewport);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pinViewportKey, selectedPinId, validPins]);

  useEffect(() => {
    if (!isMapReady || !selectedPinId || !mapInstanceRef.current) {
      return;
    }

    const pin = pinLookup.get(selectedPinId);
    if (!pin) {
      return;
    }

    const map = mapInstanceRef.current;
    let frameId = 0;

    const focusPin = () => {
      if (!hasUsableViewport(map)) {
        frameId = window.requestAnimationFrame(focusPin);
        return;
      }

      map.invalidateSize(false);
      map.flyTo([pin.lat, pin.lng], 13, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    };

    frameId = window.requestAnimationFrame(focusPin);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isMapReady, pinLookup, selectedPinId]);

  const handleLocateMe = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 12, {
            duration: 2,
            easeLinearity: 0.25,
          });

          userLocationMarkerRef.current?.remove();
          if (userPulseRef.current) {
            mapInstanceRef.current.removeLayer(userPulseRef.current);
          }

          userPulseRef.current = L.circle([latitude, longitude], {
            radius: 2000,
            color: "#e66a3f",
            weight: 1,
            fillColor: "#e66a3f",
            fillOpacity: 0.1,
            className: "animate-pulse",
          }).addTo(mapInstanceRef.current);

          userLocationMarkerRef.current = L.circleMarker(
            [latitude, longitude],
            {
              radius: 8,
              fillColor: "#e66a3f",
              color: "#fff",
              weight: 3,
              opacity: 1,
              fillOpacity: 1,
            },
          ).addTo(mapInstanceRef.current);
        }

        setIsLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        alert(
          "Unable to retrieve your location. Please ensure location permissions are enabled.",
        );
        setIsLocating(false);
      },
    );
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        className="z-0 h-full w-full bg-[#e7dbc2] outline-none"
      />

      {showControls ? (
        <div className="absolute bottom-4 right-3 z-[400] flex flex-col gap-2.5 md:bottom-12 md:right-4 md:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleLocateMe}
            disabled={isLocating}
            aria-label="Locate me"
            className="rounded-2xl border-white/60 bg-[rgba(255,250,245,0.88)] text-[rgba(102,70,49,0.88)] hover:bg-white hover:text-[rgba(217,102,58,0.92)]"
            title="Locate Me"
          >
            <Locate
              size={18}
              className={
                isLocating
                  ? "animate-pulse text-[rgba(217,102,58,0.92)] md:h-5 md:w-5"
                  : "md:h-5 md:w-5"
              }
            />
          </Button>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,250,245,0.88)] shadow-lg shadow-[rgba(118,75,39,0.1)] backdrop-blur-xl">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => mapInstanceRef.current?.zoomIn()}
              aria-label="Zoom in"
              className="rounded-none text-[rgba(102,70,49,0.88)] hover:bg-[rgba(255,236,208,0.8)] hover:text-[rgba(217,102,58,0.92)]"
              title="Zoom In"
            >
              <Plus size={18} className="md:h-5 md:w-5" />
            </Button>
            <div className="h-[1px] w-full bg-[rgba(221,197,173,0.56)]" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => mapInstanceRef.current?.zoomOut()}
              aria-label="Zoom out"
              className="rounded-none text-[rgba(102,70,49,0.88)] hover:bg-[rgba(225,242,237,0.82)] hover:text-[rgba(42,140,142,0.92)]"
              title="Zoom Out"
            >
              <Minus size={18} className="md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 right-0 z-[400] select-none rounded-tl-xl bg-[rgba(255,250,245,0.76)] px-2 py-1 text-[0.5625rem] text-[rgba(116,79,56,0.74)] backdrop-blur-sm md:text-[10px]">
        &copy;{" "}
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-[rgba(42,140,142,0.92)] hover:underline"
        >
          OpenStreetMap
        </a>{" "}
        &copy;{" "}
        <a
          href="https://carto.com/attributions"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto text-[rgba(217,102,58,0.92)] hover:underline"
        >
          CARTO
        </a>
      </div>
    </div>
  );
};

export default WorldMap;
