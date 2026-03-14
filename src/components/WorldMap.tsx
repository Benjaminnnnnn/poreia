
import React, { useEffect, useRef, useState } from 'react';
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

const WorldMap: React.FC<WorldMapProps> = ({ pins, onPinClick, selectedPinId, className = "w-full h-full", showControls = true }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);
  const userPulseRef = useRef<L.Layer | null>(null);
  const [isLocating, setIsLocating] = useState(false);

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
      // Default image if none provided
      const pinImage = pin.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(pin.name)}&background=random&color=fff&size=64`;

      const iconHtml = `
        <div class="relative flex items-center justify-center w-10 h-10 group transition-all duration-300 ${isSelected ? 'z-[1000] scale-110' : 'z-[500]'}">
          <!-- Pulse Animation (Only for selected) -->
          ${isSelected ? '<div class="absolute w-12 h-12 rounded-full bg-orange-400/35 animate-ping opacity-75"></div>' : ''}
          
          <!-- Outer Glow -->
          <div class="absolute w-10 h-10 rounded-full bg-sky-500/15"></div>
          
          <!-- Tooltip / Card -->
          <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-44 rounded-2xl border border-white/70 bg-white/95 shadow-xl p-2 opacity-0 group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''} transition-opacity duration-200 pointer-events-none z-[1000] flex gap-3 items-center transform scale-95 group-hover:scale-100 origin-bottom">
            <img src="${pinImage}" class="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-100" alt="${pin.name}" />
            <div class="flex flex-col overflow-hidden text-left">
              <span class="text-[10px] font-bold text-sky-950 truncate w-full leading-tight">${pin.name}</span>
              <span class="text-[8px] text-sky-800/70 truncate w-full">${pin.description}</span>
            </div>
            <!-- Triangle arrow -->
            <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rotate-45"></div>
          </div>

          <!-- Pin Center -->
          <div class="relative w-4 h-4 bg-sky-500 border-2 border-white rounded-full shadow-lg transition-transform duration-300 group-hover:scale-125 ${isSelected ? 'bg-orange-500 scale-125 ring-2 ring-orange-200' : ''}"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: iconHtml,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
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
            color: '#3b82f6',
            weight: 1,
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            className: 'animate-pulse' 
          }).addTo(mapInstanceRef.current);
          userPulseRef.current = pulse;

          const marker = L.circleMarker([latitude, longitude], {
            radius: 8,
            fillColor: '#3b82f6',
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
      <div ref={mapContainerRef} className="w-full h-full bg-[#aad3df] z-0 outline-none" />
      
      {showControls && (
        <div className="absolute bottom-12 right-4 z-[400] flex flex-col gap-3">
            <button 
            onClick={handleLocateMe}
            disabled={isLocating}
            className="w-11 h-11 flex items-center justify-center cursor-pointer bg-white/88 backdrop-blur-xl rounded-2xl shadow-lg shadow-sky-950/10 border border-white/60 text-slate-700 hover:bg-white hover:text-orange-500 transition-all active:scale-95"
            title="Locate Me"
            >
            <Locate size={20} className={isLocating ? 'animate-pulse text-orange-500' : ''} />
            </button>

            <div className="flex flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/88 backdrop-blur-xl shadow-lg shadow-sky-950/10">
            <button 
                onClick={handleZoomIn}
                className="w-11 h-11 flex items-center justify-center cursor-pointer text-slate-700 hover:bg-sky-50 hover:text-sky-700 active:bg-sky-100 transition-colors"
                title="Zoom In"
            >
                <Plus size={20} />
            </button>
            <div className="h-[1px] w-full bg-slate-100" />
            <button 
                onClick={handleZoomOut}
                className="w-11 h-11 flex items-center justify-center cursor-pointer text-slate-700 hover:bg-orange-50 hover:text-orange-600 active:bg-orange-100 transition-colors"
                title="Zoom Out"
            >
                <Minus size={20} />
            </button>
            </div>
        </div>
      )}

      <div className="absolute bottom-0 right-0 z-[400] rounded-tl-xl bg-white/72 px-2 py-1 text-[10px] text-slate-500 backdrop-blur-sm pointer-events-none select-none">
        &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="pointer-events-auto text-sky-700 hover:underline">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer" className="pointer-events-auto text-orange-500 hover:underline">CARTO</a>
      </div>
    </div>
  );
};

export default WorldMap;
