export type TripRole = 'owner' | 'editor' | 'viewer';
export type MembershipStatus = 'active' | 'revoked';
export type TripStatus = 'draft' | 'ready' | 'archived' | 'failed';
export type TripVisibility = 'private' | 'shared';
export type SnapshotSource = 'create' | 'refine' | 'manual_edit';
export type MessageRole = 'user' | 'model';

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
  status: MembershipStatus;
  joinedAt: string;
  invitedBy: string;
}
