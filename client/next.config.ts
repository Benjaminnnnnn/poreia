import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(process.cwd(), "../"),
  async headers() {
    return [
      {
        // Allow Supabase signInWithOAuth popup — Next.js 15 sets COOP: same-origin by default
        // which blocks the OAuth popup's window.closed polling.
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },

  async rewrites() {
    const apiBase = isDev
      ? "http://127.0.0.1:8787"
      : "https://poreia-server.sudoku-piccollage.workers.dev";

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
      {
        source: "/api/google-places/:path*",
        destination: "https://places.googleapis.com/:path*",
      },
    ];
  },
};

export default nextConfig;
