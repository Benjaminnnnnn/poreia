import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ArrowLeft,
  Compass,
  LayoutList,
  Loader2,
  Plus,
  SendHorizontal,
  Sparkles,
} from 'lucide-react';
import SearchOverlay from './components/SearchOverlay';
import { ChatMessage, TravelItinerary, TripSession } from './types';
import { generateOrRefineItinerary } from './services/itineraryService';

const ItineraryResult = lazy(() => import('./components/ItineraryResult'));
const TRIPS_STORAGE_KEY = 'poreia_trips';
const TRIPS_STORAGE_VERSION = 1;
type WorkspaceTab = 'itinerary' | 'notes';

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
  <div
    className={`flex items-center justify-center bg-[rgba(255,250,245,0.72)] backdrop-blur-xl ${className}`}
  >
    <div className="flex flex-col items-center gap-3 text-[rgba(92,58,36,0.96)]">
      <Loader2 className="animate-spin text-[rgba(217,102,58,0.92)]" size={32} />
      <p className="font-medium">{label}</p>
    </div>
  </div>
);

interface AppHeaderProps {
  currentTrip: TripSession | null;
  isHomePage: boolean;
  onNavigateHome: () => void;
  onStartNewTrip: () => void;
  tripCount: number;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  currentTrip,
  isHomePage,
  onNavigateHome,
  onStartNewTrip,
  tripCount,
}) => (
  <header className="shrink-0 border-b border-[rgba(229,218,204,0.96)] bg-[rgba(252,248,242,0.96)] px-4 py-2.5 sm:px-5 lg:px-6">
    <div className="flex min-h-[3.4rem] items-center justify-between gap-3">
      <button
        type="button"
        onClick={onNavigateHome}
        aria-label="Go to home page"
        className="flex min-w-0 items-center gap-3 rounded-[0.7rem] px-1.5 py-1 text-left transition-colors duration-150 hover:bg-[rgba(247,239,228,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(224,146,94,0.42)]"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.55rem] border border-[rgba(233,208,184,0.96)] bg-[rgba(255,253,249,0.98)] text-[rgba(216,101,58,0.95)]">
          <Compass size={17} />
        </div>

        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[rgba(208,101,59,0.88)]">
              Poreia
            </p>
            <span className="rounded-[0.35rem] bg-[rgba(246,239,229,0.92)] px-2 py-1 text-[0.63rem] font-semibold uppercase tracking-[0.16em] text-[rgba(110,74,52,0.76)]">
              {tripCount} {tripCount === 1 ? 'trip' : 'trips'}
            </span>
          </div>
          <p className="mt-0.5 truncate font-display text-[1.15rem] leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.97)] sm:text-[1.35rem]">
            {isHomePage
              ? 'Trip planner'
              : currentTrip?.currentItinerary?.destination || currentTrip?.title || 'Trip workspace'}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {!isHomePage ? (
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-[0.55rem] border border-[rgba(234,217,199,0.96)] bg-[rgba(255,250,244,0.9)] px-3 py-2 text-sm font-semibold text-[rgba(90,58,39,0.88)] transition-colors hover:bg-white"
          >
            <ArrowLeft size={15} />
            Home
          </button>
        ) : null}

        <button
          type="button"
          onClick={onStartNewTrip}
          className="inline-flex min-h-[38px] items-center gap-2 rounded-[0.55rem] border border-[rgba(214,98,54,0.18)] bg-[rgba(230,106,63,0.96)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[rgba(217,98,56,1)]"
        >
          <Plus size={15} />
          New trip
        </button>
      </div>
    </div>
  </header>
);

interface HomePageProps {
  isGenerating: boolean;
  onDeleteTrip: (tripId: string) => void;
  onOpenTrip: (tripId: string) => void;
  onSearch: (prompt: string) => Promise<void>;
  trips: TripSession[];
}

const HomePage: React.FC<HomePageProps> = ({
  isGenerating,
  onDeleteTrip,
  onOpenTrip,
  onSearch,
  trips,
}) => (
  <div className="min-h-0 flex-1">
    <SearchOverlay
      onDeleteTrip={onDeleteTrip}
      onOpenTrip={onOpenTrip}
      onSearch={onSearch}
      isGenerating={isGenerating}
      trips={trips}
    />
  </div>
);

interface TripPageProps {
  tripId: string;
  trips: TripSession[];
  updateTrip: (trip: TripSession) => void;
  onNavigateHome: () => void;
}

