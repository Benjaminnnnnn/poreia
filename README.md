# Poreia

AI travel planner that turns a single sentence into a multi-day itinerary with budget guidance, an editable day-by-day plan, a map view, and saved trip history.

## Attribution

No open-source project was imported or used as a starting point. The application was scaffolded with Vite's `react-ts` template and built from there.

All application code in this repository is original and written for this project, including:

- Itinerary generation pipeline and prompt design (`client/src/services`, `client/src/constants`)
- UI components, layout, and styling (`client/src/components`, `client/src/styles`)
- Drag-and-drop itinerary editing and day-by-day reflection flow
- Map view integration built on Leaflet
- Cloudflare Worker backend, route handlers, and Firestore access layer (`server/src`)
- Firebase Authentication integration and client-side session handling
- Rate limiting and request validation on the server

Third-party services consumed through their public APIs: Pollinations (itinerary generation), Google Places (activity photos), Firebase Authentication, Firestore, and OpenStreetMap tiles via Leaflet.

### LLM Integration

Itinerary generation runs as a two-agent harness on top of Pollinations, with both the prompt design and the orchestration layer written from scratch for this project:

- **Planner agent (GPT via Pollinations).** Receives the user's natural-language prompt along with structured constraints (dates, budget, travel style) and returns a day-by-day itinerary as strict JSON. Prompt templates, schema definitions, and output parsing live in `client/src/services` and `client/src/constants`.
- **Validator agent (Gemini via Pollinations).** Cross-checks the planner's output for factual drift, schedule conflicts, budget overruns, and geographic incoherence (e.g., activities that are impractically far apart within a single day). When the validator flags an issue, the harness either requests a targeted revision from the planner or annotates the itinerary with the concern before returning it to the UI.

This dual-agent setup is our own quality-assurance layer: the planner optimizes for creativity and coverage, while the validator acts as an independent reviewer, reducing hallucinations and improving itinerary reliability before results reach the user.

## Features

- Natural-language prompt to structured multi-day itinerary
- Follow-up refinement of an existing trip without restarting
- Per-user saved trip history with Google sign-in
- Map view of itinerary stops
- Drag-and-drop reordering of activities
- Place imagery via Google Places
- Per-day notes and mood reflections

## Stack

React 19, TypeScript, Vite, Firebase Authentication, Firestore, Cloudflare Workers, Leaflet, `@dnd-kit`, Recharts, Pollinations.

## Getting Started

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment

`client/.env.local`

```bash
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_GOOGLE_PLACES_API_KEY=your_browser_restricted_google_places_key
VITE_POLLINATIONS_API_KEY=optional_pollinations_key
```

`server/.dev.vars`

```bash
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
POLLINATIONS_API_KEY=optional_pollinations_api_key
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

`VITE_FIREBASE_API_KEY` is required. `VITE_GOOGLE_PLACES_API_KEY` enables activity photos. `VITE_POLLINATIONS_API_KEY` switches the client to Pollinations' OpenAI-compatible endpoint; without it, the browser-callable text endpoint is used.

In development, Vite proxies provider requests through `/api/pollinations/text`, `/api/pollinations/v1`, and `/api/google-places`.

## Dev Container

A VS Code dev container is provided at `.devcontainer/devcontainer.json` (Linux Node 22). Run `Dev Containers: Reopen in Container`, then:

```bash
npm run dev              # client + server + firestore emulator
npm run server:dev       # backend only on http://localhost:8787
npm run firestore:emulator
```

The Firestore emulator runs on `http://localhost:8080` with the Emulator UI on `http://localhost:4000`.

## Scripts

```bash
npm run dev                       # client, server, and firestore emulator
npm run client:dev                # client only
npm run server:dev                # Cloudflare Worker backend
npm run server:typecheck
npm run server:test:integration   # integration tests against the Firestore emulator
npm run firestore:emulator
```

## Project Structure

```text
client/src/
  components/   UI surfaces: search, itinerary, map
  constants/    prompts and seed values
  lib/          Firebase setup
  services/     itinerary and image providers
  styles/       global styles
  types/        shared TypeScript models
server/src/     Cloudflare Worker API, routes, Firestore access
server/test/    integration coverage against the Firestore emulator
.devcontainer/  VS Code container config
```
