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
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Loader2,
  LogOut,
  Plus,
  UserRound,
} from "lucide-react";
import React, {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const SIGN_IN_BACKGROUND_VIDEO_URL = "/background-web.mp4";
const APP_LOGO_SRC = "/logo.svg";
const AUTH_GATE_REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

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
            "focus-ring flex min-w-0 items-center gap-3 rounded-full px-1 py-1 text-left transition-colors duration-150",
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

interface TravelerPassCardProps extends AuthGateProps {
  prefersReducedMotion: boolean;
}

const TravelerPassCard: React.FC<TravelerPassCardProps> = ({
  errorMessage,
  isSigningIn,
  onSignIn,
  prefersReducedMotion,
}) => {
  const rotateX = useSpring(0, { stiffness: 120, damping: 18, mass: 0.9 });
  const rotateY = useSpring(0, { stiffness: 120, damping: 18, mass: 0.9 });
  const glowX = useSpring(50, { stiffness: 120, damping: 18, mass: 0.9 });
  const glowY = useSpring(50, { stiffness: 120, damping: 18, mass: 0.9 });
  const passGlow = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255,255,255,0.96) 0%, rgba(255,247,238,0.62) 16%, rgba(255,255,255,0) 48%)`;

  const resetTilt = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    glowX.set(50);
    glowY.set(50);
  }, [glowX, glowY, rotateX, rotateY]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || isSigningIn) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const pointerX = (event.clientX - rect.left) / rect.width;
      const pointerY = (event.clientY - rect.top) / rect.height;

      rotateX.set((0.5 - pointerY) * 10);
      rotateY.set((pointerX - 0.5) * 14);
      glowX.set(pointerX * 100);
      glowY.set(pointerY * 100);
    },
    [glowX, glowY, isSigningIn, prefersReducedMotion, rotateX, rotateY],
  );

  const handlePointerLeave = useCallback(() => {
    if (prefersReducedMotion) {
      return;
    }

    resetTilt();
  }, [prefersReducedMotion, resetTilt]);

  const statusLabel = isSigningIn
    ? "Verifying traveler identity"
    : "Traveler pass ready";

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 24, rotate: -2 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ duration: 0.85, ease: AUTH_GATE_REVEAL_EASE, delay: 0.12 }}
      className="relative mx-auto w-full max-w-[34rem]"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-[12%] top-8 h-24 rounded-full bg-[radial-gradient(circle,rgba(237,152,92,0.34)_0%,rgba(237,152,92,0.08)_58%,rgba(237,152,92,0)_100%)] blur-2xl"
        animate={
          prefersReducedMotion
            ? { opacity: 0.85 }
            : {
                opacity: [0.72, 1, 0.8],
                scale: [0.98, 1.03, 0.99],
              }
        }
        transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={
          prefersReducedMotion
            ? undefined
            : {
                rotateX,
                rotateY,
                transformPerspective: 1600,
                transformStyle: "preserve-3d",
              }
        }
        animate={
          prefersReducedMotion
            ? { y: 0, scale: 1 }
            : isSigningIn
              ? { y: -4, scale: 0.992 }
              : { y: [0, -6, 0], scale: 1 }
        }
        transition={
          isSigningIn
            ? { duration: 0.42, ease: AUTH_GATE_REVEAL_EASE }
            : { duration: 8.6, repeat: Infinity, ease: "easeInOut" }
        }
        className="relative overflow-hidden rounded-[2rem] border border-[rgba(236,215,194,0.84)] bg-[linear-gradient(135deg,rgba(255,252,247,0.92)_0%,rgba(248,238,228,0.96)_48%,rgba(244,231,220,0.94)_100%)] p-[1px] shadow-[0_34px_100px_rgba(122,76,42,0.18)]"
      >
        <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-[linear-gradient(160deg,rgba(255,252,248,0.98)_0%,rgba(251,242,233,0.98)_48%,rgba(245,235,225,0.98)_100%)] px-5 pb-5 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{ background: passGlow }}
          />
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -left-[24%] top-[-8%] h-[130%] w-[42%] rotate-[18deg] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.72)_42%,rgba(255,245,235,0.22)_72%,rgba(255,255,255,0)_100%)] opacity-65 blur-xl"
            animate={
              prefersReducedMotion ? { x: "42%" } : { x: ["-10%", "185%"] }
            }
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative mt-8">
            <p className="mt-2 max-w-[12ch] font-display text-[clamp(2.4rem,5vw,3.55rem)] leading-[0.9] tracking-[-0.08em] text-[rgba(79,45,27,0.98)]">
              Enter Poreia with your traveler pass.
            </p>
            <p className="mt-4 max-w-[30rem] text-[0.98rem] leading-7 text-[rgba(108,71,49,0.8)]">
              Sign in with Google to recover saved trips and start shaping your
              next itinerary immediately.
            </p>
          </div>

          <div className="relative mt-6">
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 border-t border-dashed border-[rgba(216,193,173,0.9)]" />
            <div className="absolute -left-8 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-[rgba(247,240,231,0.96)]" />
            <div className="absolute -right-8 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-[rgba(247,240,231,0.96)]" />
          </div>

          <div className="relative mt-9 grid gap-3">
            <div className="grid grid-cols-2 gap-2 text-[0.72rem] text-[rgba(112,75,53,0.82)] sm:grid-cols-3">
              <span className="flex min-h-[2.6rem] items-center justify-center rounded-full border border-[rgba(234,216,198,0.9)] bg-[rgba(255,252,248,0.72)] px-2.5 py-1.5 text-center leading-5">
                Plan trip in one tap
              </span>
              <span className="flex min-h-[2.6rem] items-center justify-center rounded-full border border-[rgba(234,216,198,0.9)] bg-[rgba(255,252,248,0.72)] px-2.5 py-1.5 text-center leading-5">
                No setup flow
              </span>
              <span className="col-span-2 flex min-h-[2.6rem] items-center justify-center rounded-full border border-[rgba(234,216,198,0.9)] bg-[rgba(255,252,248,0.72)] px-2.5 py-1.5 text-center leading-5 sm:col-span-1">
                Travel with your friends
              </span>
            </div>

            <motion.button
              type="button"
              onClick={() => {
                void onSignIn();
              }}
              disabled={isSigningIn}
              whileHover={
                prefersReducedMotion || isSigningIn
                  ? undefined
                  : { y: -2, scale: 1.01 }
              }
              whileTap={
                prefersReducedMotion || isSigningIn
                  ? undefined
                  : { scale: 0.99 }
              }
              className="focus-ring relative flex min-h-[66px] w-full items-center overflow-hidden rounded-[1.35rem] border border-[rgba(213,121,74,0.88)] bg-[linear-gradient(135deg,rgba(224,116,68,0.96)_0%,rgba(214,99,55,0.98)_45%,rgba(194,88,51,0.98)_100%)] px-4 py-3 text-left text-white shadow-[0_18px_36px_rgba(183,94,54,0.26)] transition-[transform,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-80 sm:px-5"
            >
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0)_18%,rgba(255,230,205,0.26)_46%,rgba(255,255,255,0)_72%)]"
                animate={
                  prefersReducedMotion
                    ? { opacity: 0.3 }
                    : { x: ["-115%", "135%"] }
                }
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span className="relative flex min-w-0 flex-1 items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(255,224,206,0.38)] bg-[rgba(255,255,255,0.14)] backdrop-blur-sm sm:h-11 sm:w-11">
                  {isSigningIn ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <GoogleMark className="h-[18px] w-[18px]" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.02rem] tracking-[-0.02em]">
                    {isSigningIn
                      ? "Validating traveler pass"
                      : "Continue with Google"}
                  </span>
                </span>
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
                className="relative ml-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(255,224,206,0.24)] bg-[rgba(255,255,255,0.12)] sm:h-11 sm:w-11"
              >
                <ArrowRight size={18} />
              </motion.span>
            </motion.button>
          </div>

          <AnimatePresence>
            {isSigningIn ? (
              <motion.div
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, scale: 0.88, rotate: -8 }
                }
                animate={{ opacity: 1, scale: 1, rotate: -8 }}
                exit={{ opacity: 0, scale: 0.92, rotate: -8 }}
                transition={{ duration: 0.38, ease: AUTH_GATE_REVEAL_EASE }}
                className="pointer-events-none absolute right-4 top-[41%] z-20 rounded-[1.2rem] border border-[rgba(214,108,64,0.24)] bg-[rgba(255,243,232,0.9)] px-4 py-2 text-center shadow-[0_18px_42px_rgba(181,92,52,0.18)] backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-[rgba(185,94,53,0.92)]">
                  <BadgeCheck size={16} />
                  <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em]">
                    Cleared to Enter
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {errorMessage ? (
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: AUTH_GATE_REVEAL_EASE }}
          >
            <Surface
              as="div"
              variant="subtle"
              padding="none"
              radius="lg"
              className="mt-4 border-[rgba(226,172,145,0.55)] bg-[rgba(255,241,235,0.92)] px-4 py-3 text-sm font-medium text-[rgba(150,69,45,0.92)]"
            >
              {errorMessage}
            </Surface>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};

const AuthGate: React.FC<AuthGateProps> = ({
  errorMessage,
  isSigningIn,
  onSignIn,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,216,178,0.34)_0%,rgba(255,241,226,0)_38%),radial-gradient(circle_at_88%_12%,rgba(112,177,170,0.18)_0%,rgba(112,177,170,0)_24%),linear-gradient(180deg,rgba(247,240,231,0.12)_0%,rgba(247,240,231,0.56)_100%)]" />
      </div>

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: AUTH_GATE_REVEAL_EASE }}
        className="relative z-10 w-full max-w-[34rem]"
      >
        <TravelerPassCard
          errorMessage={errorMessage}
          isSigningIn={isSigningIn}
          onSignIn={onSignIn}
          prefersReducedMotion={prefersReducedMotion}
        />
      </motion.div>
    </section>
  );
};

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
