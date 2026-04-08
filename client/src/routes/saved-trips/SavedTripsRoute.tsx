import { useAppNavigation } from "@/app/navigation";
import Badge from "@/components/ui/Badge";
import Surface from "@/components/ui/Surface";
import { useTrips } from "@/features/trips/state/TripsContext";
import { ArrowUpRight, Clock3, Trash2 } from "lucide-react";
import React from "react";

const formatTripDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const SavedTripsRoute: React.FC = () => {
  const {
    actions: { openTrip },
  } = useAppNavigation();
  const {
    actions: { deleteTrip },
    state: { isLoadingTrips, trips },
  } = useTrips();

  return (
    <div className="h-full overflow-y-auto bg-[rgb(248,245,240)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(126,82,54,0.72)]">
            Your itineraries
          </p>
          <h1 className="font-display mt-2 text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[0.96] tracking-[-0.045em] text-[rgba(74,43,26,0.96)]">
            Saved trips
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-6 text-[rgba(112,75,52,0.76)]">
            Keep multiple trips in progress and pick up where you left off.
          </p>
        </div>

        {isLoadingTrips ? (
          <Surface
            as="div"
            variant="dashed"
            radius="xl"
            className="px-5 py-10 text-center"
          >
            <p className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-[rgba(84,50,31,0.96)]">
              Loading your trips.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[rgba(112,75,52,0.76)]">
              Pulling your saved itineraries.
            </p>
          </Surface>
        ) : trips.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-3">
            {trips.map((trip) => (
              <Surface
                as="article"
                key={trip.id}
                variant="card"
                radius="xl"
                className="group relative flex min-h-[8.75rem] w-full flex-col justify-between overflow-hidden p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(237,170,118,0.42)] hover:shadow-[0_18px_32px_rgba(108,62,26,0.08)]"
              >
                <button
                  type="button"
                  aria-label={`Delete ${trip.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteTrip(trip.id);
                  }}
                  className="focus-ring absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-[rgba(236,220,204,0.86)] bg-[rgba(255,252,248,0.9)] text-[rgba(121,84,60,0.62)] shadow-[0_8px_18px_rgba(108,62,26,0.06)] transition-[background-color,color,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[rgba(234,193,169,0.92)] hover:bg-[rgba(255,250,246,0.98)] hover:text-[rgba(207,80,71,0.96)]"
                >
                  <Trash2 size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => openTrip(trip.id)}
                  className="focus-ring flex h-full flex-col justify-between rounded-[1.25rem] text-left"
                >
                  <div className="pr-9">
                    <Badge
                      tone="glass"
                      size="sm"
                      className="-ml-3 rounded-[0.45rem] border-[rgba(255,255,255,0.82)] bg-[rgba(255,252,247,0.8)] tracking-[0.14em]"
                    >
                      {trip.totalDays ? `${trip.totalDays} days` : "Draft trip"}
                    </Badge>
                    <h2 className="mt-2 line-clamp-2 max-w-[15ch] font-display text-[1.35rem] leading-[0.96] tracking-[-0.045em] text-[rgba(72,43,27,0.96)] lg:text-[1.5rem]">
                      {trip.destination || trip.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 max-w-[34ch] text-[0.92rem] leading-6 text-[rgba(105,69,48,0.78)]">
                      {trip.overview ||
                        "Open this trip to keep refining the itinerary."}
                    </p>
                  </div>

                  <div className="mt-4 flex w-full items-center justify-between text-[0.82rem] font-medium text-[rgba(118,80,57,0.78)]">
                    <span className="inline-flex items-center gap-1.5 [font-variant-numeric:tabular-nums]">
                      <Clock3 size={14} />
                      Updated {formatTripDate(trip.updatedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[rgba(206,95,55,0.94)] transition-transform duration-200 group-hover:translate-x-0.5">
                      Open
                      <ArrowUpRight size={14} />
                    </span>
                  </div>
                </button>
              </Surface>
            ))}
          </div>
        ) : (
          <Surface
            as="div"
            variant="dashed"
            radius="xl"
            className="px-5 py-10 text-center"
          >
            <p className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-[rgba(84,50,31,0.96)]">
              Your trip shelf is empty.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[rgba(112,75,52,0.76)]">
              The first itinerary you generate will stay here so you can jump
              back in without reopening a menu.
            </p>
          </Surface>
        )}
      </div>
    </div>
  );
};

export default SavedTripsRoute;
