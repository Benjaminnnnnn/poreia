import type { User } from "firebase/auth";
import type {
  UpdateUserProfileRequest,
  UserProfileResponse,
} from "@poreia/shared";
import { apiRequest } from "@/shared/api/apiService";

export async function getCurrentUserProfile(
  authUser: User,
): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>(authUser, {
    method: "GET",
    url: "/api/v1/me/profile",
  });
}

export async function updateCurrentUserProfile(
  authUser: User,
  input: UpdateUserProfileRequest,
): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>(authUser, {
    method: "PATCH",
    url: "/api/v1/me/profile",
    data: input,
  });
}
