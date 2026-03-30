
import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPinData } from '../types';
import { Locate, Plus, Minus } from 'lucide-react';

interface WorldMapProps {
  pins: MapPinData[];
  onPinClick: (pin: MapPinData) => void;
  selectedPinId?: string;
  className?: string;
  showControls?: boolean;
}

function hexToRgba(color: string, alpha: number) {
  if (!color.startsWith('#')) {
    return color;
  }

  const normalized = color.length === 4
    ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
    : color;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const CLUSTER_DISTANCE_KM = 35;

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

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function getPinBoundsArea(pins: MapPinData[]) {
  if (!pins.length) {
    return Number.POSITIVE_INFINITY;
  }

  const latitudes = pins.map((pin) => pin.lat);
  const longitudes = pins.map((pin) => pin.lng);

  return (Math.max(...latitudes) - Math.min(...latitudes)) * (Math.max(...longitudes) - Math.min(...longitudes));
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

const WorldMap: React.FC<WorldMapProps> = ({ pins, onPinClick, selectedPinId, className = "w-full h-full", showControls = true }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);
  const userPulseRef = useRef<L.Layer | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const pinViewportKey = useMemo(
    () =>
      pins
        .map((pin) => `${pin.id}:${pin.lat.toFixed(4)}:${pin.lng.toFixed(4)}`)
        .sort()
        .join('|'),
    [pins],
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Prevent double initialization
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 0],
      zoom: 2.5,
      zoomControl: false, // We will use custom zoom buttons
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true, // Allows smooth panning across the date line
      attributionControl: false // We will add a custom styled one
    });

    // CartoDB Voyager
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Resize
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Handle Pins
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker: L.Marker) => marker.remove());
    markersRef.current = {};

    // If no pins, just return
    if (!pins.length) return;

    // Fit bounds if pins change drastically (optional, but nice for itinerary view)
    // For now, we only fit bounds if it's the first load or explicitly requested. 
    // To keep it simple, we rely on selectedPinId for navigation.

    pins.forEach(pin => {
      const isSelected = selectedPinId === pin.id;
      const pinColor = pin.dayColor || '#3f9b9a';
      const pinGlow = hexToRgba(pinColor, 0.22);
      const pinBadge = hexToRgba(pinColor, 0.14);
      const pinLabel = pin.dayNumber ? `Day ${pin.dayNumber}` : 'Featured';
      // Default image if none provided
      const pinImage = pin.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(pin.name)}&background=random&color=fff&size=64`;

      const iconHtml = `
        <div class="relative flex items-center justify-center w-12 h-12 group transition-all duration-300 ${isSelected ? 'z-[1000] scale-110' : 'z-[500]'}">
          <!-- Pulse Animation (Only for selected) -->
          ${isSelected ? `<div class="absolute w-14 h-14 rounded-full animate-ping opacity-75" style="background: ${pinGlow}"></div>` : ''}
          
          <!-- Outer Glow -->
          <div class="absolute w-12 h-12 rounded-full" style="background: ${pinGlow}"></div>
          
          <!-- Tooltip / Card -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 rounded-2xl border border-white/70 shadow-xl p-2 opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''} transition-opacity duration-200 pointer-events-none z-[1000] flex gap-3 items-center transform scale-95 group-hover:scale-100 origin-bottom" style="background: rgba(255, 250, 244, 0.96)">
            <img src="${pinImage}" class="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100" alt="${pin.name}" />
            <div class="flex flex-col overflow-hidden text-left">
              <span class="mb-1 inline-flex w-fit rounded-full px-2 py-0.5 text-[0.6875rem] font-bold uppercase tracking-[0.16em] leading-none" style="background: ${pinBadge}; color: ${pinColor}">${pinLabel}</span>
              <span class="text-[0.875rem] font-bold truncate w-full leading-[1.2]" style="color: rgba(72, 42, 27, 0.96)">${pin.name}</span>
              <span class="text-[0.75rem] truncate w-full leading-[1.35]" style="color: rgba(116, 79, 56, 0.76)">${pin.description}</span>
            </div>
            <!-- Triangle arrow -->
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
          </div>

          <div class="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform duration-300 group-hover:scale-110 ${isSelected ? 'scale-110 ring-2 ring-white/75' : ''}" style="background: ${pinColor}">
            <div class="absolute inset-[5px] rounded-full border border-white/25"></div>
            ${pin.dayNumber ? `<span class="relative text-[11px] font-black leading-none text-white">${pin.dayNumber}</span>` : '<div class="relative h-3 w-3 rounded-full bg-white"></div>'}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: iconHtml,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker([pin.lat, pin.lng], { icon: customIcon })
        .addTo(map)
        .on('click', (e) => {
           L.DomEvent.stopPropagation(e);
           onPinClick(pin);
        });

      markersRef.current[pin.id] = marker;
    });
  }, [pins, onPinClick, selectedPinId]);

  useEffect(() => {
    if (!mapInstanceRef.current || !pins.length || selectedPinId) {
      return;
    }

    const map = mapInstanceRef.current;
    const primaryPins = getPrimaryPinCluster(pins);

    if (primaryPins.length === 1) {
      map.flyTo([primaryPins[0].lat, primaryPins[0].lng], 12, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
      return;
    }

    const bounds = L.latLngBounds(primaryPins.map((pin) => [pin.lat, pin.lng] as [number, number]));
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
  }, [pinViewportKey, pins, selectedPinId]);

  // Handle Selection/FlyTo
  useEffect(() => {
    if (selectedPinId && mapInstanceRef.current && markersRef.current[selectedPinId]) {
       const pin = pins.find(p => p.id === selectedPinId);
       if (pin) {
         mapInstanceRef.current.flyTo([pin.lat, pin.lng], 13, {
             duration: 1.5,
             easeLinearity: 0.25
         });
       }
    }
  }, [selectedPinId, pins]);

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
            easeLinearity: 0.25
          });

          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.remove();
          }
          if (userPulseRef.current) {
             mapInstanceRef.current.removeLayer(userPulseRef.current);
          }

          const pulse = L.circle([latitude, longitude], {
            radius: 2000, 
            color: '#e66a3f',
            weight: 1,
            fillColor: '#e66a3f',
            fillOpacity: 0.1,
            className: 'animate-pulse' 
          }).addTo(mapInstanceRef.current);
          userPulseRef.current = pulse;

          const marker = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#e66a3f',
            color: '#fff',
            weight: 3,
            opacity: 1,
            fillOpacity: 1
          }).addTo(mapInstanceRef.current);
          userLocationMarkerRef.current = marker;
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Location error:", error);
        alert("Unable to retrieve your location. Please ensure location permissions are enabled.");
        setIsLocating(false);
      }
    );
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="z-0 h-full w-full bg-[#e7dbc2] outline-none" />
      
      {showControls && (
        <div className="absolute bottom-4 right-3 z-[400] flex flex-col gap-2.5 md:bottom-12 md:right-4 md:gap-3">
            <button 
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl border border-white/60 bg-[rgba(255,250,245,0.88)] text-[rgba(102,70,49,0.88)] shadow-lg shadow-[rgba(118,75,39,0.1)] backdrop-blur-xl transition-all hover:bg-white hover:text-[rgba(217,102,58,0.92)] active:scale-95 md:h-11 md:w-11"
            title="Locate Me"
            >
            <Locate size={18} className={isLocating ? 'animate-pulse text-[rgba(217,102,58,0.92)] md:h-5 md:w-5' : 'md:h-5 md:w-5'} />
            </button>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-[rgba(255,250,245,0.88)] backdrop-blur-xl shadow-lg shadow-[rgba(118,75,39,0.1)]">
            <button 
                onClick={handleZoomIn}
                className="flex h-10 w-10 cursor-pointer items-center justify-center text-[rgba(102,70,49,0.88)] transition-colors hover:bg-[rgba(255,236,208,0.8)] hover:text-[rgba(217,102,58,0.92)] active:bg-[rgba(255,231,198,0.92)] md:h-11 md:w-11"
                title="Zoom In"
            >
                <Plus size={18} className="md:h-5 md:w-5" />
            </button>
            <div className="h-[1px] w-full bg-[rgba(221,197,173,0.56)]" />
            <button 
                onClick={handleZoomOut}
                className="flex h-10 w-10 cursor-pointer items-center justify-center text-[rgba(102,70,49,0.88)] transition-colors hover:bg-[rgba(225,242,237,0.82)] hover:text-[rgba(42,140,142,0.92)] active:bg-[rgba(210,235,228,0.92)] md:h-11 md:w-11"
                title="Zoom Out"
            >
                <Minus size={18} className="md:h-5 md:w-5" />
            </button>
            </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-0 right-0 z-[400] select-none rounded-tl-xl bg-[rgba(255,250,245,0.76)] px-2 py-1 text-[0.5625rem] text-[rgba(116,79,56,0.74)] backdrop-blur-sm md:text-[10px]">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="pointer-events-auto text-[rgba(42,140,142,0.92)] hover:underline">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" className="pointer-events-auto text-[rgba(217,102,58,0.92)] hover:underline">CARTO</a>
      </div>
    </div>
  );
};

export default WorldMap;
