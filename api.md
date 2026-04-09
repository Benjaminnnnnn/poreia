# Poreia API Map

This document maps the current trip-planning capability into a production REST API. It assumes:

- Firebase Authentication remains the identity provider.
- The frontend sends a Firebase ID token on every authenticated request.
- The app API owns trip persistence, itinerary refinement orchestration, validation, trip sharing, and Firestore writes.

## Conventions

- Base path: `/api/v1`
- Auth: `Authorization: Bearer <firebase-id-token>`
- Content type: `application/json`
- Success envelope:

```json
{
  "data": {}
}
```

- Error envelope:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": []
  }
}
```

## Core Resources

### `TripSummary`

```json
{
  "id": "trip_01JQ4M8X2D2N6D4Y2Q8E5C7Z8A",
  "ownerId": "firebase_uid_123",
  "title": "5-Day Tokyo Foodie Escape",
  "destination": "Tokyo, Japan",
  "overview": "A fast-paced city break centered on markets, ramen, and neighborhood walks.",
  "totalDays": 5,
  "totalBudget": 2000,
  "currency": "USD",
  "status": "ready",
  "visibility": "shared",
  "accessRole": "editor",
  "memberCount": 3,
  "version": 3,
  "currentSnapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z",
  "createdAt": "2026-03-31T18:12:40Z",
  "updatedAt": "2026-03-31T18:21:10Z",
  "lastRefinedAt": "2026-03-31T18:21:10Z",
  "archivedAt": null
}
```

### `TripDetail`

```json
{
  "id": "trip_01JQ4M8X2D2N6D4Y2Q8E5C7Z8A",
  "summary": {},
  "permissions": {
    "role": "editor",
    "canView": true,
    "canEdit": true,
    "canManageMembers": false,
    "canDelete": false
  },
  "currentItinerary": {},
  "recentMessages": []
}
```

### `TripMember`

```json
{
  "userId": "firebase_uid_456",
  "displayName": "Alex Chen",
  "email": "alex@example.com",
  "role": "editor",
  "status": "active",
  "joinedAt": "2026-03-31T18:25:10Z",
  "invitedBy": "firebase_uid_123"
}
```

### `Message`

```json
{
  "id": "msg_01JQ4MBB4FQ2P4EAB7Q8W1RT7V",
  "role": "user",
  "text": "Add a dinner spot on Day 2 near Shinjuku.",
  "createdAt": "2026-03-31T18:20:44Z",
  "snapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z"
}
```

## Permission Model

- `owner`: full control, including delete and member management
- `editor`: can view, refine, and manually edit the itinerary
- `viewer`: read-only access

Endpoint enforcement:

- `GET /trips` and `GET /trips/:tripId`: `owner | editor | viewer`
- `PUT /trips/:tripId/itinerary` and `POST /trips/:tripId/refinements`: `owner | editor`
- `PATCH /trips/:tripId`, `GET /trips/:tripId/members`, `POST /trips/:tripId/members`, `PATCH /trips/:tripId/members/:userId`, `DELETE /trips/:tripId/members/:userId`: owner for member-management fields; metadata edits can optionally allow editors later, but this design keeps them owner-only for now
- `DELETE /trips/:tripId`: `owner` only

## Endpoint Map

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/trips` | Create a new trip from a natural-language prompt |
| `GET` | `/api/v1/trips` | List trips the current user can access |
| `GET` | `/api/v1/trips/:tripId` | Fetch one trip, optionally including itinerary and messages |
| `PATCH` | `/api/v1/trips/:tripId` | Update trip metadata such as title, visibility, or archive state |
| `PUT` | `/api/v1/trips/:tripId/itinerary` | Replace the current itinerary after manual edits |
| `POST` | `/api/v1/trips/:tripId/refinements` | Refine an existing trip from a follow-up prompt |
| `GET` | `/api/v1/trips/:tripId/messages` | List message history for a trip |
| `GET` | `/api/v1/trips/:tripId/members` | List members on a shared trip |
| `POST` | `/api/v1/trips/:tripId/members` | Add a friend to a trip |
| `PATCH` | `/api/v1/trips/:tripId/members/:userId` | Change a member role or revoke access |
| `DELETE` | `/api/v1/trips/:tripId/members/:userId` | Remove a member from a trip |
| `DELETE` | `/api/v1/trips/:tripId` | Delete a trip and all nested documents |

## Detailed Contracts

### `POST /api/v1/trips`

Creates the trip, generates the first itinerary, validates the provider output, writes the first snapshot, creates the owner membership, and returns a fully usable trip detail payload.

Request:

```json
{
  "prompt": "Plan a 5-day foodie trip to Tokyo on a $2,000 budget",
  "clientRequestId": "4f8bc2bb-75b1-4377-b1d5-35d780ca9ee7"
}
```

Response: `201 Created`

