# ADR-0004: Use optimistic concurrency with version

**Date**: 2026-03-31
**Status**: accepted
**Deciders**: product + engineering

## Context

Trips can be edited manually and refined by AI, and now can be shared with multiple members. Without concurrency control, one collaborator can silently overwrite a newer itinerary.

## Decision

Store a monotonically increasing `version` on each trip and require `expectedVersion` on all mutable itinerary and metadata endpoints.

## Alternatives Considered

### Alternative 1: Last write wins
- **Pros**: simplest implementation
- **Cons**: silent data loss
- **Why not**: shared trip edits are too user-visible to risk overwrite without warning

### Alternative 2: ETag headers only
- **Pros**: HTTP-native
- **Cons**: more moving pieces for little gain at this stage
- **Why not**: a numeric version is simpler for both client and server

## Consequences

### Positive
- Prevents silent overwrite
- Makes conflict handling explicit in the client

### Negative
- Adds one required field to write requests

### Risks
- Client forgets to send `expectedVersion`
- Mitigation: reject writes with `422` or `409` rather than accepting them
