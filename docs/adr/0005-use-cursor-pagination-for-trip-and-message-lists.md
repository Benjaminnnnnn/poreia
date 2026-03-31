# ADR-0005: Use cursor pagination for trip and message lists

**Date**: 2026-03-31
**Status**: accepted
**Deciders**: product + engineering

## Context

Firestore favors cursor-based pagination over offset pagination, especially for member-scoped lists ordered by timestamps.

## Decision

Use opaque cursors for `GET /trips` and `GET /messages` instead of page-number pagination.

## Alternatives Considered

### Alternative 1: Offset pagination
- **Pros**: easy to understand, supports page numbers
- **Cons**: a poor fit for Firestore ordering and growing lists
- **Why not**: it is less stable and less efficient for this datastore

## Consequences

### Positive
- Matches Firestore query patterns
- Keeps list reads efficient as histories grow

### Negative
- No jump-to-page semantics

### Risks
- Cursor encoding bugs
- Mitigation: keep cursors opaque and server-generated
