## Why

The current app depends on Gemini credentials injected into the browser build, which adds setup friction and exposes the assistant flow to provider-specific auth requirements. Replacing Gemini with a browser-callable no-key provider removes that configuration barrier and aligns the app with a true frontend-only integration model.

## What Changes

- Replace the Gemini SDK integration with a browser-callable free provider that does not require an API key in the client.
- Remove Gemini-specific dependency, environment variable handling, and setup documentation.
- Preserve the existing itinerary generation and refinement UX by keeping the same app-facing service contract.
- Add response parsing and validation to compensate for losing Gemini’s schema-enforced output path.
- Add failure handling for browser-side provider availability, rate limiting, malformed content, and CORS-related errors.

## Capabilities

### New Capabilities
- `browser-ai-itinerary-generation`: Generate and refine structured travel itineraries through a browser-callable no-key provider while preserving the `TravelItinerary` shape expected by the UI.

### Modified Capabilities
- None.

## Impact

- Affected code: `src/services/geminiService.ts`, `src/App.tsx`, `vite.config.ts`, `package.json`, and `README.md`.
- Dependencies: remove `@google/genai`; add only the browser-safe client logic needed for the chosen provider, preferably via `fetch`.
- Runtime behavior: itinerary generation and refinement move from Gemini SDK calls to direct browser requests against a no-key provider endpoint.
- Operational impact: local setup no longer depends on `GEMINI_API_KEY` or Gemini-specific onboarding.
