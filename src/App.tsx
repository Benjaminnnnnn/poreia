import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import {
  Compass,
  LayoutList,
  Loader2,
  LogOut,
  Plus,
  SendHorizontal,
  Sparkles,
} from "lucide-react";
import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import SearchOverlay from "./components/SearchOverlay";
import { auth, signInWithGoogle, signOutUser } from "./lib/firebase";
import { generateOrRefineItinerary } from "./services/itineraryService";
import { ChatMessage, TravelItinerary, TripSession } from "./types";

const ItineraryResult = lazy(() => import("./components/ItineraryResult"));
const TRIPS_STORAGE_KEY = "poreia_trips";
const TRIPS_STORAGE_VERSION = 1;
const SIGN_IN_BACKGROUND_VIDEO_URL =
  "https://www.pexels.com/download/video/31491830/";

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
  <div
    className={`flex items-center justify-center bg-[rgba(255,250,245,0.72)] backdrop-blur-xl ${className}`}
  >
    <div className="flex flex-col items-center gap-3 text-[rgba(92,58,36,0.96)]">
      <Loader2
        className="animate-spin text-[rgba(217,102,58,0.92)]"
        size={32}
      />
      <p className="font-medium">{label}</p>
    </div>
  </div>
);

const GoogleMark: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M21.8 12.23c0-.72-.06-1.25-.19-1.81H12v3.41h5.64c-.11.85-.7 2.14-2 3l-.02.11 2.72 2.11.19.02c1.77-1.64 2.79-4.04 2.79-6.84Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.76 0 5.08-.91 6.77-2.48l-3.23-2.5c-.87.61-2.03 1.04-3.54 1.04-2.71 0-5-1.78-5.82-4.25l-.1.01-2.83 2.19-.03.09A10.22 10.22 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M6.18 13.81A6.14 6.14 0 0 1 5.84 12c0-.63.12-1.24.33-1.81l-.01-.12-2.86-2.22-.09.04A10.07 10.07 0 0 0 2 12c0 1.47.35 2.86.98 4.1l3.2-2.29Z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.94c1.9 0 3.18.82 3.91 1.5l2.85-2.78C17.07 3.09 14.76 2 12 2a10.22 10.22 0 0 0-9.01 5.89l3.3 2.3C7 7.72 9.29 5.94 12 5.94Z"
      fill="#EA4335"
    />
  </svg>
);

interface AppHeaderProps {
  authUser: User | null;
  isAuthBusy: boolean;
  isHomePage: boolean;
  onNavigateHome: () => void;
  onSignOut: () => Promise<void>;
  onStartNewTrip: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  authUser,
  isAuthBusy,
  isHomePage,
  onNavigateHome,
  onSignOut,
  onStartNewTrip,
}) => {
  const travelerName =
    authUser?.displayName?.trim() ||
    authUser?.email?.split("@")[0] ||
    "Traveler";
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const fallbackInitial = travelerName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isAccountMenuOpen]);

  return (
    <header className="shrink-0 border-b border-[rgba(229,218,204,0.96)] bg-[rgba(252,248,242,0.96)] px-4 py-2.5 sm:px-5 lg:px-6">
      <div className="flex min-h-[3.4rem] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <p className="truncate font-display text-[1.3rem] leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.97)] sm:text-[1.45rem]">
              Poreia
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {authUser ? (
            <>
              {!isHomePage ? (
                <button
                  type="button"
                  onClick={onStartNewTrip}
                  className="inline-flex min-h-[38px] items-center gap-2 rounded-[0.55rem] border border-[rgba(214,98,54,0.18)] bg-[rgba(230,106,63,0.96)] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[rgba(217,98,56,1)]"
                >
                  <Plus size={15} />
                  New trip
                </button>
              ) : null}

              <div ref={accountMenuRef} className="relative ml-1 shrink-0">
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(229,214,198,0.98)] bg-[rgba(255,250,245,0.94)] shadow-[0_10px_24px_rgba(120,78,42,0.08)] transition-transform duration-150 hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(224,146,94,0.42)]"
                >
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={`${travelerName} profile`}
                      className="h-9 w-9 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(230,106,63,0.14)] text-sm font-semibold text-[rgba(191,94,53,0.92)]">
                      {fallbackInitial}
                    </span>
                  )}
                </button>

                {isAccountMenuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.65rem)] z-30 min-w-[12rem] rounded-[1rem] border border-[rgba(229,214,198,0.98)] bg-[rgba(255,251,246,0.96)] p-2 shadow-[0_24px_48px_rgba(120,78,42,0.14)] backdrop-blur-[10px]">
                    <div className="border-b border-[rgba(237,225,211,0.92)] px-3 pb-2 pt-1">
                      <p className="truncate text-sm font-semibold text-[rgba(88,57,39,0.94)]">
                        {travelerName}
                      </p>
                      {authUser.email ? (
                        <p className="truncate text-xs text-[rgba(120,83,61,0.76)]">
                          {authUser.email}
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsAccountMenuOpen(false);
                        await onSignOut();
                      }}
                      disabled={isAuthBusy}
                      className="mt-2 inline-flex w-full items-center gap-2 rounded-[0.8rem] px-3 py-2.5 text-sm font-semibold text-[rgba(103,67,46,0.9)] transition-colors hover:bg-[rgba(247,239,228,0.82)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
};

