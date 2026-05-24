import type { PublicTripResponse } from "@/types";
import { notFound } from "next/navigation";
import PublicTripView from "./PublicTripView";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8787"
    : "https://poreia-server.sudoku-piccollage.workers.dev");

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  const res = await fetch(`${BACKEND_URL}/api/v1/share/${tripId}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    notFound();
  }

  const body = (await res.json()) as { data: PublicTripResponse };
  return <PublicTripView trip={body.data} />;
}
