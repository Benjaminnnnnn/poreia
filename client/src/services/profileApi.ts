import type { User } from "firebase/auth";
import type {
  UpdateUserProfileRequest,
  UserProfileResponse,
} from "@poreia/shared";
import { apiRequest } from "./apiClient";

export async function getCurrentUserProfile(
  authUser: User,
): Promise<UserProfileResponse> {
  const response = await apiRequest<UserProfileResponse>(
    authUser,
    "/api/v1/me/profile",
  );

  return response.data;
}

export async function updateCurrentUserProfile(
  authUser: User,
  input: UpdateUserProfileRequest,
): Promise<UserProfileResponse> {
  const response = await apiRequest<UserProfileResponse>(
    authUser,
    "/api/v1/me/profile",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data;
}
