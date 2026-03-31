# ADR-0006: Support trip collaboration with role-based membership

**Date**: 2026-03-31
**Status**: accepted
**Deciders**: product + engineering

## Context

Trip sharing is part of the current product direction. The system needs to let friends collaborate on one itinerary without cloning the trip per user.

## Decision

Represent shared access through explicit trip memberships with `owner`, `editor`, and `viewer` roles. Keep role enforcement in the API, and expose membership management through `/trips/:tripId/members`.

## Alternatives Considered

### Alternative 1: Duplicate trips into each user's namespace
- **Pros**: simple reads per user
- **Cons**: synchronization problems, conflicting edits, and duplicated history
- **Why not**: one logical trip should have one canonical itinerary

### Alternative 2: Public read/write share links
- **Pros**: low-friction sharing
- **Cons**: weak accountability and higher abuse risk
- **Why not**: the current product needs friend collaboration, not anonymous editing

## Consequences

### Positive
- Clear collaborative model
- Fine-grained authorization by role

### Negative
- Member management introduces extra backend flows

### Risks
- Role escalation or permission bugs
- Mitigation: centralize policy checks and keep write permissions narrow