```json
{
  "data": {
    "id": "trip_01JQ4M8X2D2N6D4Y2Q8E5C7Z8A",
    "summary": {
      "id": "trip_01JQ4M8X2D2N6D4Y2Q8E5C7Z8A",
      "ownerId": "firebase_uid_123",
      "title": "5-Day Tokyo Foodie Escape",
      "destination": "Tokyo, Japan",
      "overview": "A fast-paced city break centered on markets, ramen, and neighborhood walks.",
      "totalDays": 5,
      "totalBudget": 2000,
      "currency": "USD",
      "status": "ready",
      "visibility": "private",
      "accessRole": "owner",
      "memberCount": 1,
      "version": 1,
      "currentSnapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z",
      "createdAt": "2026-03-31T18:12:40Z",
      "updatedAt": "2026-03-31T18:12:40Z",
      "lastRefinedAt": null,
      "archivedAt": null
    },
    "permissions": {
      "role": "owner",
      "canView": true,
      "canEdit": true,
      "canManageMembers": true,
      "canDelete": true
    },
    "currentItinerary": {
      "destination": "Tokyo, Japan",
      "title": "5-Day Tokyo Foodie Escape",
      "totalDays": 5,
      "totalBudget": 2000,
      "currency": "USD",
      "overview": "A fast-paced city break centered on markets, ramen, and neighborhood walks.",
      "days": [],
      "budgetBreakdown": []
    },
    "recentMessages": [
      {
        "id": "msg_01JQ4MBB4FQ2P4EAB7Q8W1RT7V",
        "role": "user",
        "text": "Plan a 5-day foodie trip to Tokyo on a $2,000 budget",
        "createdAt": "2026-03-31T18:12:40Z",
        "snapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z"
      }
    ]
  }
}
```

Possible errors:

- `422 validation_error`
- `429 rate_limit_exceeded`
- `503 provider_unavailable`
- `502 provider_invalid_response`

### `GET /api/v1/trips`

Returns trips the current user can access for home and profile pages.

Query params:

- `cursor`: opaque pagination cursor
- `limit`: default `20`, max `50`
- `status`: `active | archived | all` with default `active`
- `scope`: `owned | shared | all` with default `all`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": "trip_01JQ4M8X2D2N6D4Y2Q8E5C7Z8A",
      "ownerId": "firebase_uid_123",
      "title": "5-Day Tokyo Foodie Escape",
      "destination": "Tokyo, Japan",
      "overview": "A fast-paced city break centered on markets, ramen, and neighborhood walks.",
      "totalDays": 5,
      "totalBudget": 2000,
      "currency": "USD",
      "status": "ready",
      "visibility": "shared",
      "accessRole": "editor",
      "memberCount": 3,
      "version": 3,
      "currentSnapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z",
      "createdAt": "2026-03-31T18:12:40Z",
      "updatedAt": "2026-03-31T18:21:10Z",
      "lastRefinedAt": "2026-03-31T18:21:10Z",
      "archivedAt": null
    }
  ],
  "meta": {
    "limit": 20,
    "nextCursor": "eyJ1cGRhdGVkQXQiOiIyMDI2LTAzLTMxVDE4OjIxOjEwWiIsImlkIjoidHJpcF8wMUpRNE04WDIifQ=="
  }
}
```

### `GET /api/v1/trips/:tripId`

Fetches one trip for any authorized member. By default this should include the current itinerary because the main workspace needs it immediately.

Query params:

- `include=messages` to add recent chat history
- `include=members` to add active trip members
- `messageLimit`: default `10`, max `50`

Response: `200 OK`

### `PATCH /api/v1/trips/:tripId`

Owner-only metadata updates.

Request:

```json
{
  "title": "Tokyo Food Crawl",
  "visibility": "shared",
  "archived": false,
  "expectedVersion": 3
}
```

Response: `200 OK`

Rules:

- `title` is optional and user-editable.
- `visibility` is `private | shared`.
- `archived` toggles `archivedAt`.
- `expectedVersion` is required for optimistic concurrency on mutable records.

### `PUT /api/v1/trips/:tripId/itinerary`

Replaces the current itinerary after manual changes such as drag-and-drop, activity edits, or day reflections.

Request:

```json
{
  "expectedVersion": 3,
  "itinerary": {
    "destination": "Tokyo, Japan",
    "title": "5-Day Tokyo Foodie Escape",
    "totalDays": 5,
    "totalBudget": 2050,
    "currency": "USD",
    "overview": "A fast-paced city break centered on markets, ramen, and neighborhood walks.",
    "days": [],
    "budgetBreakdown": []
  }
}
```

Response: `200 OK`

Behavior:

- Validates the full itinerary shape before writing.
- Creates a new snapshot with source `manual_edit`.
- Increments `version`.
- Preserves the API shape expected by the current `TravelItinerary` UI.

Possible errors:

- `403 forbidden`
- `409 stale_write`
- `422 validation_error`

### `POST /api/v1/trips/:tripId/refinements`

Uses the current itinerary plus recent chat history to generate a new itinerary revision.

Request:

```json
{
  "prompt": "Add a dinner spot on Day 2 near Shinjuku.",
  "expectedVersion": 3,
  "clientRequestId": "7009f509-8920-4208-bf6d-8b7e8549ceeb"
}
```

Response: `200 OK`

Behavior:

- Appends the user message first.
- Reads the current snapshot and recent messages.
- Calls the itinerary provider.
- Validates and normalizes the provider response.
- Preserves existing day `mood` and `notes` if the new itinerary does not overwrite them.
- Writes a new snapshot with source `refine`.
- Increments `version`.

Possible errors:

- `403 forbidden`
- `404 trip_not_found`
- `409 stale_write`
- `429 rate_limit_exceeded`
- `503 provider_unavailable`
- `502 provider_invalid_response`

### `GET /api/v1/trips/:tripId/messages`

Returns ordered chat history for a trip.

Query params:

- `cursor`
- `limit`: default `20`, max `100`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": "msg_01JQ4MBB4FQ2P4EAB7Q8W1RT7V",
      "role": "user",
      "text": "Plan a 5-day foodie trip to Tokyo on a $2,000 budget",
      "createdAt": "2026-03-31T18:12:40Z",
      "snapshotId": "snap_01JQ4MB2T9P8KJ6K8R4Y5M1Q2Z"
    }
  ],
  "meta": {
    "limit": 20,
    "nextCursor": null
  }
}
```

