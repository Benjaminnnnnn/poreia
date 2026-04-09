# Poreia Firestore Setup Guide

This guide translates [api.md](/Users/benjaminzhuang/workspace/cmu/poreia/api.md) and [schema.md](/Users/benjaminzhuang/workspace/cmu/poreia/schema.md) into a concrete Firestore setup plan for this repo.

## What Already Exists

- Firebase Auth is already configured in [src/lib/firebase.ts](/Users/benjaminzhuang/workspace/cmu/poreia/src/lib/firebase.ts) for project `poreia-c566a`.
- The frontend currently stores trip data in browser state and `localStorage`, not Firestore.
- The API design says the backend owns trip persistence, refinement orchestration, member management, validation, and Firestore writes.

That means the safest initial Firestore setup is:

- keep Firebase Auth as the identity provider
- use Firestore as the database for the backend/API
- do not let the web client write trip documents directly

## Target Firestore Shape

From [schema.md](/Users/benjaminzhuang/workspace/cmu/poreia/schema.md), the database should look like this:

```text
users/{userId}
  trip-memberships/{tripId}

trips/{tripId}
  members/{userId}
  snapshots/{snapshotId}
  messages/{messageId}
```

The important design choices are:

- `trips/{tripId}` is the aggregate root
- full itineraries live in `snapshots`
- `users/{userId}/trip-memberships/{tripId}` is a per-user mirror for cheap list queries
- `members` is the canonical permission source

## Step 1: Confirm the Firebase Project

The repo is already wired to:

```ts
projectId: 'poreia-c566a'
```

from [src/lib/firebase.ts](/Users/benjaminzhuang/workspace/cmu/poreia/src/lib/firebase.ts).

If you want Firestore in that same project, keep using `poreia-c566a`. That is the simplest path because Auth is already there.

## Step 2: Install and Authenticate the Firebase CLI

Use `npx` so the repo always runs a current CLI:

```bash
npx -y firebase-tools@latest --version
npx -y firebase-tools@latest login
npx -y firebase-tools@latest projects:list
npx -y firebase-tools@latest use --add poreia-c566a
```

If you are on a remote shell and browser login fails:

```bash
npx -y firebase-tools@latest login --no-localhost
```

## Step 3: Create the Firestore Database

Create the default Firestore database for the existing Firebase project.

Recommended approach:

1. Open Firebase Console.
2. Go to `Build` -> `Firestore Database`.
3. Create the `(default)` database.
4. Use Firestore Standard / Native mode.
5. Choose a location close to your backend and primary users.

Notes:

- If Poreia stays US-hosted, `us-central1` is a reasonable default.
- Use the default database unless you have a clear reason to introduce multiple databases.

CLI alternative:

```bash
npx -y firebase-tools@latest firestore:databases:create "(default)" --location=us-central1 --delete-protection DISABLED
```

## Step 4: Add Firebase Config Files to the Repo

Create these files in the project root.

### `firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### `firestore.rules`

