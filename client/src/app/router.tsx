import React from "react";
import RouteErrorBoundary from "@/app/boundaries/RouteErrorBoundary";
import { useAppNavigation } from "@/app/navigation";
import HomeRoute from "@/routes/home/HomeRoute";
import ProfileRoute from "@/routes/profile/ProfileRoute";
import SavedTripsRoute from "@/routes/saved-trips/SavedTripsRoute";
import TripRoute from "@/routes/trips/TripRoute";

const AppRouter: React.FC = () => {
  const {
    state: { currentTripId, isProfilePage, isSavedTripsPage },
  } = useAppNavigation();

  if (currentTripId) {
    return (
      <RouteErrorBoundary
        key={`trip:${currentTripId}`}
        description="Go back to your trips and open this itinerary again."
        title="We could not load this trip."
      >
        <TripRoute tripId={currentTripId} />
      </RouteErrorBoundary>
    );
  }

  if (isProfilePage) {
    return (
      <RouteErrorBoundary
        key="profile"
        description="Go back home and open your profile again."
        title="We could not load your profile."
      >
        <ProfileRoute />
      </RouteErrorBoundary>
    );
  }

  if (isSavedTripsPage) {
    return (
      <RouteErrorBoundary
        key="saved-trips"
        description="Go back home and try again."
        title="We could not load your saved trips."
      >
        <SavedTripsRoute />
      </RouteErrorBoundary>
    );
  }

  return (
    <RouteErrorBoundary
      key="home"
      actionLabel="Try again"
      description="Please return to the home page and try again."
      title="We could not load the home page."
    >
      <HomeRoute />
    </RouteErrorBoundary>
  );
};

export default AppRouter;
