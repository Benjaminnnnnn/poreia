import type {
  Activity,
  BudgetBreakdown,
  DayPlan,
  MessageRole,
  TravelItinerary,
  TripMemberResponse,
  TripMessageResponse,
  TripPermissions,
  TripRole,
  TripStatus,
  TripSummaryResponse,
  TripVisibility,
} from '@poreia/shared';

export type {
  Activity,
  BudgetBreakdown,
  DayPlan,
  MessageRole,
  TravelItinerary,
  TripMemberResponse,
  TripMessageResponse,
  TripPermissions,
  TripRole,
  TripStatus,
  TripSummaryResponse,
  TripVisibility,
} from '@poreia/shared';

export type MembershipStatus = 'active' | 'revoked';
export type SnapshotSource = 'create' | 'refine' | 'manual_edit';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface UserProfileDoc {
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

export interface TripSummaryDoc {
  ownerId: string;
  title: string;
  destination: string;
  overview: string;
  totalDays: number;
  totalBudget: number;
  currency: string;
  status: TripStatus;
  visibility: TripVisibility;
  version: number;
  currentSnapshotId: string;
  memberCount: number;
  messageCount: number;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
  lastRefinedAt: string | null;
  lastManualEditAt: string | null;
  archivedAt: string | null;
}

export interface TripMemberDoc {
  userId: string;
  role: TripRole;
  status: MembershipStatus;
  displayName: string;
  email: string;
  joinedAt: string;
  invitedBy: string;
}

export interface SnapshotDoc {
  tripId: string;
  version: number;
  source: SnapshotSource;
  prompt: string | null;
  createdAt: string;
  createdBy: string;
  itinerary: TravelItinerary;
}

export interface MessageDoc {
  role: MessageRole;
  text: string;
  createdAt: string;
  snapshotId: string | null;
  requestId: string | null;
}

export interface TripMembershipMirrorDoc {
  tripId: string;
  ownerId: string;
  role: TripRole;
  status: MembershipStatus;
  title: string;
  destination: string;
  overview: string;
  totalDays: number;
  totalBudget: number;
  currency: string;
  tripStatus: TripStatus;
  visibility: TripVisibility;
  version: number;
  currentSnapshotId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  lastRefinedAt: string | null;
  archivedAt: string | null;
  joinedAt: string;
}
