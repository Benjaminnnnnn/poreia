import PublicTripView from "./PublicTripView";

export default async function PublicTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <PublicTripView tripId={tripId} />;
}