interface AuthGateProps {
  errorMessage: string | null;
  isSigningIn: boolean;
  onSignIn: () => Promise<void>;
}

const AuthGate: React.FC<AuthGateProps> = ({
  errorMessage,
  isSigningIn,
  onSignIn,
}) => (
  <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-6 sm:px-6 lg:px-8">
    <div className="absolute inset-0 overflow-hidden">
      <video
        className="h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src={SIGN_IN_BACKGROUND_VIDEO_URL} type="video/mp4" />
      </video>
      {/* <div className="absolute inset-0 bg-[rgba(246,238,228,0.10)]" /> */}
    </div>

    <div className="relative z-10 w-full max-w-[34rem] rounded-[1.8rem] border border-[rgba(230,216,200,0.72)] bg-[rgba(255,251,246,0.58)] px-5 py-6 shadow-[0_26px_70px_rgba(134,83,37,0.14)] backdrop-blur-[10px] sm:px-7 sm:py-8">
      <div>
        <h1 className="font-display text-[clamp(2.2rem,5vw,3.8rem)] leading-[0.94] tracking-[-0.055em] text-[rgba(74,43,26,0.98)]">
          Sign in to continue.
        </h1>
        <p className="mt-3 max-w-md text-[0.98rem] leading-7 text-[rgba(104,69,47,0.78)]">
          Use Google to open your AI travel planner.
        </p>
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onSignIn}
            disabled={isSigningIn}
            className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-[1rem] border border-[rgba(225,207,188,0.96)] bg-[rgba(255,252,248,0.98)] px-5 py-3 text-base font-semibold text-[rgba(84,54,37,0.94)] shadow-[0_16px_40px_rgba(129,84,46,0.12)] transition-all hover:-translate-y-[1px] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? (
              <Loader2
                className="animate-spin text-[rgba(217,102,58,0.92)]"
                size={18}
              />
            ) : (
              <GoogleMark className="h-[18px] w-[18px]" />
            )}
            Continue with Google
          </button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-[1rem] border border-[rgba(226,172,145,0.55)] bg-[rgba(255,241,235,0.92)] px-4 py-3 text-sm font-medium text-[rgba(150,69,45,0.92)]">
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  </section>
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
                <div className="animate-progress absolute bottom-0 left-2 right-2 h-[2px] bg-[rgba(230,106,63,0.72)]" />
              ) : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default function App() {
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isGeneratingTrip, setIsGeneratingTrip] = useState(false);
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setTrips(loadTrips(user?.uid ?? null));
      setIsAuthReady(true);
      setAuthError(null);

      if (!user) {
        navigate("/");
      }
    });

    return unsubscribe;
  }, [navigate]);

  useEffect(() => {
    if (!isAuthReady || !authUser) {
      return;
    }

    saveTrips(authUser.uid, trips);
  }, [authUser, isAuthReady, trips]);

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

  const currentTripId = getTripIdFromPath(currentPath);
  const currentTrip = useMemo(
    () => trips.find((trip) => trip.id === currentTripId) ?? null,
    [currentTripId, trips],
  );
  const isHomePage = !currentTripId;

  const handleSignIn = useCallback(async () => {
    setAuthError(null);
    setIsAuthBusy(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setAuthError(
        getErrorMessage(error, "Could not sign you in with Google."),
      );
    } finally {
      setIsAuthBusy(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setAuthError(null);
    setIsAuthBusy(true);

    try {
      await signOutUser();
    } catch (error) {
      console.error(error);
      alert(
        getErrorMessage(error, "Could not sign you out. Please try again."),
      );
    } finally {
      setIsAuthBusy(false);
    }
  }, []);

  const handleCreateTrip = useCallback(
    async (prompt: string) => {
      if (!authUser) {
        setAuthError("Sign in with Google before creating a trip.");
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
      } catch (e) {
        console.error(e);
        alert(getErrorMessage(e, "Failed to plan trip. Please try again."));
      } finally {
        setIsGeneratingTrip(false);
      }
    },
    [authUser, navigate],
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

  return (
    <div className="app-summer relative h-[100dvh] w-full overflow-hidden bg-[rgb(248,245,240)] font-sans text-slate-900">
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <AppHeader
          authUser={authUser}
          isAuthBusy={isAuthBusy}
          isHomePage={isHomePage}
          onNavigateHome={() => navigate("/")}
          onSignOut={handleSignOut}
          onStartNewTrip={() => navigate("/")}
        />

        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {!isAuthReady ? (
              <SurfaceFallback
                className="h-full"
                label="Checking your traveler pass..."
              />
            ) : !authUser ? (
              <AuthGate
                errorMessage={authError}
                isSigningIn={isAuthBusy}
                onSignIn={handleSignIn}
              />
            ) : currentTripId ? (
              <div className="min-h-0 flex-1">
                <TripPage
                  tripId={currentTripId}
                  trips={trips}
                  updateTrip={updateTrip}
                  onNavigateHome={() => navigate("/")}
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
