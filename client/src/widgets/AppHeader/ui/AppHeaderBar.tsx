"use client";

import AppHeader from "./AppHeader";
import { useAppHeaderState } from "@/entities/auth/model/AuthProvider";
import { routes } from "@/shared/lib/routes";
import { usePathname } from "next/navigation";

export function AppHeaderBar() {
  const {
    authUser,
    isAuthBusy,
    travelerName,
    onNavigateHome,
    onOpenSavedTrips,
    onOpenProfile,
    onSignOut,
    openAuthModal,
  } = useAppHeaderState();
  const pathname = usePathname();

  return (
    <AppHeader
      activePage={pathname === routes.home() ? "home" : pathname === routes.trips() ? "trips" : undefined}
      authUser={authUser}
      isAuthBusy={isAuthBusy}
      travelerName={travelerName}
      onNavigateHome={onNavigateHome}
      onOpenProfile={onOpenProfile}
      onOpenSavedTrips={onOpenSavedTrips}
      onSignOut={onSignOut}
      onSignIn={openAuthModal}
    />
  );
}
