import { cn } from "@/lib/utils";
import type { User } from "firebase/auth";
import { LogOut, Plus, UserRound } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Surface from "./Surface";

const APP_LOGO_SRC = "/logo.svg";

export interface AppHeaderProps {
  /**
   * Currently authenticated user. If null, only logo/branding shows (no nav/profile).
   */
  authUser: User | null;

  /**
   * Whether an auth operation is in progress (sign in/out)
   */
  isAuthBusy: boolean;

  /**
   * Whether the current page is the home page. Affects styling (dark mode vs light).
   */
  isHomePage: boolean;

  /**
   * Whether the current page is the saved trips page. Hides the "Saved trips" nav button.
   */
  isSavedTripsPage: boolean;

  /**
   * Display name for the currently authenticated user.
   */
  travelerName: string;

  /**
   * Callback when user clicks the logo/home button.
   */
  onNavigateHome: () => void;

  /**
   * Callback when user clicks profile in the account menu.
   */
  onOpenProfile: () => void;

  /**
   * Callback when user clicks "Saved trips" in the nav.
   */
  onOpenSavedTrips: () => void;

  /**
   * Callback when user clicks "Sign out" in the account menu.
   */
  onSignOut: () => Promise<void>;
}

/**
 * AppHeader — App-wide header/navigation component
 *
 * Features:
 * - Logo + branding (responsive sizing)
 * - Conditional nav buttons (New Trip, Saved trips) on desktop when authenticated
 * - Profile dropdown with user menu (Profile, Sign out)
 * - Context-aware styling (dark on home page, light on other pages)
 * - Keyboard navigation (Escape to close menu)
 * - Click-outside detection for menu dismissal
 *
 * Usage:
 * ```tsx
 * <AppHeader
 *   authUser={user}
 *   isAuthBusy={false}
 *   isHomePage={true}
 *   isSavedTripsPage={false}
 *   travelerName="Alex"
 *   onNavigateHome={() => navigate('/')}
 *   onOpenProfile={() => navigate('/profile')}
 *   onOpenSavedTrips={() => navigate('/saved-trips')}
 *   onSignOut={() => signOut()}
 * />
 * ```
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
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

  // Handle menu dismissal on outside click and Escape key
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

export default AppHeader;