### `GET /api/v1/trips/:tripId/members`

Returns active members for a trip.

Response: `200 OK`

```json
{
  "data": [
    {
      "userId": "firebase_uid_123",
      "displayName": "Benjamin Zhuang",
      "email": "ben@example.com",
      "role": "owner",
      "status": "active",
      "joinedAt": "2026-03-31T18:12:40Z",
      "invitedBy": "firebase_uid_123"
    },
    {
      "userId": "firebase_uid_456",
      "displayName": "Alex Chen",
      "email": "alex@example.com",
      "role": "editor",
      "status": "active",
      "joinedAt": "2026-03-31T18:25:10Z",
      "invitedBy": "firebase_uid_123"
    }
  ]
}
```

### `POST /api/v1/trips/:tripId/members`

Adds a friend to a trip. The backend should resolve the target user by `userId` or `email`, then create the membership if allowed.

Request:

```json
{
  "email": "alex@example.com",
  "role": "editor"
}
```

Response: `201 Created`

Rules:

- Owner only.
- `role` may be `editor` or `viewer`.
- Setting the first non-owner member should switch `visibility` to `shared` if it was `private`.

Possible errors:

- `404 user_not_found`
- `409 member_exists`
- `422 validation_error`

### `PATCH /api/v1/trips/:tripId/members/:userId`

Changes a member role or revokes access.

Request:

```json
{
  "role": "viewer"
}
```

Response: `200 OK`

Rules:

- Owner only.
- Owner role cannot be reassigned through this endpoint.

### `DELETE /api/v1/trips/:tripId/members/:userId`

Removes a member from a trip.

Response: `204 No Content`

Rules:

- Owner only.
- Owner cannot delete themselves through this endpoint.
- If the last non-owner member is removed, the owner may keep `visibility=shared` or change it back to `private` explicitly; this design does not auto-flip it on delete.

### `DELETE /api/v1/trips/:tripId`

Hard-deletes the trip summary plus nested memberships, snapshots, and messages.

Response: `204 No Content`

## Validation and Error Codes

Recommended application error codes:

- `validation_error`
- `unauthorized`
- `forbidden`
- `trip_not_found`
- `user_not_found`
- `member_exists`
- `member_not_found`
- `stale_write`
- `provider_unavailable`
- `provider_invalid_response`
- `rate_limit_exceeded`
- `internal_error`

Recommended status mapping:

- `401` missing or invalid Firebase token
- `403` authenticated user lacks required trip role
- `404` unknown `tripId` or target `userId`
- `409` `expectedVersion` does not match current `version`, or a duplicate member already exists
- `422` request body is structurally valid JSON but semantically invalid
- `429` expensive endpoint rate limit exceeded
- `502` provider responded with malformed or unusable content
- `503` provider could not be reached or is temporarily unavailable

## Rate Limits

- `POST /trips`: `10/min/user`
- `POST /trips/:tripId/refinements`: `20/hour/user`
- `POST /trips/:tripId/members`: `30/hour/user`
- Read endpoints: `120/min/user`

Expose:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` on `429`

## ADRs

Canonical architecture decision records live in [docs/adr/README.md](/Users/benjaminzhuang/workspace/cmu/poreia/docs/adr/README.md).
