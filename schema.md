# Poreia Firestore Schema

This schema maps the current frontend types into a Firestore model that supports:

- signed-in trip ownership and sharing
- fast trip summary lists
- full itinerary retrieval for the workspace
- message history for refinement
- safe versioned writes

## Design Goals

- Keep list queries small and cheap.
- Avoid storing large itinerary payloads on every summary read.
- Preserve the existing `TravelItinerary`, `TripSession`, and `ChatMessage` shapes.
- Make shared trips first-class instead of retrofitting them later.

## Collection Layout

```text
users/{userId}
  trip-memberships/{tripId}

trips/{tripId}
  members/{userId}
  snapshots/{snapshotId}
  messages/{messageId}
```

`trips/{tripId}` is the aggregate root. The trip is not stored under one specific user because it can be shared with multiple users.

## Type Mapping

| Current TypeScript type | Firestore storage |
| --- | --- |
| `TripSession` | `trips/{tripId}` + current snapshot + messages + current user's membership |
| `TravelItinerary` | `trips/{tripId}/snapshots/{snapshotId}.itinerary` |
| `ChatMessage` | `trips/{tripId}/messages/{messageId}` |

## Document Schemas

### 1. User document

Path: `users/{userId}`

Purpose: lightweight profile and aggregate stats.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `displayName` | `string` | yes | default from Firebase Auth |
| `email` | `string` | yes | normalized from Firebase Auth |
| `photoURL` | `string \| null` | no | profile avatar |
| `travelerName` | `string` | no | editable display name if you add profile editing |
| `ownedTripCount` | `number` | yes | denormalized owned trip count |
| `sharedTripCount` | `number` | yes | denormalized trip count where user is not owner |
| `createdAt` | `Timestamp` | yes | server timestamp |
| `updatedAt` | `Timestamp` | yes | server timestamp |
| `lastSeenAt` | `Timestamp` | yes | server timestamp |

### 2. User trip-membership index document

Path: `users/{userId}/trip-memberships/{tripId}`

Purpose: cheap owner/shared list queries from the perspective of one user.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `tripId` | `string` | yes | mirrors doc id |
| `ownerId` | `string` | yes | trip owner |
| `role` | `string` | yes | `owner`, `editor`, `viewer` |
| `status` | `string` | yes | `active` or `revoked` |
| `title` | `string` | yes | denormalized for list rendering |
| `destination` | `string` | yes | denormalized for list rendering |
| `overview` | `string` | yes | denormalized for list rendering |
| `totalDays` | `number` | yes | denormalized for list rendering |
| `totalBudget` | `number` | yes | denormalized for list rendering |
| `currency` | `string` | yes | denormalized for list rendering |
| `tripStatus` | `string` | yes | `draft`, `ready`, `archived`, `failed` |
| `visibility` | `string` | yes | `private` or `shared` |
| `version` | `number` | yes | mirrors trip version |
| `currentSnapshotId` | `string` | yes | mirrors trip |
| `updatedAt` | `Timestamp` | yes | mirrors trip |
| `archivedAt` | `Timestamp \| null` | no | mirrors trip |
| `joinedAt` | `Timestamp` | yes | membership creation time |

This document is a per-user index, not the canonical permission record.

### 3. Trip summary document

Path: `trips/{tripId}`

Purpose: everything needed for trip cards, concurrency, snapshot lookup, and share state. This document intentionally does not embed the full itinerary.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `ownerId` | `string` | yes | canonical trip owner |
| `title` | `string` | yes | user-facing title |
| `destination` | `string` | yes | denormalized from current itinerary |
| `overview` | `string` | yes | denormalized from current itinerary |
| `totalDays` | `number` | yes | denormalized from current itinerary |
| `totalBudget` | `number` | yes | denormalized from current itinerary |
| `currency` | `string` | yes | denormalized from current itinerary |
| `status` | `string` | yes | `draft`, `ready`, `archived`, `failed` |
| `visibility` | `string` | yes | `private` or `shared` |
| `version` | `number` | yes | increment on every write mutation |
| `currentSnapshotId` | `string` | yes | points to the latest snapshot |
| `memberCount` | `number` | yes | active members including owner |
| `messageCount` | `number` | yes | denormalized for quick summary use |
| `activityCount` | `number` | yes | total activities in current itinerary |
| `createdAt` | `Timestamp` | yes | server timestamp |
| `updatedAt` | `Timestamp` | yes | server timestamp |
| `lastRefinedAt` | `Timestamp \| null` | no | latest AI refinement time |
| `lastManualEditAt` | `Timestamp \| null` | no | latest direct edit time |
| `archivedAt` | `Timestamp \| null` | no | null when active |

Example:

```json
{
  "ownerId": "firebase_uid_123",
  "title": "5-Day Tokyo Foodie Escape",
  "destination": "Tokyo, Japan",
  "overview": "A fast-paced city break centered on markets, ramen, and neighborhood walks.",
  "totalDays": 5,
  "totalBudget": 2000,
  "currency": "USD",
  "status": "ready",
  "visibility": "shared",
  "version": 3,
  "currentSnapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z",
  "memberCount": 3,
  "messageCount": 4,
  "activityCount": 18,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp",
  "lastRefinedAt": "Timestamp",
  "lastManualEditAt": "Timestamp",
  "archivedAt": null
}
```

### 4. Trip member document

Path: `trips/{tripId}/members/{userId}`

Purpose: canonical trip access record.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `userId` | `string` | yes | mirrors doc id |
| `role` | `string` | yes | `owner`, `editor`, `viewer` |
| `status` | `string` | yes | `active` or `revoked` |
| `displayName` | `string` | yes | denormalized from user profile for fast rendering |
| `email` | `string` | yes | denormalized from user profile |
| `joinedAt` | `Timestamp` | yes | membership creation time |
| `invitedBy` | `string` | yes | user id that added this member |

Example:

```json
{
  "userId": "firebase_uid_456",
  "role": "editor",
  "status": "active",
  "displayName": "Alex Chen",
  "email": "alex@example.com",
  "joinedAt": "Timestamp",
  "invitedBy": "firebase_uid_123"
}
```

### 5. Snapshot document

Path: `trips/{tripId}/snapshots/{snapshotId}`

Purpose: full itinerary payload plus write provenance. This is the Firestore home for the current `TravelItinerary` type.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `tripId` | `string` | yes | parent trip id |
| `version` | `number` | yes | mirrors the trip version created by this write |
| `source` | `string` | yes | `create`, `refine`, or `manual_edit` |
| `prompt` | `string \| null` | no | originating user prompt for create/refine |
| `createdAt` | `Timestamp` | yes | server timestamp |
| `createdBy` | `string` | yes | user id that initiated the write |
| `itinerary` | `map` | yes | full `TravelItinerary` payload |

`itinerary` shape:

| Field | Type |
| --- | --- |
| `destination` | `string` |
| `title` | `string` |
| `totalDays` | `number` |
| `totalBudget` | `number` |
| `currency` | `string` |
| `overview` | `string` |
| `days` | `array<DayPlan>` |
| `budgetBreakdown` | `array<BudgetBreakdown>` |

`DayPlan` shape:

| Field | Type |
| --- | --- |
| `day` | `number` |
| `theme` | `string` |
| `mood` | `string \| null` |
| `notes` | `string \| null` |
| `activities` | `array<Activity>` |

`Activity` shape:

| Field | Type |
| --- | --- |
| `id` | `string` |
| `time` | `string` |
| `description` | `string` |
| `location` | `string` |
| `lat` | `number \| null` |
| `lng` | `number \| null` |
| `costEstimate` | `number \| null` |
| `img_prompt` | `string \| null` |

### 6. Message document

Path: `trips/{tripId}/messages/{messageId}`

Purpose: recent prompt history used by refinement and optionally surfaced in the UI later.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `role` | `string` | yes | `user` or `model` |
| `text` | `string` | yes | raw chat text |
| `createdAt` | `Timestamp` | yes | server timestamp |
| `snapshotId` | `string \| null` | no | snapshot produced from this message, if any |
| `requestId` | `string \| null` | no | idempotency/debug field |

## Why the Itinerary Lives in `snapshots`

This is the main Firestore-specific design choice.

- Home and profile pages need summary fields only.
- The itinerary payload can grow quickly because it contains all days and activities.
- Keeping the full itinerary out of the trip summary doc makes list queries cheaper and lowers document-size pressure.
- Snapshot documents also give you revision history without redesigning the schema later.

## Why Trips Are Top-Level

This is the main sharing-specific design choice.

- One shared trip needs one canonical itinerary.
- Storing trips under `users/{userId}` makes shared ownership unnatural.
- Top-level trips plus membership documents keep collaboration explicit.
- The per-user `trip-memberships` subcollection keeps list queries cheap without making it the source of truth.

## Read Patterns

### Trip list

Read:

- `users/{userId}/trip-memberships/*`

This powers saved-trip cards and the profile archive grid for owned and shared trips.

### Trip detail

Read:

- `trips/{tripId}`
- `trips/{tripId}/members/{requestingUserId}`
- `trips/{tripId}/snapshots/{currentSnapshotId}`
- latest `messages/*` if requested

### Member list

Read:

- `trips/{tripId}/members/*`

### Refinement

Read:

- trip summary doc
- caller membership doc
- current snapshot doc
- recent message docs

Write:

- new message doc
- new snapshot doc
- updated trip summary doc
- updated user `trip-memberships` mirrors for all active members

## Write Flows

### Create trip