Start with a backend-first ruleset. This matches the API design in [api.md](/Users/benjaminzhuang/workspace/cmu/poreia/api.md): the REST API writes trip data using the Admin SDK, not the browser client.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }

    function isSelf(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Trip data is backend-owned. Do not allow direct web/mobile SDK access yet.
    match /trips/{tripId} {
      allow read, write: if false;

      match /{document=**} {
        allow read, write: if false;
      }
    }

    // User documents may contain private fields like email.
    // Owner read only, no direct client writes for now.
    match /users/{userId} {
      allow read: if isSelf(userId);
      allow create, update, delete: if false;

      match /trip-memberships/{tripId} {
        allow read: if isSelf(userId);
        allow write: if false;
      }
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Why start this way:

- it avoids accidental client-side writes to `trips`
- it keeps `users.email` and membership mirrors private
- it matches your current architecture, where trip operations go through the API

If you later decide to let the browser read or write Firestore directly, revise these rules carefully instead of loosening them globally.

### `firestore.indexes.json`

This is the minimal starting point based on the query patterns in [schema.md](/Users/benjaminzhuang/workspace/cmu/poreia/schema.md).

```json
{
  "indexes": [
    {
      "collectionGroup": "trip-memberships",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "role",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "trip-memberships",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "tripStatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updatedAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Notes on indexes:

- Firestore auto-creates single-field indexes, so simple `orderBy(updatedAt)` does not need a manual composite index.
- The two composite indexes above support the API filters most likely to matter first: `scope=owned|shared` and `status=active|archived|all`.
- If a future query combines more fields, Firestore will return an index error with a creation link. Add that index when the query is real.

## Step 5: Deploy Rules and Indexes

After creating the three files above:

```bash
npx -y firebase-tools@latest deploy --only firestore
```

Or deploy them independently:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
npx -y firebase-tools@latest deploy --only firestore:indexes
```

## Step 6: Run Firestore Locally

Start the emulator:

```bash
npx -y firebase-tools@latest emulators:start --only firestore
```

Useful URLs:

- Emulator UI: `http://127.0.0.1:4000`
- Firestore emulator: `127.0.0.1:8080`

For backend code using the Firebase Admin SDK, point it at the emulator:

```bash
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export GCLOUD_PROJECT=poreia-c566a
```

At the current stage, the frontend does not need Firestore emulator wiring because it is not using the Firestore web SDK yet.

## Step 7: Keep Firestore Behind the API Boundary

This is the most important implementation choice from [api.md](/Users/benjaminzhuang/workspace/cmu/poreia/api.md).

The backend should:

1. Verify the Firebase ID token on every authenticated request.
2. Use the Firebase Admin SDK for Firestore access.
3. Read and write `trips`, `members`, `snapshots`, `messages`, and `users/{userId}/trip-memberships`.
4. Enforce roles in API code:
   - `owner`: full control
   - `editor`: read and refine/manual itinerary edit
   - `viewer`: read only
5. Enforce optimistic concurrency with `expectedVersion`.
6. Serialize Firestore `Timestamp` values to ISO 8601 strings in API responses.

Do not let the browser directly create or mutate:

- `trips/{tripId}`
- `trips/{tripId}/members/*`
- `trips/{tripId}/snapshots/*`
- `trips/{tripId}/messages/*`
- `users/{userId}/trip-memberships/*`

## Step 8: Implement Writes in the Same Order as the Schema

Use the write flows from [schema.md](/Users/benjaminzhuang/workspace/cmu/poreia/schema.md) as the backend implementation order.

### Trip creation

1. Ensure `users/{ownerId}` exists.
2. Generate and validate the first itinerary.
3. Create `trips/{tripId}`.
4. Create `trips/{tripId}/members/{ownerId}`.
5. Create `trips/{tripId}/snapshots/{snapshotId}`.
6. Create `trips/{tripId}/messages/{messageId}` for the original prompt.
7. Create `users/{ownerId}/trip-memberships/{tripId}`.
8. Increment `users/{ownerId}.ownedTripCount`.

### Refinement

1. Read the trip summary, caller membership, current snapshot, and recent messages.
2. Verify role is `owner` or `editor`.
3. Verify `expectedVersion`.
4. Write the new user message.
5. Generate and validate the next itinerary.
6. Write the new snapshot.
7. Update the trip summary.
8. Fan out the latest summary fields to active membership mirrors.

### Manual itinerary edit

1. Verify role is `owner` or `editor`.
2. Verify `expectedVersion`.
3. Validate the full itinerary payload.
4. Write the new snapshot with `source = manual_edit`.
5. Update the trip summary and membership mirrors.

### Member add/remove

1. Only the owner can manage membership.
2. `members` is the canonical access source.
3. `users/{userId}/trip-memberships/{tripId}` is a mirror that must stay in sync.
4. Update `memberCount`, `sharedTripCount`, and `visibility` consistently.

## Step 9: Use These Invariants From Day One

These should be enforced in backend code immediately:

- exactly one active owner membership per trip
- `trips/{tripId}.ownerId` matches `members/{ownerId}`
- `version` increments by exactly `1`
- `currentSnapshotId` points to an existing snapshot for the same trip
- summary fields mirror the current snapshot
- membership mirrors match canonical membership roles and summary fields
- `visibility=private` normally means `memberCount=1`
- `archivedAt` and `status=archived` remain consistent

## Optional `package.json` Scripts

If you want repeatable local commands, add this snippet to `package.json`:

```json
{
  "scripts": {
    "firebase:login": "npx -y firebase-tools@latest login",
    "firebase:use": "npx -y firebase-tools@latest use",
    "firestore:emulator": "npx -y firebase-tools@latest emulators:start --only firestore",
    "firestore:deploy": "npx -y firebase-tools@latest deploy --only firestore",
    "firestore:rules": "npx -y firebase-tools@latest deploy --only firestore:rules",
    "firestore:indexes": "npx -y firebase-tools@latest deploy --only firestore:indexes"
  }
}
```

Then your common commands become:

```bash
npm run firestore:emulator
npm run firestore:deploy
npm run firestore:rules
npm run firestore:indexes
```

## What Not to Do

- Do not store trips under `users/{userId}/trips`.
- Do not store the full itinerary payload directly on `trips/{tripId}`.
- Do not use Firestore as the public API surface for trip writes.
- Do not expose `users` broadly because those docs include private fields like email.
- Do not let clients assign their own `owner` or `editor` roles.

## Quick Validation Checklist

Before backend implementation starts, verify:

1. `npx -y firebase-tools@latest use` shows `poreia-c566a`.
2. Firestore `(default)` exists in that project.
3. `firebase.json`, `firestore.rules`, and `firestore.indexes.json` exist in repo root.
4. `npx -y firebase-tools@latest deploy --only firestore` succeeds.
5. `npx -y firebase-tools@latest emulators:start --only firestore` succeeds locally.
6. No frontend code writes trip data directly to Firestore.
7. Backend trip endpoints are the only path that mutates Firestore.

## Suggested Next Implementation Order

1. Add the Firestore config files.
2. Stand up the Firestore database and emulator.
3. Build backend auth middleware that verifies Firebase ID tokens.
4. Implement `POST /api/v1/trips`.
5. Implement `GET /api/v1/trips` from the membership mirror.
6. Implement `GET /api/v1/trips/:tripId`.
7. Implement refinement and manual itinerary edit flows.
8. Implement member management.
9. Replace the frontend `localStorage` trip store with API-backed loading.
