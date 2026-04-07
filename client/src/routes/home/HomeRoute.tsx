import { useAppNavigation } from "@/app/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import SearchPromptBar from "@/components/ui/SearchPromptBar";
import Surface from "@/components/ui/Surface";
import { SUGGESTED_PROMPTS } from "@/constants";
import { useTrips } from "@/features/trips/state/TripsContext";
import { ArrowUpRight, Clock3, Search, Trash2 } from "lucide-react";
import React, { useState } from "react";

const SEARCH_OVERLAY_IMAGE =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const formatTripDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const HomeRoute: React.FC = () => {
  const {
    actions: { openTrip },
  } = useAppNavigation();
  const {
    actions: { createTrip, deleteTrip },
    state: { isCreatingTrip, isLoadingTrips, trips },
  } = useTrips();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchHintId = "trip-search-input-hint";
  const isGenerating = isCreatingTrip;

  const handleSearch = async (prompt: string) => {
    const trip = await createTrip(prompt);
    if (trip) {
      openTrip(trip.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    void handleSearch(trimmedQuery);
    setIsFocused(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isGenerating) {
      return;
    }

    setQuery(suggestion);
    void handleSearch(suggestion);
    setIsFocused(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-[rgb(248,245,240)]">
      <div className="flex w-full flex-col">
        <section className="relative overflow-hidden border-b border-[rgba(233,221,207,0.96)] bg-[rgba(250,246,240,0.96)]">
          <img
            aria-hidden="true"
            alt=""
            src={SEARCH_OVERLAY_IMAGE}
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[rgba(0,0,0,0.38)]"
          />
          {/* <div
            aria-hidden="true"
            className="absolute left-[max(10rem,16vw)] top-[max(1rem,2vw)] h-[16rem] w-[min(50rem,78vw)] bg-[rgba(251,247,241,0.62)] blur-2xl"
          /> */}

          <div
            className={`relative transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isFocused ? "scale-[1.005]" : ""
            }`}
          >
            <form
              onSubmit={handleSubmit}
              className="flex flex-col"
              aria-busy={isGenerating}
            >
              <div className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
                <div className="mx-auto max-w-3xl">
                  <div>
                    <h1 className="font-display text-[clamp(2.25rem,6vw,4.35rem)] leading-[0.92] tracking-[-0.055em] text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
                      Start with one clear idea.
                    </h1>
                    <p className="mt-4 max-w-[52ch] text-base leading-7 text-white/85">
                      Tell Poreia where you want to go, what kind of trip you
                      want, or how much you want to spend.
                    </p>
                  </div>

                  <Surface
                    as="div"
                    variant="glass"
                    padding="none"
                    radius="xl"
                    className="mt-8 overflow-hidden border-[rgba(236,220,204,0.96)] bg-[rgba(255,252,248,0.94)] shadow-[0_20px_48px_rgba(118,74,36,0.1)] backdrop-blur-[3px]"
                  >
                    <div className="border-b border-[rgba(240,226,210,0.94)] bg-[rgba(255,249,243,0.7)] px-4 py-3 sm:px-5">
                      <div>
                        <label
                          htmlFor="trip-search-input"
                          className="block text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[rgba(127,86,58,0.72)]"
                        >
                          Where should we start?
                        </label>
                        <p className="mt-1 text-[0.9375rem] leading-6 text-[rgba(117,81,58,0.74)]">
                          One sentence is enough.
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-4 sm:px-5">
                      <SearchPromptBar
                        aria-describedby={searchHintId}
                        disabled={isGenerating}
                        id="trip-search-input"
                        isLoading={isGenerating}
                        label="Where should we start?"
                        leadingIcon={<Search size={18} />}
                        loadingLabel="Planning…"
                        onFocusStateChange={setIsFocused}
                        onValueChange={setQuery}
                        placeholder="3 relaxed days in Lisbon with ocean views and late dinners"
                        submitLabel="Start planning"
                        value={query}
                      />
                      {isGenerating ? (
                        <p
                          id={searchHintId}
                          role="status"
                          aria-live="polite"
                          className="loading-status mt-2 text-[0.9375rem] leading-6 text-[rgba(125,86,61,0.78)]"
                        >
                          <span
                            className="loading-status-copy"
                            data-text="Generation might take a while. Hang tight while Poreia builds the first draft."
                          >
                            Generation might take a while, hang tight
                          </span>
                          <span aria-hidden="true" className="loading-ellipsis">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                          </span>
                        </p>
                      ) : (
                        <p
                          id={searchHintId}
                          className="mt-2 text-[0.9375rem] leading-6 text-[rgba(125,86,61,0.74)]"
                        >
                          Start with the destination, tone, timing, or budget.
                        </p>
                      )}

                      <div className="mt-5">
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/72">
                          Try one of these
                        </p>
                        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                          {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                            <Button
                              key={prompt}
                              onClick={() => handleSuggestionClick(prompt)}
                              disabled={isGenerating}
                              variant="secondary"
                              size="sm"
                              className="h-full min-h-[44px] w-full justify-start whitespace-normal px-4 py-2.5 text-left text-[0.95rem] font-medium leading-6 hover:-translate-y-0.5 disabled:hover:translate-y-0"
                            >
                              {prompt}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Surface>
                </div>
              </div>
            </form>
          </div>
        </section>

        <section className="bg-[rgba(248,245,240,0.98)] px-4 py-5 sm:px-6 lg:px-8">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(126,82,54,0.72)]">
                Saved trips
              </p>
              <h2 className="font-display mt-2 max-w-[18ch] text-[clamp(1.55rem,3vw,2.15rem)] leading-[0.96] tracking-[-0.045em] text-[rgba(74,43,26,0.96)]">
                Pick up where you left off.
              </h2>
            </div>
            <p className="max-w-[34ch] text-[0.9375rem] leading-6 text-[rgba(112,75,52,0.76)]">
              Keep multiple trips in progress.
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
            <div className="no-scrollbar max-h-[30rem] overflow-y-auto pr-1">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),24rem))] justify-start gap-3">
                {trips.map((trip) => (
                  <Surface
                    as="article"
                    key={trip.id}
                    variant="card"
                    radius="xl"
                    className="group relative flex min-h-[8.75rem] w-full max-w-[24rem] flex-col justify-between overflow-hidden p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(237,170,118,0.42)] hover:shadow-[0_18px_32px_rgba(108,62,26,0.08)] xl:min-h-[8.5rem]"
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
                          {trip.totalDays
                            ? `${trip.totalDays} days`
                            : "Draft trip"}
                        </Badge>
                        <h3 className="mt-2 line-clamp-2 max-w-[15ch] font-display text-[1.35rem] leading-[0.96] tracking-[-0.045em] text-[rgba(72,43,27,0.96)] lg:text-[1.5rem]">
                          {trip.destination || trip.title}
                        </h3>
                        <p className="mt-1.5 max-w-[34ch] line-clamp-2 text-[0.92rem] leading-6 text-[rgba(105,69,48,0.78)]">
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
        </section>
      </div>
    </div>
  );
};

export default HomeRoute;
