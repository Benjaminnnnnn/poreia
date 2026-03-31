import { LayoutList, Loader2, SendHorizontal, Sparkles } from "lucide-react";
import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import AppAuthShell, { useAppAuth } from "./components/Auth";
import ProfilePage from "./components/ProfilePage";
import SearchOverlay from "./components/SearchOverlay";
import Button from "./components/ui/Button";
import Surface from "./components/ui/Surface";
import { generateOrRefineItinerary } from "./services/itineraryService";
import { ChatMessage, TravelItinerary, TripSession } from "./types";

const ItineraryResult = lazy(() => import("./components/ItineraryResult"));
const TRIPS_STORAGE_KEY = "poreia_trips";
const TRIPS_STORAGE_VERSION = 1;

type WorkspaceTab = "itinerary" | "notes";

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

const getTripsStorageKey = (userId: string) => `${TRIPS_STORAGE_KEY}:${userId}`;

const parseTripsPayload = (stored: string): TripSession[] => {
  const parsed = JSON.parse(stored) as unknown;

  if (Array.isArray(parsed)) {
    return parsed as TripSession[];
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as PersistedTripsPayload).trips)
  ) {
    return (parsed as PersistedTripsPayload).trips;
  }

  return [];
};

const loadTrips = (userId: string | null): TripSession[] => {
  if (typeof window === "undefined" || !userId) {
    return [];
  }

  for (const storageKey of [getTripsStorageKey(userId), TRIPS_STORAGE_KEY]) {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        continue;
      }

      return parseTripsPayload(stored);
    } catch {
      continue;
    }
  }

  return [];
};

const saveTrips = (userId: string | null, trips: TripSession[]) => {
  if (typeof window === "undefined" || !userId) {
    return;
  }

  const payload: PersistedTripsPayload = {
    version: TRIPS_STORAGE_VERSION,
    trips,
  };

  window.localStorage.setItem(
    getTripsStorageKey(userId),
    JSON.stringify(payload),
  );
};

interface SurfaceFallbackProps {
  className?: string;
  label: string;
}

