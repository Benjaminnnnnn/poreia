## Context

The current app is a frontend-only Vite React application. It calls `generateOrRefineItinerary` from `src/services/geminiService.ts`, which imports `@google/genai`, depends on `GEMINI_API_KEY` being injected into the client build through `vite.config.ts`, and relies on Gemini’s structured response features.

This change narrows the provider requirement significantly: the replacement must be callable directly from the browser, must not require a client-side API key, and must preserve the existing `TravelItinerary` contract used by `src/App.tsx`. That constraint rules out provider designs that depend on secret-bearing SDKs or a backend proxy.

## Goals / Non-Goals

**Goals:**
- Remove Gemini-specific SDK, client-side API key injection, and setup steps.
- Use a browser-callable no-key endpoint that works from the frontend without adding a backend.
- Preserve the existing itinerary creation and refinement interface used by the UI.
- Add local parsing and validation so the app remains resilient without Gemini schema enforcement.
- Handle browser-facing provider failures explicitly, including CORS, rate limits, and invalid responses.

**Non-Goals:**
- Add a server proxy, edge function, or other backend mediation layer.
- Redesign the `TravelItinerary` data model or the itinerary UI.
- Support multiple providers in the UI during this change.
- Guarantee the new provider offers the same reliability or latency profile as Gemini.

## Decisions

### 1. Use a provider-neutral browser service built on `fetch`

The integration will replace the Gemini SDK with a provider-neutral service module that issues direct browser `fetch` requests to a no-key provider endpoint.

Rationale:
- A no-key browser-callable endpoint does not benefit from an SDK that expects secret configuration.
- `fetch` keeps the client lightweight and makes the integration easier to swap later.
- This removes the need for Vite-time secret injection.

Alternatives considered:
- Another browser SDK: rejected because the no-key requirement makes SDK value low and lock-in higher.
- Backend proxy: rejected because it violates the frontend-only constraint in this change.

### 2. Keep one app-facing itinerary generation function

The UI will continue to call one async itinerary service function for both new-trip creation and refinement. Internally, the module may be renamed to reflect provider-neutral behavior, but the app-level contract stays stable.

Rationale:
- `src/App.tsx` already has a clean service boundary.
- This reduces churn and keeps the provider swap focused on the service layer.

Alternatives considered:
- Splitting generate/refine into separate app services immediately: rejected because the current combined API already maps cleanly to both flows.

### 3. Move all structure enforcement into local validation

Because the replacement provider cannot be assumed to support Gemini-style schema enforcement, the app will treat provider output as untrusted text, parse it into JSON, validate required itinerary fields, and only then return a `TravelItinerary`.

Rationale:
- Browser-callable free providers often return plain text or loosely structured JSON.
- The UI requires predictable fields for itinerary rendering, drag-and-drop, and map pins.

Alternatives considered:
- Trust provider output directly: rejected because malformed content would break the app.
- Relax the UI to accept partial itinerary data: rejected because it expands scope and weakens correctness.

### 4. Treat browser-callability as a functional requirement

Provider compatibility is not just about model quality; the provider must support browser requests without secret auth and without CORS failures that block normal app usage.

Rationale:
- A “free” provider that only works from a server would fail the real integration constraint.
- Browser runtime behavior is part of the product requirement here, not an implementation detail.

Alternatives considered:
- Pick a provider first and handle browser issues later: rejected because CORS/no-key support is the primary acceptance gate.

## Risks / Trade-offs

- [No-key browser endpoints may be rate-limited or unstable] → Mitigation: isolate provider logic behind one service module so the endpoint can be swapped with minimal UI churn.
- [Structured output may be weaker than Gemini] → Mitigation: use strict prompting, parse defensively, and reject invalid responses with clear app errors.
- [CORS behavior may vary or change] → Mitigation: verify browser compatibility during implementation and document the chosen endpoint assumption clearly.
- [Provider usage may be public and shared] → Mitigation: expect occasional degraded availability and surface actionable error messages to users.

## Migration Plan

1. Replace `src/services/geminiService.ts` with a provider-neutral browser service module using direct `fetch`.
2. Update `src/App.tsx` imports to use the new module without changing the UI contract.
3. Remove Gemini dependency and client-side env injection from `package.json`, `vite.config.ts`, and README.
4. Validate both itinerary generation and refinement against the no-key browser endpoint in a real browser environment.
5. If the chosen endpoint proves non-viable, revert to the existing Gemini service while reevaluating provider constraints.

## Open Questions

- Which exact no-key browser-callable provider endpoint will be the initial target?
- Does the chosen endpoint consistently return content that can be parsed into the existing `TravelItinerary` shape without excessive repair logic?
