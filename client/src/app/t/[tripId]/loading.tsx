import { PageLoading } from "@/components/ui/PageLoading";

export default function TripLoading() {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden pt-[4.5rem] sm:pt-[5rem]">
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/45 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/25" />
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        <PageLoading className="h-full w-full" label="Loading your trip…" />
      </div>
    </div>
  );
}
