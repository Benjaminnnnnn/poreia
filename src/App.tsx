import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import SearchOverlay from './components/SearchOverlay';
import Sidebar from './components/Sidebar';
import { INITIAL_PINS } from './constants';
import { MapPinData, TripSession, ChatMessage, TravelItinerary } from './types';
import { generateOrRefineItinerary } from './services/itineraryService';
import { SendHorizontal, Sparkles, Loader2, PanelLeftOpen } from 'lucide-react';

const WorldMap = lazy(() => import('./components/WorldMap'));
const ItineraryResult = lazy(() => import('./components/ItineraryResult'));
const TRIPS_STORAGE_KEY = 'poreia_trips';
const TRIPS_STORAGE_VERSION = 1;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

interface PersistedTripsPayload {
  version: number;
  trips: TripSession[];
}

// --- Local Storage Helper ---
const loadTrips = (): TripSession[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(TRIPS_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as unknown;
    if (Array.isArray(parsed)) {
      return parsed as TripSession[];
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as PersistedTripsPayload).trips)
    ) {
      return (parsed as PersistedTripsPayload).trips;
    }
  } catch {
    return [];
  }

  return [];
};

const saveTrips = (trips: TripSession[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PersistedTripsPayload = {
    version: TRIPS_STORAGE_VERSION,
    trips,
  };

  window.localStorage.setItem(TRIPS_STORAGE_KEY, JSON.stringify(payload));
};

interface SurfaceFallbackProps {
  className?: string;
  label: string;
}

const SurfaceFallback: React.FC<SurfaceFallbackProps> = ({ className = '', label }) => (
  <div className={`flex items-center justify-center bg-[rgba(255,250,245,0.9)] backdrop-blur-xl ${className}`}>
    <div className="flex flex-col items-center gap-3 text-[rgba(92,58,36,0.96)]">
      <Loader2 className="animate-spin text-[rgba(217,102,58,0.92)]" size={32} />
      <p className="font-medium">{label}</p>
    </div>
  </div>
);

// --- Home Page Component ---
interface HomePageProps {
  onSearch: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSearch, isGenerating }) => {
  return (
    <div className="w-full h-full">
      <SearchOverlay 
        onSearch={onSearch} 
        isGenerating={isGenerating} 
      />
    </div>
  );
};

// --- Trip Page Component ---
interface TripPageProps {
  tripId: string;
  trips: TripSession[];
  updateTrip: (trip: TripSession) => void;
  onNavigateHome: () => void;
}

