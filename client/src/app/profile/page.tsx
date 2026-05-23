"use client";

import ProfileView from "./Profile";
import { TripsProvider } from "@/contexts/trips";
import { useAppAuth } from "@/app/auth";

export default function ProfilePage() {
  const {
    state: { authUser },
  } = useAppAuth();

  return (
    <TripsProvider user={authUser}>
      <ProfileView />
    </TripsProvider>
  );
}
