import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import WorldMap from './components/WorldMap';
import SearchOverlay from './components/SearchOverlay';
import ItineraryResult from './components/ItineraryResult';
import Sidebar from './components/Sidebar';
import { INITIAL_PINS } from './constants';
import { MapPinData, TripSession, ChatMessage, TravelItinerary } from './types';
import { generateOrRefineItinerary } from './services/itineraryService';
import { SendHorizontal, Sparkles, Loader2 } from 'lucide-react';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

// --- Local Storage Helper ---
const loadTrips = (): TripSession[] => {
  try {
    const stored = localStorage.getItem('poreia_trips');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

const saveTrips = (trips: TripSession[]) => {
  localStorage.setItem('poreia_trips', JSON.stringify(trips));
};

// --- Home Page Component ---
interface HomePageProps {
  onSearch: (prompt: string) => Promise<void>;
  isGenerating: boolean;
}

const HomePage: React.FC<HomePageProps> = ({ onSearch, isGenerating }) => {
  return (
    <div className="w-full h-full flex flex-col justify-end pointer-events-none">
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
      <div className="w-full h-full flex items-center justify-center bg-white/50 backdrop-blur">
          <Loader2 className="animate-spin text-blue-600" size={32} />
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
            // Changed max-w-4xl to w-full to use full size as requested
            <ItineraryResult 
                itinerary={trip.currentItinerary} 
                onUpdate={handleManualItineraryUpdate}
                className="w-full h-full shadow-none md:shadow-2xl md:rounded-l-2xl border-l border-slate-200" 
            />
         ) : (
            <div className="flex items-center justify-center h-full bg-white/50 backdrop-blur rounded-2xl">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                    <p className="text-slate-500 font-medium">Planning your trip...</p>
                </div>
            </div>
         )}
      </div>

      {/* Refinement Interface */}
      <div className="absolute bottom-6 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
         <div className="w-full max-w-2xl pointer-events-auto">
             <form onSubmit={handleRefine} className="relative group">
                 <div className="absolute inset-0 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/50" />
                 <div className="relative flex items-center p-2">
                    <div className="pl-3 pr-2 text-blue-600">
                        {isRefining ? <Sparkles className="animate-spin-slow" size={20} /> : <Sparkles size={20} />}
                    </div>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
                        className="w-full h-12 bg-transparent border-none outline-none text-slate-800 placeholder-slate-500 text-sm md:text-base font-medium"
                        disabled={isRefining}
                    />
                    <button 
                        type="submit"
                        disabled={!inputValue.trim() || isRefining}
                        className="p-2 bg-slate-900 rounded-xl text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                    >
                        <SendHorizontal size={18} />
                    </button>
                 </div>
                 {isRefining && (
                    <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-blue-500 animate-progress rounded-full" />
                 )}
             </form>
         </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [trips, setTrips] = useState<TripSession[]>(loadTrips());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePin, setActivePin] = useState<MapPinData | null>(null);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);

  // Custom Routing State (Hash based for Blob compatibility)
  const [currentPath, setCurrentPath] = useState(window.location.hash || '/');

  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

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
    window.location.hash = hashPath;
    setCurrentPath(hashPath);
  }, []);

  const getTripIdFromPath = (path: string): string | null => {
    const cleanPath = path.startsWith('#') ? path.substring(1) : path;
    const match = cleanPath.match(/^\/t\/(.+)$/);
    return match ? match[1] : null;
  };

  const currentTripId = getTripIdFromPath(currentPath);

  const handleCreateTrip = async (prompt: string) => {
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
  };

  const updateTrip = (updatedTrip: TripSession) => {
    setTrips(prev => prev.map(t => t.id === updatedTrip.id ? updatedTrip : t));
  };

  const deleteTrip = (id: string) => {
      setTrips(prev => prev.filter(t => t.id !== id));
      if (currentTripId === id) {
          navigate('/');
      }
  };

  const handlePinClick = (pin: MapPinData) => {
    setActivePin(pin);
    const prompt = `Plan a 3-day itinerary for ${pin.name} featuring ${pin.description}`;
    handleCreateTrip(prompt);
  };

  const navigateToTrip = (id: string | null) => {
    if (id) {
        navigate(`/t/${id}`);
    } else {
        navigate('/');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 flex flex-row">
      
      {/* Sidebar - Now a relative flex item (on desktop) */}
      <Sidebar 
        trips={trips} 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onDeleteTrip={deleteTrip}
        activeTripId={currentTripId}
        onNavigate={navigateToTrip}
      />

      <div className="flex-1 relative h-full flex flex-col min-w-0">
        {/* Background Map - Always present but z-0 */}
        <div className="absolute inset-0 z-0">
          <WorldMap 
            pins={INITIAL_PINS} 
            onPinClick={handlePinClick} 
            selectedPinId={activePin?.id}
          />
        </div>

        {/* Global Loading Overlay - REMOVED */}

        {/* Main Content Area */}
        <div className="relative z-10 w-full h-full pointer-events-none">
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