const TripPage: React.FC<TripPageProps> = ({
  tripId,
  trips,
  updateTrip,
  onNavigateHome,
}) => {
  const trip = trips.find((candidate) => candidate.id === tripId);
  const [inputValue, setInputValue] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('itinerary');

  useEffect(() => {
    if (!trip && !isRefining) {
      const timer = setTimeout(() => onNavigateHome(), 0);
      return () => clearTimeout(timer);
    }
  }, [trip, isRefining, onNavigateHome]);

  useEffect(() => {
    setActiveWorkspaceTab('itinerary');
  }, [tripId]);

  if (!trip) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[rgba(255,250,245,0.66)] backdrop-blur-xl">
        <Loader2 className="animate-spin text-[rgba(217,102,58,0.92)]" size={32} />
      </div>
    );
  }

  const handleManualItineraryUpdate = (newItinerary: TravelItinerary) => {
    updateTrip({
      ...trip,
      updatedAt: Date.now(),
      currentItinerary: newItinerary,
    });
  };

  const handleRefine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isRefining) {
      return;
    }

    const userMsg: ChatMessage = {
      role: 'user',
      text: inputValue,
      timestamp: Date.now(),
    };
    const updatedMessages = [...trip.messages, userMsg];

    updateTrip({ ...trip, messages: updatedMessages });
    setInputValue('');
    setIsRefining(true);

    try {
      const newItinerary = await generateOrRefineItinerary(
        userMsg.text,
        updatedMessages,
        trip.currentItinerary,
      );

      updateTrip({
        ...trip,
        updatedAt: Date.now(),
        messages: updatedMessages,
        currentItinerary: newItinerary,
      });
    } catch (error) {
      console.error(error);
      alert(getErrorMessage(error, 'Failed to update itinerary.'));
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[rgba(255,250,245,0.22)]">
      <div className="flex-1 min-h-0 overflow-hidden">
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
              onWorkspaceTabChange={setActiveWorkspaceTab}
              className="h-full w-full bg-transparent shadow-none"
            />
          </Suspense>
        ) : (
          <SurfaceFallback className="h-full" label="Planning your trip..." />
        )}
      </div>

      {activeWorkspaceTab === 'itinerary' ? (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3 md:bottom-5 md:px-4">
          <div className="w-full max-w-full pointer-events-auto md:max-w-2xl">
            <form onSubmit={handleRefine} className="relative group">
              <div className="absolute inset-0 rounded-[0.7rem] border border-[rgba(228,215,201,0.95)] bg-[rgba(255,250,245,0.97)] shadow-[0_14px_36px_rgba(108,62,26,0.12)]" />
              <div className="relative flex items-center p-1.5">
                <div className="pl-2.5 pr-2 text-[rgba(217,102,58,0.92)]">
                  {isRefining ? <Sparkles className="animate-spin-slow" size={18} /> : <LayoutList size={18} />}
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
                  className="h-11 w-full border-none bg-transparent text-sm font-medium text-[rgba(74,43,26,0.96)] outline-none placeholder:text-[rgba(118,77,54,0.58)] md:text-base"
                  disabled={isRefining}
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isRefining}
                  className="min-h-[40px] min-w-[40px] rounded-[0.55rem] border border-[rgba(214,98,54,0.2)] bg-[rgba(230,106,63,0.96)] p-2 text-white transition-all hover:bg-[rgba(217,98,56,1)] disabled:opacity-50"
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
              {isRefining ? (
                <div className="absolute bottom-0 left-2 right-2 h-[2px] bg-[rgba(230,106,63,0.72)] animate-progress" />
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default function App() {
  const [trips, setTrips] = useState<TripSession[]>(loadTrips);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window === 'undefined' ? '/' : window.location.hash || '/',
  );

  useEffect(() => {
    saveTrips(trips);
  }, [trips]);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '/');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === currentTripId) ?? null,
    [currentTripId, trips],
  );
  const isHomePage = !currentTripId;

  const handleCreateTrip = useCallback(
    async (prompt: string) => {
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
          messages: [{ role: 'user', text: prompt, timestamp }],
          currentItinerary: itinerary,
        };

        setTrips((prev) => [newTrip, ...prev]);
        navigate(`/t/${newId}`);
      } catch (e) {
        console.error(e);
        alert(getErrorMessage(e, 'Failed to plan trip. Please try again.'));
      } finally {
        setIsGeneratingTrip(false);
      }
    },
    [navigate],
  );

  const updateTrip = useCallback((updatedTrip: TripSession) => {
    setTrips((prev) => prev.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)));
  }, []);

  const deleteTrip = useCallback(
    (id: string) => {
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      if (currentTripId === id) {
        navigate('/');
      }
    },
    [currentTripId, navigate],
  );

  const navigateToTrip = useCallback(
    (id: string | null) => {
      if (id) {
        navigate(`/t/${id}`);
        return;
      }

      navigate('/');
    },
    [navigate],
  );

  return (
    <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <AppHeader
          currentTrip={currentTrip}
          isHomePage={isHomePage}
          onNavigateHome={() => navigate('/')}
          onStartNewTrip={() => navigate('/')}
          tripCount={trips.length}
        />

        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {currentTripId ? (
              <div className="min-h-0 flex-1">
                <TripPage
                  tripId={currentTripId}
                  trips={trips}
                  updateTrip={updateTrip}
                  onNavigateHome={() => navigate('/')}
                />
              </div>
            ) : (
              <HomePage
                isGenerating={isGeneratingTrip}
                onDeleteTrip={deleteTrip}
                onOpenTrip={(tripId) => navigateToTrip(tripId)}
                onSearch={handleCreateTrip}
                trips={trips}
              />
            )}
          </div>
        </main>
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
