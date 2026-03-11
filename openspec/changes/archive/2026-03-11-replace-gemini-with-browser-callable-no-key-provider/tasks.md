## 1. Provider selection and setup removal

- [x] 1.1 Choose and document the exact browser-callable no-key provider endpoint that satisfies the CORS and frontend-only constraints.
- [x] 1.2 Remove Gemini-specific dependency and client-side env injection from `package.json` and `vite.config.ts`.
- [x] 1.3 Replace Gemini onboarding in `README.md` with setup instructions that require no API key.

## 2. Browser service implementation

- [x] 2.1 Replace `src/services/geminiService.ts` with a provider-neutral browser service module built on `fetch`.
- [x] 2.2 Implement new-trip itinerary generation against the chosen no-key endpoint.
- [x] 2.3 Implement itinerary refinement using prompt, recent chat history, and current itinerary context against the same endpoint.
- [x] 2.4 Add local response parsing, required-field validation, and activity ID injection before returning a `TravelItinerary`.
- [x] 2.5 Add clear failure handling for invalid provider output, network failures, rate limiting, and CORS/browser compatibility errors.

## 3. App integration and verification

- [x] 3.1 Update `src/App.tsx` to use the provider-neutral itinerary service without changing the UI flow.
- [x] 3.2 Verify itinerary generation works in a fresh local environment without any API key configuration.
- [x] 3.3 Verify itinerary refinement still works and preserves the existing `TravelItinerary` UI contract.
