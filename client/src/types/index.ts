export type {
  Activity,
  BudgetBreakdown,
  CreateTripRequest,
  DayPlan,
  MessageRole,
  PatchTripRequest,
  RefineTripRequest,
  ReplaceTripItineraryRequest,
  TripDetailResponse,
  TripMemberResponse,
  TripMessageResponse,
  TravelItinerary,
  TripPermissions,
  TripRole,
  TripStatus,
  TripSummaryResponse,
  TripVisibility,
} from "@poreia/shared";

import type {
  TravelItinerary,
  TripMessageResponse,
  TripPermissions,
  TripSummaryResponse,
} from "@poreia/shared";

export interface MapPinData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  image?: string;
  description: string;
  dayNumber?: number;
  dayColor?: string;
  badgeLabel?: string;
  markerValue?: string;
}

export type TripMessage = TripMessageResponse;

export interface TripSession extends TripSummaryResponse {
  permissions?: TripPermissions;
  currentItinerary: TravelItinerary | null;
  messages: TripMessage[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
}
