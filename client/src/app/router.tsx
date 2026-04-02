import React from "react";
import RouteErrorBoundary from "@/app/boundaries/RouteErrorBoundary";
import { useAppNavigation } from "@/app/navigation";
import HomeRoute from "@/routes/home/HomeRoute";
import ProfileRoute from "@/routes/profile/ProfileRoute";
import TripRoute from "@/routes/trips/TripRoute";

const AppRouter: React.FC = () => {
  const {
    state: { currentTripId, isProfilePage },
  } = useAppNavigation();

  if (currentTripId) {
    return (
      <RouteErrorBoundary
        key={`trip:${currentTripId}`}
        description="Return home and reopen the trip once the app is back in a clean state."
        title="This trip view ran into a problem."
      >
        <TripRoute tripId={currentTripId} />
      </RouteErrorBoundary>
    );
  }

  if (isProfilePage) {
    return (
      <RouteErrorBoundary
        key="profile"
        description="Return to the home view and reopen your profile from the account menu."
        title="The profile view is unavailable right now."
      >
        <ProfileRoute />
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary
      key="home"
      actionLabel="Reset home view"
      description="Reset the home screen and start again from a clean state."
      title="The home view is unavailable right now."
    >
      <HomeRoute />
    </RouteErrorBoundary>
  );
};

export default AppRouter;
