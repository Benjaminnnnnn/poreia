import type {
  UpdateUserProfileRequest,
  UserProfileResponse,
} from "@poreia/shared";
import { apiRequest } from "@/shared/api/apiService";

export async function getCurrentUserProfile(): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>({
    method: "GET",
    url: "/api/v1/me/profile",
  });
}

export async function updateCurrentUserProfile(
  input: UpdateUserProfileRequest,
): Promise<UserProfileResponse> {
  return apiRequest<UserProfileResponse>({
    method: "PATCH",
    url: "/api/v1/me/profile",
    data: input,
  });
}
