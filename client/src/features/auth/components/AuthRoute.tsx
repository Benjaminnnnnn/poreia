import { useAppNavigation } from "@/app/navigation";
import Surface from "@/components/ui/Surface";
import { auth, signInWithGoogle, signOutUser } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "@/services/profileService";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2, LogOut, Plus, UserRound } from "lucide-react";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const APP_LOGO_SRC = "/logo.svg";

const getDefaultTravelerName = (user: User | null) =>
  user?.displayName?.trim() || user?.email?.split("@")[0] || "Traveler";

const getResolvedTravelerName = (
  user: User | null,
  travelerName?: string | null,
) => travelerName?.trim() || getDefaultTravelerName(user);

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

interface GoogleMarkProps {
  className?: string;
}

const GoogleMark: React.FC<GoogleMarkProps> = ({ className = "" }) => (
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
  isSavedTripsPage: boolean;
  travelerName: string;
  onNavigateHome: () => void;
  onOpenProfile: () => void;
  onOpenSavedTrips: () => void;
  onSignOut: () => Promise<void>;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  authUser,
  isAuthBusy,
  isHomePage,
  isSavedTripsPage,
  travelerName,
  onNavigateHome,
  onOpenProfile,
  onOpenSavedTrips,
  onSignOut,
}) => {
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
    <header
      className={cn(
        "z-20 w-full px-4 py-3 sm:px-6 lg:px-8 transition-colors duration-300",
        isHomePage
          ? "absolute left-0 right-0 top-0 border-b border-white/20 bg-transparent"
          : "shrink-0 border-b border-[rgba(229,218,204,0.96)] bg-[rgba(252,248,242,0.96)]",
      )}
    >
      <div className="flex min-h-[3.4rem] items-center justify-between gap-3 sm:gap-4">
        {/* Left: circle logo + wordmark */}
        <button
          type="button"
          onClick={onNavigateHome}
          aria-label="Go to home page"
          className={cn(
            "focus-ring flex min-w-0 items-center gap-3 rounded-full px-1 py-1 text-left transition-all duration-200 hover:px-3 sm:hover:px-4",
            isHomePage
              ? "hover:bg-white/10"
              : "hover:bg-[rgba(247,239,228,0.78)]",
          )}
        >
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
              isHomePage
                ? "border-white/30 bg-white/10"
                : "border-[rgba(229,214,198,0.98)] bg-[rgba(255,250,245,0.94)] shadow-[0_4px_12px_rgba(120,78,42,0.08)]",
            )}
          >
            <img
              src={APP_LOGO_SRC}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 object-contain"
            />
          </div>

          <p
            className={cn(
              "font-display text-[1.25rem] leading-none tracking-[-0.04em] sm:text-[1.45rem]",
              isHomePage ? "text-white" : "text-[rgba(74,43,26,0.97)]",
            )}
          >
            Poreia
          </p>
        </button>

        {/* Right: New Trip + Saved trips + profile */}
        <div className="flex shrink-0 items-center justify-end gap-3">
          {authUser ? (
            <>
              {!isHomePage ? (
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="focus-ring hidden rounded-xl border border-[rgba(229,218,204,0.96)] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:bg-primary/90 sm:inline-flex sm:items-center sm:gap-1.5"
                >
                  <Plus size={14} />
                  New Trip
                </button>
              ) : null}

              {!isSavedTripsPage ? (
                <button
                  type="button"
                  onClick={onOpenSavedTrips}
                  className={cn(
                    "focus-ring hidden rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 sm:inline-flex sm:items-center sm:gap-2",
                    isHomePage
                      ? "border-white/30 bg-white/10 text-white hover:bg-white/20"
                      : "border-[rgba(229,218,204,0.96)] bg-transparent text-[rgba(74,43,26,0.97)] hover:bg-[rgba(247,239,228,0.78)]",
                  )}
                >
                  Saved trips
                </button>
              ) : null}

              <div ref={accountMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className={cn(
                    "focus-ring flex h-10 w-10 items-center justify-center rounded-full border transition-transform duration-150 hover:-translate-y-[1px] sm:h-11 sm:w-11",
                    isHomePage
                      ? "border-white/30 bg-white/10"
                      : "border-[rgba(229,214,198,0.98)] bg-[rgba(255,250,245,0.94)] shadow-[0_10px_24px_rgba(120,78,42,0.08)]",
                  )}
                >
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={`${travelerName} profile`}
                      className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold sm:h-9 sm:w-9",
                        isHomePage
                          ? "bg-white/20 text-white"
                          : "bg-[rgba(230,106,63,0.14)] text-[rgba(191,94,53,0.92)]",
                      )}
                    >
                      {fallbackInitial}
                    </span>
                  )}
                </button>

                {isAccountMenuOpen ? (
                  <Surface
                    variant="glass"
                    padding="none"
                    radius="lg"
                    className="absolute right-0 top-[calc(100%+0.65rem)] z-30 min-w-[12rem] p-2 shadow-[0_24px_48px_rgba(120,78,42,0.14)]"
                  >
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
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="focus-ring mt-2 inline-flex min-h-[44px] w-full items-center gap-2 rounded-[0.8rem] px-3 py-2.5 text-sm font-semibold text-[rgba(103,67,46,0.9)] transition-colors hover:bg-[rgba(247,239,228,0.82)]"
                    >
                      <UserRound size={15} />
                      Profile
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        setIsAccountMenuOpen(false);
                        await onSignOut();
                      }}
                      disabled={isAuthBusy}
                      className="focus-ring mt-1 inline-flex min-h-[44px] w-full items-center gap-2 rounded-[0.8rem] px-3 py-2.5 text-sm font-semibold text-[rgba(103,67,46,0.9)] transition-colors hover:bg-[rgba(247,239,228,0.82)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </Surface>
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
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative flex min-h-0 flex-1 flex-col w-full overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2670&auto=format&fit=crop"
          alt="Canyon Landscape"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center justify-center my-auto px-6 sm:px-12 w-full text-center">
        {/* Hero Text */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center max-w-3xl"
        >
          <h1 className="font-serif italic text-white text-5xl sm:text-7xl md:text-[7rem] lg:text-[8rem] tracking-tight mb-4 sm:mb-6 drop-shadow-lg leading-none [font-size:clamp(2.5rem,10vw,8rem)]">
            The world is yours.
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-white/90 tracking-[0.15em] uppercase drop-shadow-md font-medium">
            Shape your next itinerary with Poreia
          </p>
        </motion.div>

        {/* Button Group */}
        <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3">
          <motion.button
            type="button"
            onClick={() => {
              void onSignIn();
            }}
            disabled={isSigningIn}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            whileHover={
              prefersReducedMotion || isSigningIn
                ? undefined
                : { scale: 1.02, y: -2 }
            }
            whileTap={
              prefersReducedMotion || isSigningIn ? undefined : { scale: 0.98 }
            }
            className="focus-ring flex items-center gap-3 sm:gap-4 bg-[#D97757] hover:bg-[#C66546] disabled:opacity-80 disabled:cursor-not-allowed text-white px-2 py-2 pr-5 sm:pr-6 rounded-full transition-colors active:scale-95 shadow-lg"
          >
            <div className="bg-white rounded-full p-2 flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 shrink-0">
              {isSigningIn ? (
                <Loader2 className="animate-spin text-[#D97757]" size={18} />
              ) : (
                <GoogleMark className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              )}
            </div>
            <span className="font-medium text-sm sm:text-base">
              {isSigningIn
                ? "Validating traveler pass"
                : "Continue with Google"}
            </span>
            <motion.span
              aria-hidden="true"
              animate={
                prefersReducedMotion || isSigningIn
                  ? { x: 0 }
                  : { x: [0, 4, 0] }
              }
              transition={{
                duration: 1.9,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative ml-1 sm:ml-2 flex items-center justify-center shrink-0"
            >
              <ArrowRight size={18} />
            </motion.span>
          </motion.button>

          {errorMessage ? (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="bg-red-500/20 border border-red-400/40 text-red-100 px-4 py-3 rounded-lg text-sm max-w-sm backdrop-blur-sm"
            >
              {errorMessage}
            </motion.div>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <div className="relative z-10 pb-4 sm:pb-6 text-center">
        <p className="text-white/60 text-xs tracking-wide">
          © 2026 Poreia Inc. — Terms & Privacy
        </p>
      </div>
    </section>
  );
};

const AuthLoadingFallback = () => (
  <section className="relative flex min-h-0 flex-1 flex-col w-full overflow-hidden items-center justify-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
    {/* Loading Card */}
    <div className="relative z-10 rounded-[2rem] border border-white/20 bg-white/10 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-white drop-shadow-lg" size={40} />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-base sm:text-lg font-medium text-white drop-shadow-md">
            Preparing your traveler pass
          </p>
          <p className="text-sm text-white/80 drop-shadow-md">
            Loading your itinerary...
          </p>
        </div>
      </div>
    </div>
  </section>
);

interface AuthRouteContextValue {
  actions: {
    setTravelerName: (travelerName: string) => Promise<void>;
  };
  state: {
    authUser: User;
    isUpdatingProfile: boolean;
    travelerName: string;
  };
}

const AuthRouteContext = createContext<AuthRouteContextValue | null>(null);

export const useAppAuth = () => {
  const context = use(AuthRouteContext);

  if (!context) {
    throw new Error("useAppAuth must be used within AuthRoute.");
  }

  return context;
};

const AuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    actions: { goHome, openProfile, openSavedTrips },
    state: { isHomePage, isSavedTripsPage },
  } = useAppNavigation();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [travelerName, setTravelerName] = useState("Traveler");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const authSyncVersionRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const syncVersion = authSyncVersionRef.current + 1;
      authSyncVersionRef.current = syncVersion;
      setAuthError(null);

      if (!user) {
        setAuthUser(null);
        setTravelerName(getDefaultTravelerName(null));
        setIsAuthReady(true);
        setIsUpdatingProfile(false);
        goHome();
        return;
      }

      setAuthUser(user);
      setTravelerName(getDefaultTravelerName(user));
      setIsAuthReady(false);

      void (async () => {
        try {
          const profile = await getCurrentUserProfile(user);
          if (isCancelled || authSyncVersionRef.current !== syncVersion) {
            return;
          }

          setTravelerName(getResolvedTravelerName(user, profile.travelerName));
        } catch (error) {
          console.error(error);

          if (isCancelled || authSyncVersionRef.current !== syncVersion) {
            return;
          }

          setTravelerName(getDefaultTravelerName(user));
        } finally {
          if (!isCancelled && authSyncVersionRef.current === syncVersion) {
            setIsAuthReady(true);
          }
        }
      })();
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [goHome]);

  const handleSetTravelerName = useCallback(
    async (nextTravelerName: string) => {
      if (!authUser) {
        return;
      }

      const trimmedTravelerName = nextTravelerName.trim();
      if (!trimmedTravelerName) {
        return;
      }

      setIsUpdatingProfile(true);

      try {
        const profile = await updateCurrentUserProfile(authUser, {
          travelerName: trimmedTravelerName,
        });
        setTravelerName(
          getResolvedTravelerName(authUser, profile.travelerName),
        );
      } catch (error) {
        console.error(error);
        throw error;
      } finally {
        setIsUpdatingProfile(false);
      }
    },
    [authUser],
  );

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

  const authContextValue = useMemo<AuthRouteContextValue | null>(() => {
    if (!authUser) {
      return null;
    }

    return {
      state: {
        authUser,
        isUpdatingProfile,
        travelerName,
      },
      actions: {
        setTravelerName: handleSetTravelerName,
      },
    };
  }, [authUser, handleSetTravelerName, isUpdatingProfile, travelerName]);

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      <AppHeader
        authUser={authUser}
        isAuthBusy={isAuthBusy}
        isHomePage={isHomePage}
        isSavedTripsPage={isSavedTripsPage}
        travelerName={travelerName}
        onNavigateHome={goHome}
        onOpenProfile={openProfile}
        onOpenSavedTrips={openSavedTrips}
        onSignOut={handleSignOut}
      />

      <main className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {!isAuthReady ? (
            <AuthLoadingFallback />
          ) : !authUser || !authContextValue ? (
            <AuthGate
              errorMessage={authError}
              isSigningIn={isAuthBusy}
              onSignIn={handleSignIn}
            />
          ) : (
            <AuthRouteContext.Provider value={authContextValue}>
              {children}
            </AuthRouteContext.Provider>
          )}
        </div>
      </main>
    </div>
  );
};

export default AuthRoute;
