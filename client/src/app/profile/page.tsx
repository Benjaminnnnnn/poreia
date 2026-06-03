"use client";
import { routes } from "@/shared/lib/routes";

import ProfileView from "@/features/edit-profile/ui/ProfileForm";
import { useAppHeaderState } from "@/entities/auth/model/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const { authUser, openAuthModal } = useAppHeaderState();
  const router = useRouter();

  useEffect(() => {
    if (!authUser) {
      openAuthModal();
      router.push(routes.home());
    }
  }, [authUser, openAuthModal, router]);

  if (!authUser) {
    return null;
  }

  return <ProfileView />;
}