const SurfaceFallback: React.FC<SurfaceFallbackProps> = ({
  className = "",
  label,
}) => (
  <Surface
    variant="glass"
    padding="none"
    radius="md"
    className={`flex items-center justify-center bg-[rgba(255,250,245,0.72)] ${className}`}
  >
    <div className="flex flex-col items-center gap-3 text-[rgba(92,58,36,0.96)]">
      <Loader2
        className="animate-spin text-[rgba(217,102,58,0.92)]"
        size={32}
      />
      <p className="font-medium">{label}</p>
    </div>
  </Surface>
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
  const [inputValue, setInputValue] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] =
    useState<WorkspaceTab>("itinerary");

  useEffect(() => {
    if (!trip && !isRefining) {
      const timer = setTimeout(() => onNavigateHome(), 0);
      return () => clearTimeout(timer);
    }
  }, [trip, isRefining, onNavigateHome]);

  useEffect(() => {
    setActiveWorkspaceTab("itinerary");
  }, [tripId]);

  if (!trip) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center bg-[rgba(255,250,245,0.66)] backdrop-blur-xl">
        <Loader2
          className="animate-spin text-[rgba(217,102,58,0.92)]"
          size={32}
        />
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
      role: "user",
      text: inputValue,
      timestamp: Date.now(),
    };
    const updatedMessages = [...trip.messages, userMsg];

    updateTrip({ ...trip, messages: updatedMessages });
    setInputValue("");
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
      alert(getErrorMessage(error, "Failed to update itinerary."));
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

      {activeWorkspaceTab === "itinerary" ? (
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3 md:bottom-5 md:px-4">
          <div className="pointer-events-auto w-full max-w-full md:max-w-2xl">
            <form onSubmit={handleRefine} className="group relative">
              <div className="absolute inset-0 rounded-[0.7rem] border border-[rgba(228,215,201,0.95)] bg-[rgba(255,250,245,0.97)] shadow-[0_14px_36px_rgba(108,62,26,0.12)]" />
              <div className="relative flex items-center p-1.5">
                <div className="pl-2.5 pr-2 text-[rgba(217,102,58,0.92)]">
                  {isRefining ? (
                    <Sparkles className="animate-spin-slow" size={18} />
                  ) : (
                    <LayoutList size={18} />
                  )}
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
                  className="field-focus h-11 w-full rounded-[0.45rem] border border-transparent bg-transparent px-1 text-sm font-medium text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(118,77,54,0.58)] md:text-base"
                  disabled={isRefining}
                />
                <Button
                  type="submit"
                  disabled={!inputValue.trim() || isRefining}
                  size="icon"
                  aria-label="Refine itinerary"
                  className="border-[rgba(214,98,54,0.2)] p-2 disabled:opacity-50"
                >
                  <SendHorizontal size={16} />
                </Button>
              </div>
              {isRefining ? (
                <div className="animate-progress absolute bottom-0 left-2 right-2 h-[2px] bg-[rgba(230,106,63,0.72)]" />
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

interface AppContentProps {
  currentTripId: string | null;
  isProfilePage: boolean;
  navigate: (path: string) => void;
}

const AppContent: React.FC<AppContentProps> = ({
  currentTripId,
  isProfilePage,
  navigate,
}) => {
  const {
    actions: { setTravelerName },
    state: { authUser, travelerName },
  } = useAppAuth();
  const [trips, setTrips] = useState<TripSession[]>(() =>
    loadTrips(authUser.uid),
  );
  const [loadedTripsUserId, setLoadedTripsUserId] = useState(authUser.uid);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);

  useEffect(() => {
    if (loadedTripsUserId === authUser.uid) {
      return;
    }

    setTrips(loadTrips(authUser.uid));
    setLoadedTripsUserId(authUser.uid);
  }, [authUser.uid, loadedTripsUserId]);

  useEffect(() => {
    if (loadedTripsUserId !== authUser.uid) {
      return;
    }

    saveTrips(authUser.uid, trips);
  }, [authUser.uid, loadedTripsUserId, trips]);

  const handleCreateTrip = useCallback(
    async (prompt: string) => {
      if (isGeneratingTrip) {
        return;
      }

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
          messages: [{ role: "user", text: prompt, timestamp }],
          currentItinerary: itinerary,
        };

        setTrips((prev) => [newTrip, ...prev]);
        navigate(`/t/${newId}`);
      } catch (error) {
        console.error(error);
        alert(getErrorMessage(error, "Failed to plan trip. Please try again."));
      } finally {
        setIsGeneratingTrip(false);
      }
    },
    [isGeneratingTrip, navigate],
  );

  const updateTrip = useCallback((updatedTrip: TripSession) => {
    setTrips((prev) =>
      prev.map((trip) => (trip.id === updatedTrip.id ? updatedTrip : trip)),
    );
  }, []);

  const deleteTrip = useCallback(
    (id: string) => {
      setTrips((prev) => prev.filter((trip) => trip.id !== id));
      if (currentTripId === id) {
        navigate("/");
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

      navigate("/");
    },
    [navigate],
  );

  if (currentTripId) {
    return (
      <div className="min-h-0 flex-1">
        <TripPage
          tripId={currentTripId}
          trips={trips}
          updateTrip={updateTrip}
          onNavigateHome={() => navigate("/")}
        />
      </div>
    );
  }

  if (isProfilePage) {
    return (
      <ProfilePage
        authUser={authUser}
        onOpenTrip={(tripId) => navigateToTrip(tripId)}
        onTravelerNameChange={setTravelerName}
        travelerName={travelerName}
        trips={trips}
      />
    );
  }

  return (
    <HomePage
      isGenerating={isGeneratingTrip}
      onDeleteTrip={deleteTrip}
      onOpenTrip={(tripId) => navigateToTrip(tripId)}
      onSearch={handleCreateTrip}
      trips={trips}
    />
  );
};

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window === "undefined" ? "/" : window.location.hash || "/",
  );

  const navigate = useCallback((path: string) => {
    const hashPath = path.startsWith("/") ? `#${path}` : `#/${path}`;
    if (window.location.hash !== hashPath) {
      window.location.hash = hashPath;
    }

    startTransition(() => {
      setCurrentPath(hashPath);
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || "/");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const getTripIdFromPath = (path: string): string | null => {
    const cleanPath = path.startsWith("#") ? path.substring(1) : path;
    const match = cleanPath.match(/^\/t\/(.+)$/);
    return match ? match[1] : null;
  };

  const cleanPath = currentPath.startsWith("#")
    ? currentPath.substring(1)
    : currentPath;
  const currentTripId = getTripIdFromPath(currentPath);
  const isProfilePage = cleanPath === "/profile";
  const isHomePage = !currentTripId && !isProfilePage;

  return (
    <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
      <AppAuthShell
        isHomePage={isHomePage}
        onNavigateHome={() => navigate("/")}
        onOpenProfile={() => navigate("/profile")}
        onSignedOut={() => navigate("/")}
        onStartNewTrip={() => navigate("/")}
      >
        <AppContent
          currentTripId={currentTripId}
          isProfilePage={isProfilePage}
          navigate={navigate}
        />
      </AppAuthShell>

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
