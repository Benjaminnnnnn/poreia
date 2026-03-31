import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { Compass, Loader2, LogOut, Plus, UserRound } from "lucide-react";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { auth, signInWithGoogle, signOutUser } from "../lib/firebase";
import Button from "./ui/Button";
import Surface from "./ui/Surface";

const TRAVELER_NAME_STORAGE_KEY = "poreia_traveler_name";
const SIGN_IN_BACKGROUND_VIDEO_URL = "/background-web.mp4";

const getTravelerNameStorageKey = (userId: string) =>
  `${TRAVELER_NAME_STORAGE_KEY}:${userId}`;

const getDefaultTravelerName = (user: User | null) =>
  user?.displayName?.trim() || user?.email?.split("@")[0] || "Traveler";

const loadTravelerName = (user: User | null): string => {
  if (typeof window === "undefined" || !user?.uid) {
    return getDefaultTravelerName(user);
  }

  try {
    const stored = window.localStorage.getItem(getTravelerNameStorageKey(user.uid));
    return stored?.trim() || getDefaultTravelerName(user);
  } catch {
    return getDefaultTravelerName(user);
  }
};

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
  travelerName: string;
  onNavigateHome: () => void;
  onOpenProfile: () => void;
  onSignOut: () => Promise<void>;
  onStartNewTrip: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  authUser,
  isAuthBusy,
  isHomePage,
  travelerName,
  onNavigateHome,
  onOpenProfile,
  onSignOut,
  onStartNewTrip,
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
    <header className="shrink-0 border-b border-[rgba(229,218,204,0.96)] bg-[rgba(252,248,242,0.96)] px-4 py-2.5 sm:px-5 lg:px-6">
      <div className="flex min-h-[3.4rem] items-center justify-between gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onNavigateHome}
          aria-label="Go to home page"
          className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-[0.7rem] px-1 py-1 text-left transition-colors duration-150 hover:bg-[rgba(247,239,228,0.78)] sm:flex-none sm:gap-3 sm:px-1.5"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.55rem] border border-[rgba(233,208,184,0.96)] bg-[rgba(255,253,249,0.98)] text-[rgba(216,101,58,0.95)] sm:h-9 sm:w-9">
            <Compass size={16} className="sm:h-[17px] sm:w-[17px]" />
          </div>

          <div className="min-w-0">
            <p className="truncate font-display text-[1.12rem] leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.97)] sm:text-[1.45rem]">
              Poreia
            </p>
          </div>
        </button>

        <div className="flex shrink-0 items-center justify-end gap-2">
          {authUser ? (
            <>
              {!isHomePage ? (
                <Button
                  onClick={onStartNewTrip}
                  size="sm"
                  className="px-2.5 sm:px-3"
                >
                  <Plus size={14} className="sm:h-[15px] sm:w-[15px]" />
                  <span className="hidden md:inline">New trip</span>
                </Button>
              ) : null}

              <div ref={accountMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(229,214,198,0.98)] bg-[rgba(255,250,245,0.94)] shadow-[0_10px_24px_rgba(120,78,42,0.08)] transition-transform duration-150 hover:-translate-y-[1px] sm:h-11 sm:w-11"
                >
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={`${travelerName} profile`}
                      className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(230,106,63,0.14)] text-sm font-semibold text-[rgba(191,94,53,0.92)] sm:h-9 sm:w-9">
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
}) => (
  <section className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-6 sm:px-6 lg:px-8">
    <div className="absolute inset-0 overflow-hidden">
      <video
        className="auth-motion-video h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
      >
        <source src={SIGN_IN_BACKGROUND_VIDEO_URL} type="video/mp4" />
      </video>
      <div
        aria-hidden="true"
        className="auth-motion-fallback absolute inset-0 bg-[linear-gradient(135deg,rgba(246,238,228,0.9)_0%,rgba(248,243,236,0.96)_48%,rgba(239,234,224,0.92)_100%)]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,240,231,0.16)_0%,rgba(247,240,231,0.38)_100%)]" />
    </div>

    <Surface
      as="div"
      variant="glass"
      padding="none"
      radius="3xl"
      className="relative z-10 w-full max-w-[35rem] overflow-hidden border-[rgba(230,216,200,0.76)] bg-[rgba(255,251,246,0.62)] shadow-[0_28px_80px_rgba(134,83,37,0.16)] backdrop-blur-[12px]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.78)_50%,rgba(255,255,255,0)_100%)]"
      />

      <div className="px-5 py-6 sm:px-7 sm:py-8">
        <div className="mt-5 max-w-[28rem]">
          <h1 className="font-display text-[clamp(2.4rem,5vw,4.15rem)] leading-[0.9] tracking-[-0.06em] text-[rgba(74,43,26,0.98)]">
            Build your travel plan in a single tap.
          </h1>
          <p className="mt-4 max-w-lg text-[1rem] leading-7 text-[rgba(104,69,47,0.8)] sm:text-[1.02rem]">
            Sign in with Google to open Poreia and turn a rough trip idea into a
            warm, editable itinerary in seconds.
          </p>
        </div>

        <div className="mt-8 grid gap-3 text-[0.82rem] font-medium text-[rgba(116,79,56,0.74)] sm:grid-cols-3">
          <Surface
            as="div"
            variant="subtle"
            padding="none"
            radius="lg"
            className="px-3.5 py-3"
          >
            Start from one sentence
          </Surface>
          <Surface
            as="div"
            variant="subtle"
            padding="none"
            radius="lg"
            className="px-3.5 py-3"
          >
            Refine plans on the go
          </Surface>
          <Surface
            as="div"
            variant="subtle"
            padding="none"
            radius="lg"
            className="px-3.5 py-3"
          >
            Keep every trip in reach
          </Surface>
        </div>

        <Surface
          as="div"
          variant="glass"
          padding="sm"
          radius="xl"
          className="mt-8 bg-[rgba(255,252,248,0.78)] shadow-[0_14px_36px_rgba(129,84,46,0.08)]"
        >
          <Button
            onClick={onSignIn}
            disabled={isSigningIn}
            fullWidth
            size="lg"
            variant="secondary"
            className="rounded-[0.95rem] border-[rgba(225,207,188,0.96)] bg-[rgba(255,252,248,0.98)] text-base text-[rgba(84,54,37,0.94)] hover:-translate-y-[1px] hover:bg-white disabled:opacity-60"
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
          </Button>

          <p className="px-2 pb-1 pt-3 text-center text-[0.8rem] leading-6 text-[rgba(118,80,57,0.72)]">
            No setup flow. Just sign in and start shaping the trip.
          </p>
        </Surface>

        {errorMessage ? (
          <Surface
            as="div"
            variant="subtle"
            padding="none"
            radius="lg"
            className="mt-4 border-[rgba(226,172,145,0.55)] bg-[rgba(255,241,235,0.92)] px-4 py-3 text-sm font-medium text-[rgba(150,69,45,0.92)]"
          >
            {errorMessage}
          </Surface>
        ) : null}
      </div>
    </Surface>
  </section>
);