const TripPage: React.FC<TripPageProps> = ({ tripId, trips, updateTrip, onNavigateHome }) => {
  const trip = trips.find(t => t.id === tripId);
  
  const [inputValue, setInputValue] = useState("");
  const [isRefining, setIsRefining] = useState(false);

  // Safety check: Redirect if trip is not found
  useEffect(() => {
    // If the trip doesn't exist (and we aren't in a transient state), redirect home.
    // This handles cases where the URL hash points to a deleted or non-existent trip.
    if (!trip && !isRefining) {
        const timer = setTimeout(() => onNavigateHome(), 0);
        return () => clearTimeout(timer);
    }
  }, [trip, isRefining, onNavigateHome]);

  if (!trip) return (
      <div className="w-full h-full flex items-center justify-center bg-[rgba(255,250,245,0.9)] backdrop-blur-xl">
          <Loader2 className="animate-spin text-[rgba(217,102,58,0.92)]" size={32} />
      </div>
  );

  const handleManualItineraryUpdate = (newItinerary: TravelItinerary) => {
    updateTrip({
      ...trip,
      updatedAt: Date.now(),
      currentItinerary: newItinerary
    });
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isRefining) return;

    const userMsg: ChatMessage = { role: 'user', text: inputValue, timestamp: Date.now() };
    const updatedMessages = [...trip.messages, userMsg];
    
    // Optimistic update of messages
    const intermediateTrip = { ...trip, messages: updatedMessages };
    updateTrip(intermediateTrip);
    setInputValue("");
    setIsRefining(true);

    try {
        const newItinerary = await generateOrRefineItinerary(userMsg.text, updatedMessages, trip.currentItinerary);
        
        updateTrip({
            ...trip,
            updatedAt: Date.now(),
            messages: updatedMessages,
            currentItinerary: newItinerary
        });

    } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to update itinerary."));
    } finally {
        setIsRefining(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col pointer-events-auto">
      {/* Mobile: Top spacing handled by sidebar overlay usually, but here we just need content area */}
      
      {/* Main Itinerary View */}
      <div className="flex-1 h-full relative overflow-hidden flex flex-col">
         {trip.currentItinerary ? (
            <Suspense
              fallback={
                <SurfaceFallback
                  className="h-full"
                  label="Loading itinerary workspace..."
                />
              }
            >
              <ItineraryResult
                itinerary={trip.currentItinerary}
                onUpdate={handleManualItineraryUpdate}
                className="h-full w-full shadow-none xl:border-l xl:border-[rgba(214,181,154,0.9)] xl:bg-[rgba(255,251,246,0.82)]"
              />
            </Suspense>
         ) : (
            <SurfaceFallback className="h-full" label="Planning your trip..." />
         )}
      </div>

      {/* Refinement Interface */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-50 flex justify-center px-3 md:bottom-6 md:px-4">
         <div className="w-full max-w-full pointer-events-auto md:max-w-2xl">
             <form onSubmit={handleRefine} className="relative group">
                 <div className="absolute inset-0 rounded-[1.75rem] border border-white/70 bg-[rgba(255,248,241,0.94)] shadow-[0_24px_70px_rgba(108,62,26,0.14)] backdrop-blur-xl" />
                 <div className="relative flex items-center p-2">
                    <div className="pl-3 pr-2 text-[rgba(217,102,58,0.92)]">
                        {isRefining ? <Sparkles className="animate-spin-slow" size={20} /> : <Sparkles size={20} />}
                    </div>
                    <label htmlFor="trip-refine-input" className="sr-only">
                      Refine your itinerary
                    </label>
                    <input
                        id="trip-refine-input"
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
                        className="w-full h-12 bg-transparent border-none outline-none text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(118,77,54,0.58)] text-sm md:text-base font-medium"
                        disabled={isRefining}
                    />
                    <button 
                        type="submit"
                        disabled={!inputValue.trim() || isRefining}
                        className="min-h-[44px] min-w-[44px] rounded-2xl border border-[rgba(214,98,54,0.2)] bg-[rgba(230,106,63,0.96)] p-2.5 text-white shadow-[0_12px_28px_rgba(210,96,47,0.18)] transition-all hover:bg-[rgba(217,98,56,1)] disabled:opacity-50"
                    >
                        <SendHorizontal size={18} />
                    </button>
                 </div>
                 {isRefining && (
                    <div className="absolute bottom-0 left-2 right-2 h-[3px] bg-[rgba(230,106,63,0.72)] animate-progress rounded-full" />
                 )}
             </form>
         </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [trips, setTrips] = useState<TripSession[]>(loadTrips);
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768,
  );
  const [activePin, setActivePin] = useState<MapPinData | null>(null);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);

  // Custom Routing State (Hash based for Blob compatibility)
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : window.location.hash || '/',
  );

  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const syncSidebarMode = (event: MediaQueryList | MediaQueryListEvent) => {
      setSidebarOpen(event.matches);
    };

    syncSidebarMode(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncSidebarMode);
      return () => mediaQuery.removeEventListener('change', syncSidebarMode);
    }

    mediaQuery.addListener(syncSidebarMode);
    return () => mediaQuery.removeListener(syncSidebarMode);
  }, []);

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Custom navigation
  const navigate = useCallback((path: string) => {
    const hashPath = path.startsWith('/') ? `#${path}` : `#/${path}`;
    if (window.location.hash !== hashPath) {
      window.location.hash = hashPath;
    }

    startTransition(() => {
      setCurrentPath(hashPath);
    });
  }, []);

  const getTripIdFromPath = (path: string): string | null => {
    const cleanPath = path.startsWith('#') ? path.substring(1) : path;
    const match = cleanPath.match(/^\/t\/(.+)$/);
    return match ? match[1] : null;
  };

  const currentTripId = getTripIdFromPath(currentPath);
  const isHomePage = !currentTripId;

  const handleCreateTrip = useCallback(async (prompt: string) => {
    setIsGeneratingTrip(true);
    const newId = uuidv4();
    const timestamp = Date.now();
    
    try {
        const itinerary = await generateOrRefineItinerary(prompt);
        
        const newTrip: TripSession = {
            id: newId,
            title: itinerary.destination || prompt,
            createdAt: timestamp,
            updatedAt: timestamp,
            messages: [
                { role: 'user', text: prompt, timestamp }
            ],
            currentItinerary: itinerary
        };
        
        setTrips(prev => [newTrip, ...prev]);
        navigate(`/t/${newId}`);

    } catch (e) {
        console.error(e);
        alert(getErrorMessage(e, "Failed to plan trip. Please try again."));
    } finally {
        setIsGeneratingTrip(false);
    }
  }, [navigate]);

  const updateTrip = useCallback((updatedTrip: TripSession) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  }, []);

  const deleteTrip = useCallback((id: string) => {
      setTrips(prev => prev.filter(t => t.id !== id));
      if (currentTripId === id) {
          navigate('/');
      }
  }, [currentTripId, navigate]);

  const handlePinClick = useCallback((pin: MapPinData) => {
    setActivePin(pin);
    const prompt = `Plan a 3-day itinerary for ${pin.name} featuring ${pin.description}`;
    void handleCreateTrip(prompt);
  }, [handleCreateTrip]);

  const navigateToTrip = useCallback((id: string | null) => {
    if (id) {
        navigate(`/t/${id}`);
    } else {
        navigate('/');
    }
  }, [navigate]);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen((isOpen) => !isOpen);
  }, []);

  return (
    <div className="app-summer relative flex h-[100dvh] w-full flex-row overflow-hidden bg-[rgb(251,245,237)] font-sans text-slate-900">
      {sidebarOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[rgba(74,43,26,0.18)] backdrop-blur-[1px] md:hidden"
          onClick={handleSidebarToggle}
        />
      ) : null}
      
      {/* Sidebar - Now a relative flex item (on desktop) */}
      <Sidebar 
        trips={trips} 
        isOpen={sidebarOpen} 
        onToggle={handleSidebarToggle}
        onDeleteTrip={deleteTrip}
        activeTripId={currentTripId}
        onNavigate={navigateToTrip}
      />

      <div className="flex-1 relative h-full flex flex-col min-w-0">
        {!sidebarOpen ? (
          <button
            aria-label="Open navigation"
            className="absolute left-4 top-4 z-40 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-[rgba(255,250,245,0.94)] text-[rgba(102,70,49,0.88)] shadow-[0_12px_24px_rgba(118,75,39,0.12)] backdrop-blur-xl transition-colors hover:bg-white hover:text-[rgba(217,102,58,0.92)] md:hidden"
            onClick={handleSidebarToggle}
          >
            <PanelLeftOpen size={19} />
          </button>
        ) : null}

        {isHomePage ? (
          <div className="absolute inset-0 z-0 bg-[rgb(251,245,237)]" />
        ) : (
          <>
            <div className="absolute inset-0 z-0 bg-[rgb(243,237,228)]">
              <Suspense fallback={<div className="h-full w-full bg-[rgb(243,237,228)]" />}>
                <WorldMap
                  pins={INITIAL_PINS}
                  onPinClick={handlePinClick}
                  selectedPinId={activePin?.id}
                />
              </Suspense>
            </div>

            <div className="pointer-events-none absolute inset-0 z-[1] bg-[rgba(255,250,245,0.08)]" />
          </>
        )}

        {/* Global Loading Overlay - REMOVED */}

        {/* Main Content Area */}
        <div className="relative z-10 w-full h-full">
           {currentTripId ? (
             <TripPage 
                tripId={currentTripId} 
                trips={trips} 
                updateTrip={updateTrip} 
                onNavigateHome={() => navigate('/')} 
             />
           ) : (
             <HomePage 
                onSearch={handleCreateTrip}
                isGenerating={isGeneratingTrip} 
             />
           )}
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { width: 0%; opacity: 1; }
          50% { width: 70%; }
          100% { width: 100%; opacity: 0; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
