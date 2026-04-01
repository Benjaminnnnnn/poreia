# Poreia

Poreia is an AI travel planner for people who want to get from a rough idea to a usable itinerary fast.

Type one sentence. Poreia turns it into a multi-day trip plan with budget guidance, editable day-by-day activities, saved trip history, Google sign-in, and a map view you can keep refining before or during the trip.

## What Poreia Does

- Generates structured itineraries from a short natural-language prompt.
- Refines an existing trip with follow-up requests instead of forcing a restart.
- Saves multiple trips per signed-in user in the browser for quick return visits.
- Shows itinerary stops on a map and supports drag-and-drop reordering.
- Adds place imagery to activity cards through Google Places when available.
- Lets travelers keep notes and mood reflections for each day of the trip.

## Stack

- React 19
- TypeScript
- Vite
- Firebase Authentication with Google sign-in
- Pollinations for itinerary generation
- Leaflet for map rendering
- `@dnd-kit` for itinerary editing
- Recharts for budget visualization

## Run Locally

**Prerequisites**

- Node.js 22 or later

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with the variables you need:

   ```bash
   VITE_FIREBASE_API_KEY=your_firebase_web_api_key
   VITE_GOOGLE_PLACES_API_KEY=your_browser_restricted_google_places_key
   VITE_POLLINATIONS_API_KEY=optional_pollinations_key
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173`

## Environment Notes

### Required

- `VITE_FIREBASE_API_KEY`
  Firebase auth initialization fails without this key.

### Optional

- `VITE_GOOGLE_PLACES_API_KEY`
  Enables place photos for itinerary activities. Without it, activity cards still work, but image coverage is reduced.

- `VITE_POLLINATIONS_API_KEY`
  If set, the app uses Pollinations' OpenAI-compatible chat completions endpoint. If not set, it falls back to Pollinations' browser-callable text endpoint.

## Provider Behavior

Poreia currently uses Pollinations for itinerary generation.

- Anonymous mode uses the browser-callable text endpoint.
- Keyed mode uses Pollinations' OpenAI-compatible chat completions API.
- In development, Vite proxies provider requests through:
  - `/api/pollinations/text`
  - `/api/pollinations/v1`
  - `/api/google-places`

Do not ship private provider keys in a public client build.

## Dev Container

This repository includes a shared VS Code dev container in `.devcontainer/devcontainer.json`.

### Host prerequisites

- macOS or Windows
- Docker Desktop or another compatible Docker engine
- Visual Studio Code
- VS Code `Dev Containers` extension (`ms-vscode-remote.remote-containers`)

### Open the project in the container

1. Open the repository in VS Code.
2. Run `Dev Containers: Reopen in Container`.
3. Wait for the container build and initial dependency install to finish.
4. Create the local env files you need inside the workspace:

   ```bash
   cp server/.dev.vars.example server/.dev.vars
   ```

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
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nreplace-with-your-service-account-private-key\n-----END PRIVATE KEY-----\n"
   POLLINATIONS_API_KEY=optional_pollinations_api_key
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   ```

5. Start the services you need in separate container terminals:

   ```bash
   npm run dev
   npm run server:dev
   npm run firestore:emulator
   ```

### Notes

- The container uses a Linux Node 22 environment.
- Root `npm ci` installs both `client` and `server` through npm workspaces.
- The backend dev server is exposed on `http://localhost:8787`.
- The Firestore emulator and Emulator UI are exposed on `http://localhost:8080` and `http://localhost:4000`.
- `node_modules` lives in a Docker volume so host OS differences do not leak into dependencies.
- `client/.env.local` and `server/.dev.vars` stay in your local checkout and are mounted into the container workspace.
- Running directly on the host OS is still supported.

## Project Structure

```text
client/
  src/
    components/   UI surfaces such as search, itinerary, and map views
    constants/    prompts and seed values
    lib/          Firebase setup
    services/     itinerary and image provider integrations
    styles/       global styles
    types/        shared TypeScript models
    App.tsx       app shell, routing, auth gate
    main.tsx      React entry point
  public/         static files copied as-is
server/
  src/            Cloudflare Worker API, routes, and Firestore access
  test/           Integration coverage against the Firestore emulator
.devcontainer/    Shared VS Code container config and Dockerfile
```

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run client:dev
npm run server:dev
npm run server:typecheck
npm run firestore:emulator
npm run server:test:integration
```
