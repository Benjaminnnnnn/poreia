<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1mwOsu99ncyJ363nkRgPeclg6QK3NIhh_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## VS Code Dev Container

This repo includes a shared Linux-based VS Code dev container in `.devcontainer/devcontainer.json` so Mac and Windows contributors can use the same development environment.

### Host prerequisites

- macOS: Docker Desktop and Visual Studio Code
- Windows: Docker Desktop (or compatible Docker engine with Dev Containers support) and Visual Studio Code
- VS Code extension: `Dev Containers` (`ms-vscode-remote.remote-containers`)

### Open the project in the container

1. Open the repository in VS Code.
2. Run `Dev Containers: Reopen in Container`.
3. Wait for the container build and initial `npm ci` to finish.
4. Start the app in the container terminal with `npm run dev`.

### Notes

- The container uses a Linux Node 22 environment to match the project runtime.
- `node_modules` is stored in a Docker volume inside the container workflow so host OS differences do not leak into dependencies.
- `.env.local` stays on your local checkout and is available inside the mounted workspace, so each contributor can keep their own local secrets.
- In development, itinerary API calls are proxied through the Vite dev server at `/api/pollinations/...` to avoid browser-side CORS issues, including when running in a dev container.
- Contributors can still run the project directly on their host OS if they prefer, but the dev container is the recommended shared setup.

## AI Provider

The app now uses Pollinations' browser-callable text endpoint at `https://gen.pollinations.ai/text/...`.

- The app first tries direct browser access without any local API key.
- If `VITE_POLLINATIONS_API_KEY` is set, the app uses Pollinations' OpenAI-compatible chat completions endpoint at `https://gen.pollinations.ai/v1/chat/completions`.
- For local/dev only, you can use your Pollinations secret key in `.env.local` to make the app functional immediately.
- Do not expose a secret `sk_...` key in any deployed client or public repository.
- Requests are sent directly from the browser with `fetch`.
- If generation fails in-browser, the most likely causes are provider availability, rate limiting, or CORS/network restrictions.

## Structure

The app now follows a standard Vite layout:

- `src/main.tsx` mounts React
- `src/App.tsx` contains the top-level app shell
- `src/components/` holds reusable UI
- `src/services/` holds API/service clients
- `src/constants/` holds seed data and prompts
- `src/types/` holds shared TypeScript types
- `src/styles/global.css` holds global app styles
- `public/` holds static files copied as-is at build time
