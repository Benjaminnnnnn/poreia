import { useAppNavigation } from "@/app/navigation";
import AppHeader from "@/components/ui/AppHeader";
import { auth, signInWithGoogle, signOutUser } from "@/lib/firebase";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "@/services/profileService";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
    state: { isHomePage, isSavedTripsPage, isProfilePage },
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
        isHomePage={isHomePage || isProfilePage}
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