const AuthLoadingFallback = () => (
  <Surface
    variant="glass"
    padding="none"
    radius="md"
    className="flex h-full items-center justify-center bg-[rgba(255,250,245,0.72)]"
  >
    <div className="flex flex-col items-center gap-3 text-[rgba(92,58,36,0.96)]">
      <Loader2
        className="animate-spin text-[rgba(217,102,58,0.92)]"
        size={32}
      />
      <p className="font-medium">Checking your traveler pass...</p>
    </div>
  </Surface>
);

interface AppAuthContextValue {
  actions: {
    setTravelerName: React.Dispatch<React.SetStateAction<string>>;
  };
  state: {
    authUser: User;
    travelerName: string;
  };
}

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export const useAppAuth = () => {
  const context = use(AppAuthContext);

  if (!context) {
    throw new Error("useAppAuth must be used within AppAuthShell.");
  }

  return context;
};

interface AppAuthShellProps {
  children: React.ReactNode;
  isHomePage: boolean;
  onNavigateHome: () => void;
  onOpenProfile: () => void;
  onSignedOut: () => void;
  onStartNewTrip: () => void;
}

const AppAuthShell: React.FC<AppAuthShellProps> = ({
  children,
  isHomePage,
  onNavigateHome,
  onOpenProfile,
  onSignedOut,
  onStartNewTrip,
}) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [travelerName, setTravelerName] = useState("Traveler");
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setTravelerName(loadTravelerName(user));
      setIsAuthReady(true);
      setAuthError(null);

      if (!user) {
        onSignedOut();
      }
    });

    return unsubscribe;
  }, [onSignedOut]);

  useEffect(() => {
    if (typeof window === "undefined" || !authUser?.uid) {
      return;
    }

    window.localStorage.setItem(
      getTravelerNameStorageKey(authUser.uid),
      travelerName.trim() || getDefaultTravelerName(authUser),
    );
  }, [authUser, travelerName]);

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

  const authContextValue = useMemo<AppAuthContextValue | null>(() => {
    if (!authUser) {
      return null;
    }

    return {
      state: {
        authUser,
        travelerName,
      },
      actions: {
        setTravelerName,
      },
    };
  }, [authUser, travelerName]);

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col">
      <AppHeader
        authUser={authUser}
        isAuthBusy={isAuthBusy}
        isHomePage={isHomePage}
        travelerName={travelerName}
        onNavigateHome={onNavigateHome}
        onOpenProfile={onOpenProfile}
        onSignOut={handleSignOut}
        onStartNewTrip={onStartNewTrip}
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
            <AppAuthContext.Provider value={authContextValue}>
              {children}
            </AppAuthContext.Provider>
          )}
        </div>
      </main>
    </div>
  );
};

export default AppAuthShell;
