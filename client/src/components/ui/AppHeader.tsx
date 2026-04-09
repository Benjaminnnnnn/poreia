import type { User } from "firebase/auth";
import { LogOut, Plus, UserRound } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Button from "./Button";
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
    <header className="absolute left-0 right-0 top-0 z-20 w-full border-b border-white/15 px-4 py-3 sm:px-6 lg:px-8 before:absolute before:inset-0 before:bg-black/20 before:backdrop-blur before:mix-blend-overlay before:-z-10">
      <div className="relative flex min-h-[3.4rem] items-center justify-between gap-3 sm:gap-4">
        {/* Left: circle logo + wordmark */}
        <Button
          type="button"
          variant="ghost"
          onClick={onNavigateHome}
          aria-label="Go to home page"
          className="flex min-w-0 items-center gap-3 rounded-xl px-3 py-1 text-left hover:bg-primary"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <img
              src={APP_LOGO_SRC}
              alt=""
              aria-hidden="true"
              className="h-5 w-5 object-contain"
            />
          </div>

          <p className="font-display text-[1.25rem] leading-none tracking-[-0.04em] text-white sm:text-[1.45rem]">
            Poreia
          </p>
        </Button>

        {/* Right: New Trip + Saved trips + profile */}
        <div className="flex shrink-0 items-center justify-end gap-3">
          {authUser ? (
            <>
              {!isHomePage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onNavigateHome}
                  className="hidden rounded-xl border border-white/25 bg-white/10 px-4 text-white hover:bg-primary hover:border-primary hover:text-white sm:inline-flex sm:items-center sm:gap-1.5"
                >
                  <Plus size={14} />
                  New Trip
                </Button>
              ) : null}

              {!isSavedTripsPage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onOpenSavedTrips}
                  className="hidden rounded-xl border border-white/25 bg-white/10 px-4 text-white hover:bg-primary hover:border-primary hover:text-white sm:inline-flex sm:items-center sm:gap-2"
                >
                  Saved trips
                </Button>
              ) : null}

              <div ref={accountMenuRef} className="relative shrink-0">
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  aria-label="Open account menu"
                  aria-expanded={isAccountMenuOpen}
                  onClick={() => setIsAccountMenuOpen((open) => !open)}
                  className="rounded-full ring-2 ring-transparent transition-all hover:ring-primary focus-visible:ring-0 focus-visible:border-transparent sm:h-11 sm:w-11"
                >
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={`${travelerName} profile`}
                      className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold text-white sm:h-9 sm:w-9">
                      {fallbackInitial}
                    </span>
                  )}
                </Button>

                {isAccountMenuOpen ? (
                  <Surface
                    variant="glass"
                    padding="none"
                    radius="lg"
                    className="absolute right-0 top-[calc(100%+0.65rem)] z-30 min-w-[12rem] p-2 shadow-[0_24px_48px_rgba(120,78,42,0.14)] before:absolute before:inset-0 before:bg-black/20 before:backdrop-blur before:mix-blend-overlay before:-z-10 before:rounded-[inherit]"
                  >
                    <div className="relative z-10 border-b border-[rgba(237,225,211,0.92)] px-3 pb-2 pt-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {travelerName}
                      </p>
                      {authUser.email ? (
                        <p className="truncate text-xs text-white">
                          {authUser.email}
                        </p>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsAccountMenuOpen(false);
                        onOpenProfile();
                      }}
                      className="relative z-10 mt-2 w-full justify-start rounded-[0.8rem] text-white hover:bg-white/15 hover:text-white"
                    >
                      <UserRound size={15} />
                      Profile
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={async () => {
                        setIsAccountMenuOpen(false);
                        await onSignOut();
                      }}
                      disabled={isAuthBusy}
                      className="relative z-10 mt-1 w-full justify-start rounded-[0.8rem] text-white hover:bg-white/15 hover:text-white"
                    >
                      <LogOut size={15} />
                      Sign out
                    </Button>
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
