export type MessageRole = 'user' | 'model';
export type TripRole = 'owner' | 'editor' | 'viewer';
export type TripStatus = 'draft' | 'ready' | 'archived' | 'failed';
export type TripVisibility = 'private' | 'shared';

export interface Activity {
  id: string;
  time: string;
  description: string;
  location: string;
  lat?: number;
  lng?: number;
  costEstimate?: number;
  img_prompt?: string;
}

export interface DayPlan {
  day: number;
  theme: string;
  activities: Activity[];
  mood?: string;
  notes?: string;
}

export interface BudgetBreakdown {
  category: string;
  amount: number;
}

export interface TravelItinerary {
  destination: string;
  title: string;
  totalDays: number;
  totalBudget: number;
  currency: string;
  overview: string;
  days: DayPlan[];
  budgetBreakdown: BudgetBreakdown[];
}

export interface CreateTripRequest {
  clientRequestId?: string;
  prompt: string;
}

export interface RefineTripRequest {
  clientRequestId?: string;
  expectedVersion: number;
  prompt: string;
}

export interface ReplaceTripItineraryRequest {
  expectedVersion: number;
  itinerary: TravelItinerary;
}

export interface UpdateUserProfileRequest {
  travelerName: string;
}

export interface PatchTripRequest {
  archived?: boolean;
  expectedVersion: number;
  title?: string;
  visibility?: TripVisibility;
}

export interface TripPermissions {
  role: TripRole;
  canView: true;
  canEdit: boolean;
  canManageMembers: boolean;
  canDelete: boolean;
}

export interface TripMessageResponse {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  snapshotId: string | null;
}

export interface TripMemberResponse {
  userId: string;
  displayName: string;
  email: string;
  role: TripRole;
  status: 'active' | 'revoked';
  joinedAt: string;
  invitedBy: string;
}

export interface TripSummaryResponse {
  id: string;
  ownerId: string;
  title: string;
  destination: string;
  overview: string;
  totalDays: number;
  totalBudget: number;
  currency: string;
  status: TripStatus;
  visibility: TripVisibility;
  accessRole: TripRole;
  memberCount: number;
  version: number;
  currentSnapshotId: string;
  createdAt: string;
  updatedAt: string;
  lastRefinedAt: string | null;
  archivedAt: string | null;
}

export interface TripDetailResponse {
  id: string;
  summary: TripSummaryResponse;
  permissions: TripPermissions;
  currentItinerary: TravelItinerary;
  recentMessages: TripMessageResponse[];
  members?: TripMemberResponse[];
}

export interface PublicTripResponse {
  id: string;
  title: string;
  destination: string;
  overview: string;
  totalDays: number;
  totalBudget: number;
  currency: string;
  days: DayPlan[];
  budgetBreakdown: BudgetBreakdown[];
}

export interface UserProfileResponse {
  userId: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  travelerName: string | null;
  ownedTripCount: number;
  sharedTripCount: number;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}
