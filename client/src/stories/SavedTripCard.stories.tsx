import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import SavedTripCard from "@/entities/trip/ui/TripCard";
import type { TripSession } from "@/shared/types";

const meta: Meta<typeof SavedTripCard> = {
  title: "UI/SavedTripCard",
  component: SavedTripCard,
  argTypes: {
    variant: { control: "select", options: ["full", "compact"] },
  },
};

export default meta;
type Story = StoryObj<typeof SavedTripCard>;

const mockTrip: TripSession = {
  id: "trip-1",
  ownerId: "user-1",
  title: "Tokyo Adventure",
  destination: "Tokyo, Japan",
  overview: "A vibrant mix of ancient temples, neon-lit districts, and world-class cuisine across 7 unforgettable days.",
  totalDays: 7,
  totalBudget: 3000,
  currency: "USD",
  status: "ready",
  visibility: "private",
  accessRole: "owner",
  memberCount: 1,
  version: 1,
  currentSnapshotId: "snap-1",
  createdAt: "2025-05-01T00:00:00Z",
  updatedAt: "2025-05-10T00:00:00Z",
  lastRefinedAt: "2025-05-10T00:00:00Z",
  archivedAt: null,
  currentItinerary: {
    title: "Tokyo Adventure",
    destination: "Tokyo, Japan",
    overview: "A vibrant mix of ancient temples, neon-lit districts, and world-class cuisine across 7 unforgettable days.",
    days: [],
    totalDays: 7,
    totalBudget: 3000,
    currency: "USD",
    budgetBreakdown: [],
  },
  messages: [],
};

export const Full: Story = {
  render: () => (
    <div className="w-[320px] bg-slate-700 p-4 rounded-2xl">
      <SavedTripCard
        trip={mockTrip}
        coverImage="https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=640&q=80"
        badgeText="7 days"
        metadataLabel="May 2025"
        metadataSecondary="Tokyo"
        stopCountLabel="24 stops"
        onOpen={() => {}}
        onDelete={() => {}}
        variant="full"
      />
    </div>
  ),
};

export const FullNoCover: Story = {
  render: () => (
    <div className="w-[320px] bg-slate-700 p-4 rounded-2xl">
      <SavedTripCard
        trip={mockTrip}
        coverImage={null}
        badgeText="7 days"
        metadataLabel="May 2025"
        stopCountLabel="24 stops"
        onOpen={() => {}}
        variant="full"
      />
    </div>
  ),
};

export const Compact: Story = {
  render: () => (
    <div className="w-[280px]">
      <SavedTripCard
        trip={mockTrip}
        badgeText="7 days"
        metadataLabel="May 2025"
        stopCountLabel="24 stops"
        onOpen={() => {}}
        onDelete={() => {}}
        variant="compact"
      />
    </div>
  ),
};

export const CompactGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 w-[560px]">
      {["Lisbon Escape", "Kyoto in Spring", "NYC Weekend", "Bali Retreat"].map((title) => (
        <SavedTripCard
          key={title}
          trip={{ ...mockTrip, title, currentItinerary: { ...mockTrip.currentItinerary!, destination: title } }}
          badgeText="5 days"
          metadataLabel="Jun 2025"
          stopCountLabel="18 stops"
          onOpen={() => {}}
          onDelete={() => {}}
          variant="compact"
        />
      ))}
    </div>
  ),
};