1. Create the user doc if it does not exist.
2. Generate and validate itinerary.
3. Create `trips/{tripId}` summary with `ownerId`, `visibility=private`, and `memberCount=1`.
4. Create `trips/{tripId}/members/{ownerId}` with role `owner`.
5. Create `trips/{tripId}/snapshots/{snapshotId}` with `version = 1`.
6. Create `trips/{tripId}/messages/{messageId}` for the initial prompt.
7. Create `users/{ownerId}/trip-memberships/{tripId}` mirror.
8. Increment `users/{ownerId}.ownedTripCount`.

### Add member

1. Verify requester is the owner.
2. Resolve the target user by `userId` or email.
3. Create `trips/{tripId}/members/{targetUserId}` with role `editor` or `viewer`.
4. Create `users/{targetUserId}/trip-memberships/{tripId}` mirror from the current trip summary.
5. Increment `trips/{tripId}.memberCount`.
6. If needed, update `trips/{tripId}.visibility` to `shared`.
7. Increment `users/{targetUserId}.sharedTripCount`.

### Refine trip

1. Verify caller role is `owner` or `editor`.
2. Verify `expectedVersion`.
3. Create a new user message doc.
4. Generate and validate the new itinerary.
5. Create a new snapshot doc with `source = refine`.
6. Update the trip summary with the new denormalized fields, `currentSnapshotId`, `version + 1`, and `lastRefinedAt`.
7. Fan out the new summary fields to all active `users/*/trip-memberships/{tripId}` mirrors.

### Manual itinerary edit

1. Verify caller role is `owner` or `editor`.
2. Verify `expectedVersion`.
3. Validate the full itinerary shape.
4. Create a new snapshot doc with `source = manual_edit`.
5. Update the trip summary with fresh denormalized fields, `currentSnapshotId`, `version + 1`, and `lastManualEditAt`.
6. Fan out the new summary fields to all active `users/*/trip-memberships/{tripId}` mirrors.

### Remove member

1. Verify requester is the owner.
2. Delete `trips/{tripId}/members/{userId}` or mark `status=revoked`.
3. Delete or revoke `users/{userId}/trip-memberships/{tripId}` mirror.
4. Decrement `trips/{tripId}.memberCount`.
5. Decrement `users/{userId}.sharedTripCount`.

### Delete trip

1. Verify requester is the owner.
2. Delete the trip summary doc.
3. Delete all nested member docs.
4. Delete all nested snapshot docs.
5. Delete all nested message docs.
6. Delete all user `trip-memberships/{tripId}` mirrors.
7. Decrement the owner's `ownedTripCount` and affected users' `sharedTripCount`.

## Recommended Indexes

At minimum:

- `users/{userId}/trip-memberships`: `updatedAt DESC`
- `users/{userId}/trip-memberships`: `role ASC, updatedAt DESC`
- `users/{userId}/trip-memberships`: `tripStatus ASC, updatedAt DESC`
- `trips/{tripId}/messages`: `createdAt DESC`

If you keep `scope=owned|shared|all` at the API layer, `role + updatedAt` on the user mirror is the useful index.

## Validation Rules and Invariants

Whether enforced in API code, Firestore rules, or both:

- `trips/{tripId}.ownerId` must have a matching `members/{ownerId}` document with role `owner`.
- There must be exactly one active owner membership per trip.
- `version` must increase by exactly `1` on every successful mutation.
- `currentSnapshotId` must reference an existing snapshot for the same trip.
- `destination`, `title`, `totalDays`, `totalBudget`, and `currency` on the trip summary must mirror the current snapshot.
- Every active `users/{userId}/trip-memberships/{tripId}` mirror must match the canonical trip summary and canonical membership role.
- `visibility=private` should normally imply `memberCount=1`.
- `status=archived` implies `archivedAt != null`.
- `status!=archived` implies `archivedAt == null`.

## Security Rule Expectations

If any direct client access remains, the baseline rule shape should be:

- block unauthenticated access
- allow reads on `trips/{tripId}` only to active members of that trip
- allow writes to `trips/{tripId}` only through backend-controlled paths or tightly constrained owner/editor rules
- allow writes to `trips/{tripId}/members/*` only to the owner
- allow reads on `users/{userId}/trip-memberships/*` only to that same user
- prevent mutation of immutable ownership fields outside trusted backend code

If all access goes through your backend with the Admin SDK, keep the same invariants in server validation.

## Operational Notes

- Firestore timestamps should stay as `Timestamp` internally; the API should serialize them to ISO 8601 strings.
- Snapshot retention can start simple: keep all snapshots now, then add pruning later if storage cost becomes material.
- Membership mirror fanout is the main denormalization cost. It is acceptable here because trip membership is expected to stay small.
- If trip search becomes a real feature, add a dedicated search system later. Firestore is fine for member-scoped listing and exact filters, not full-text search.
