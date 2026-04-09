# ADR-0002: Use Firebase ID tokens for API authentication

**Date**: 2026-03-31
**Status**: accepted
**Deciders**: product + engineering

## Context

The app already uses Firebase Authentication with Google sign-in. Adding a second session system would duplicate identity state and increase auth surface area.

## Decision

Authenticate API requests with Firebase ID tokens and derive `userId` from the verified token on the server.

## Alternatives Considered

### Alternative 1: Custom session cookies
- **Pros**: strong server ownership, classic web pattern
- **Cons**: another auth stack to maintain
- **Why not**: redundant with the current Firebase Auth setup

### Alternative 2: Public anonymous API for trip operations
- **Pros**: lowest friction
- **Cons**: no durable identity for shared-trip collaboration
- **Why not**: collaborative editing requires durable membership identity

## Consequences

### Positive
- Reuses the existing login flow
- Keeps member resolution and trip permission checks simple and explicit

### Negative
- Every backend environment must be configured to verify Firebase tokens

### Risks
- Token verification misconfiguration
- Mitigation: centralize auth middleware and fail closed
