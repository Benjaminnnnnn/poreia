"use client";

import { signInWithGoogle, signOutUser, supabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "@/services/profileService";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ============================================================
// Helpers
// ============================================================

const getDefaultTravelerName = (user: User | null) =>
  (user?.user_metadata?.full_name as string | undefined)?.trim() ||
  user?.email?.split("@")[0] ||
  "Traveler";

const getResolvedTravelerName = (
  user: User | null,
  travelerName?: string | null,
) => travelerName?.trim() || getDefaultTravelerName(user);

// ============================================================
// Broad auth context — available to any component inside AuthRoute,
// regardless of authentication status. Used by AppHeaderBar.
// ============================================================

export interface AppAuthBroadContextValue {
  authUser: User | null;
  isAuthBusy: boolean;
  travelerName: string;
  onNavigateHome: () => void;
  onOpenSavedTrips: () => void;
  onOpenProfile: () => void;
  onSignOut: () => Promise<void>;
  openAuthModal: () => void;
}

const AppAuthBroadContext = createContext<AppAuthBroadContextValue | null>(
  null,
);

export const useAppHeaderState = (): AppAuthBroadContextValue => {
  const ctx = use(AppAuthBroadContext);
  if (!ctx)
    throw new Error("useAppHeaderState must be used within AuthRoute");
  return ctx;
};

// ============================================================
// Google mark SVG
// ============================================================

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

// ============================================================
// Auth modal — shown as overlay when unauthenticated user tries
// to perform an action that requires sign-in.
// ============================================================

interface AuthModalProps {
  errorMessage: string | null;
  isSigningIn: boolean;
  onClose: () => void;
  onSignIn: () => Promise<void>;
}

const AuthModal: React.FC<AuthModalProps> = ({
  errorMessage,
  isSigningIn,
  onClose,
  onSignIn,
}) => {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to Poreia"
    >
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-full max-w-[680px] overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
        >
          <X size={16} />
        </button>

        {/* Left: marketing panel */}
        <div className="relative hidden w-[42%] flex-col overflow-hidden md:flex">
          <img
            src="https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=800&q=80"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/75 to-slate-700/60" />
          <div className="relative z-10 flex h-full flex-col justify-end p-8 pb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Your itinerary, your way
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">
              Plan your next adventure with AI
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Describe where you want to go. Poreia builds a full itinerary in
              seconds.
            </p>
          </div>
        </div>

        {/* Right: sign-in panel */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 md:py-16">
          <div className="mb-8 flex flex-col items-center">
            <img
              src="/logo.svg"
              alt="Poreia"
              className="mb-4 h-12 w-12 object-contain"
            />
            <h1 className="text-xl font-semibold text-slate-900">
              Welcome to Poreia
            </h1>
            <p className="mt-1.5 text-center text-sm text-slate-500">
              Sign in to start planning your trip
            </p>
          </div>

          <div className="w-full max-w-[260px]">
            <button
              type="button"
              onClick={() => void onSignIn()}
              disabled={isSigningIn}
              className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSigningIn ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#D97757]" />
              ) : (
                <GoogleMark className="h-5 w-5 shrink-0" />
              )}
              <span className="flex-1 text-center">
                {isSigningIn ? "Signing in…" : "Continue with Google"}
              </span>
            </button>

            {errorMessage ? (
              <motion.p
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-center text-sm text-red-600"
              >
                {errorMessage}
              </motion.p>
            ) : null}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// Loading fallback
// ============================================================

const AuthLoadingFallback = () => (
  <section className="relative flex min-h-0 flex-1 flex-col w-full overflow-hidden items-center justify-center">
    <div className="absolute inset-0 bg-[rgb(18,14,10)]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,87,0.18),transparent)]" />

    <div className="relative z-10 rounded-[2rem] border border-white/10 bg-white/5 p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col items-center gap-4">
        <Loader2
          className="animate-spin text-[#D97757] drop-shadow-lg"
          size={40}
        />
        <p className="text-sm text-white/60">Loading your itinerary…</p>
      </div>
    </div>
  </section>
);

// ============================================================
// Authenticated page context
// ============================================================

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

// ============================================================
// AuthRoute — app shell (auth state + layout structure)
// ============================================================

interface AuthRouteProps {
  /** Rendered above main content; receives AppAuthBroadContext. */
  header?: React.ReactNode;
  children: React.ReactNode;
}

const AuthRoute: React.FC<AuthRouteProps> = ({ header, children }) => {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [travelerName, setTravelerName] = useState("Traveler");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const authSyncVersionRef = useRef(0);

  useEffect(() => {
    let isCancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      const syncVersion = authSyncVersionRef.current + 1;
      authSyncVersionRef.current = syncVersion;
      setAuthError(null);

      if (!user) {
        setAuthUser(null);
        setTravelerName(getDefaultTravelerName(null));
        setIsAuthReady(true);
        setIsUpdatingProfile(false);
        return;
      }

      setAuthUser(user);
      setTravelerName(getDefaultTravelerName(user));
      setIsAuthReady(false);
      setIsAuthModalOpen(false);

      void (async () => {
        try {
          const profile = await getCurrentUserProfile();
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
      subscription.unsubscribe();
    };
  }, []);

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
        const profile = await updateCurrentUserProfile({
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

  const handleNavigateHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleOpenSavedTrips = useCallback(() => {
    router.push("/trips");
  }, [router]);

  const handleOpenProfile = useCallback(() => {
    router.push("/profile");
  }, [router]);

  const handleOpenAuthModal = useCallback(() => {
    setIsAuthModalOpen(true);
  }, []);

  const handleCloseAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const broadContextValue = useMemo<AppAuthBroadContextValue>(
    () => ({
      authUser,
      isAuthBusy,
      travelerName,
      onNavigateHome: handleNavigateHome,
      onOpenSavedTrips: handleOpenSavedTrips,
      onOpenProfile: handleOpenProfile,
      onSignOut: handleSignOut,
      openAuthModal: handleOpenAuthModal,
    }),
    [
      authUser,
      isAuthBusy,
      travelerName,
      handleNavigateHome,
      handleOpenSavedTrips,
      handleOpenProfile,
      handleSignOut,
      handleOpenAuthModal,
    ],
  );

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
    <AppAuthBroadContext.Provider value={broadContextValue}>
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        {header}
        <main className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {!isAuthReady ? (
              <AuthLoadingFallback />
            ) : (
              <AuthRouteContext.Provider value={authContextValue}>
                {children}
              </AuthRouteContext.Provider>
            )}
          </div>
        </main>
      </div>
      <AnimatePresence>
        {isAuthModalOpen ? (
          <AuthModal
            key="auth-modal"
            errorMessage={authError}
            isSigningIn={isAuthBusy}
            onClose={handleCloseAuthModal}
            onSignIn={handleSignIn}
          />
        ) : null}
      </AnimatePresence>
    </AppAuthBroadContext.Provider>
  );
};

export default AuthRoute;
