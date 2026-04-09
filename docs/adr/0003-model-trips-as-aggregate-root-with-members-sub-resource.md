# ADR-0003: Model trips as the aggregate root with members as an explicit sub-resource

**Date**: 2026-03-31
**Status**: accepted
**Deciders**: product + engineering

## Context

The UI centers on one trip workspace that can be created, refined, edited, reopened, shared, and deleted. Sharing requires one trip to be accessible by multiple users without duplicating the trip itself into each user namespace.

## Decision

Use `trips` as the primary resource. Represent AI follow-up generation as `POST /trips/:tripId/refinements`, manual changes as `PUT /trips/:tripId/itinerary`, and trip access as a `members` sub-resource.

## Alternatives Considered

### Alternative 1: Store trips under `users/{userId}/trips`
- **Pros**: straightforward for single-owner private trips
- **Cons**: awkward and brittle once multiple users need access to the same trip
- **Why not**: sharing would force duplication or indirection around the wrong aggregate root

### Alternative 2: One generic `POST /mutations`
- **Pros**: flexible
- **Cons**: opaque, hard to document, weak resource semantics
- **Why not**: it produces a less understandable API

## Consequences

### Positive
- One canonical trip record regardless of how many users can access it
- Permission checks remain explicit and resource-based

### Negative
- The data model is slightly more complex than a single-owner private trip store

### Risks
- Too many action endpoints over time
- Mitigation: keep action endpoints limited to expensive domain actions such as refinement
