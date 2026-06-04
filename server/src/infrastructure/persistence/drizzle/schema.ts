import {
  doublePrecision,
  integer,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id:              uuid("id").primaryKey(),              // Supabase auth UUID
  email:           text("email").notNull().unique(),
  displayName:     text("display_name"),
  photoUrl:        text("photo_url"),
  travelerName:    text("traveler_name"),
  ownedTripCount:  integer("owned_trip_count").default(0).notNull(),
  sharedTripCount: integer("shared_trip_count").default(0).notNull(),
  createdAt:       timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).notNull(),
  lastSeenAt:      timestamp("last_seen_at", { withTimezone: true }).notNull(),
});

export const trips = pgTable("trips", {
  id:               text("id").primaryKey(),
  ownerId:          uuid("owner_id").notNull().references(() => users.id),
  title:            text("title").notNull(),
  destination:      text("destination").notNull(),
  overview:         text("overview").notNull(),
  totalDays:        integer("total_days").notNull(),
  totalBudget:      doublePrecision("total_budget").notNull(),
  currency:         text("currency").notNull(),
  status:           text("status").notNull(),            // 'draft'|'ready'|'archived'|'failed'
  visibility:       text("visibility").notNull(),        // 'private'|'shared'
  version:          integer("version").default(1).notNull(),
  currentSnapshotId: text("current_snapshot_id"),
  memberCount:      integer("member_count").default(0).notNull(),
  messageCount:     integer("message_count").default(0).notNull(),
  activityCount:    integer("activity_count").default(0).notNull(),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull(),
  lastRefinedAt:    timestamp("last_refined_at", { withTimezone: true }),
  lastManualEditAt: timestamp("last_manual_edit_at", { withTimezone: true }),
  archivedAt:       timestamp("archived_at", { withTimezone: true }),
});

export const tripMembers = pgTable("trip_members", {
  tripId:      text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  userId:      uuid("user_id").notNull().references(() => users.id),
  role:        text("role").notNull(),                   // 'owner'|'editor'|'viewer'
  status:      text("status").notNull(),                 // 'active'|'revoked'
  displayName: text("display_name").notNull(),
  email:       text("email").notNull(),
  invitedBy:   uuid("invited_by"),
  joinedAt:    timestamp("joined_at", { withTimezone: true }).notNull(),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull(),
}, (t) => [primaryKey({ columns: [t.tripId, t.userId] })]);

export const snapshots = pgTable("snapshots", {
  id:        text("id").primaryKey(),
  tripId:    text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  version:   integer("version").notNull(),
  source:    text("source").notNull(),                   // 'create'|'refine'|'manual_edit'
  prompt:    text("prompt"),
  itinerary: json("itinerary").notNull(),                // TravelItinerary JSON blob
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const messages = pgTable("messages", {
  id:         text("id").primaryKey(),
  tripId:     text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  role:       text("role").notNull(),                    // 'user'|'model'
  text:       text("text").notNull(),
  snapshotId: text("snapshot_id"),
  requestId:  text("request_id"),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull(),
});
