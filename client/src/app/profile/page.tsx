"use client";

import ProfileView from "./Profile";
import { TripsProvider } from "@/entities/trip/model/tripsContext";
import { useAppAuth, useAppHeaderState } from "@/entities/auth/model/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AuthenticatedProfilePage() {
  const {
    state: { authUser },
  } = useAppAuth();

  return (
    <TripsProvider user={authUser}>
      <ProfileView />
    </TripsProvider>
  );
}

export default function ProfilePage() {
  const { authUser, openAuthModal } = useAppHeaderState();
  const router = useRouter();

  useEffect(() => {
    if (!authUser) {
      openAuthModal();
      router.push("/");
    }
  }, [authUser, openAuthModal, router]);

  if (!authUser) {
    return null;
  }

  return <AuthenticatedProfilePage />;
}
