# ADR-0001: Use a REST API as the app boundary

**Date**: 2026-03-31
**Status**: accepted
**Deciders**: product + engineering

## Context

Poreia already has a stable trip-oriented UI, but persistence is currently local and provider interactions are tightly coupled to the client. The project now needs a clear backend contract for persistence, validation, access control, and operational controls.

## Decision

Use a versioned REST API under `/api/v1` as the product boundary instead of exposing direct Firestore writes or introducing GraphQL first.

## Alternatives Considered

### Alternative 1: Direct Firestore access from the client
- **Pros**: minimal server code, fast to start
- **Cons**: weak control over orchestration, validation, role checks, and provider abstraction
- **Why not**: it leaks backend structure into the client and makes sharing and permission policy harder to enforce

### Alternative 2: GraphQL API
- **Pros**: flexible reads, strong typed schema
- **Cons**: more setup, more operational complexity than the current resource model needs
- **Why not**: the UI maps cleanly to a small set of resource endpoints already

## Consequences

### Positive
- Stable contract for web and future mobile clients
- Clear place to enforce auth, validation, rate limiting, and provider fault handling

### Negative
- Adds backend implementation work that a direct-client Firestore setup would avoid
- Requires endpoint versioning discipline

### Risks
- API drift from frontend needs
- Mitigation: keep the contract centered on `TripSummary`, `TripDetail`, `TripMember`, and `TravelItinerary`
