"use client";

import AppHeader from "@/components/ui/AppHeader";
import { useAppHeaderState } from "@/app/auth";
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
  } = useAppHeaderState();
  const pathname = usePathname();

  return (
    <AppHeader
      authUser={authUser}
      isAuthBusy={isAuthBusy}
      isHomePage={pathname === "/"}
      isSavedTripsPage={pathname === "/trips"}
      travelerName={travelerName}
      onNavigateHome={onNavigateHome}
      onOpenProfile={onOpenProfile}
      onOpenSavedTrips={onOpenSavedTrips}
      onSignOut={onSignOut}
    />
  );
}
