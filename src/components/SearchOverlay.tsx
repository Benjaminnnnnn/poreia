import { ArrowUpRight, Clock3, Search, Sparkles, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { SUGGESTED_PROMPTS } from "../constants";
import { TripSession } from "../types";

const SEARCH_OVERLAY_IMAGE =
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

interface SearchOverlayProps {
  onDeleteTrip: (tripId: string) => void;
  onOpenTrip: (tripId: string) => void;
  onSearch: (prompt: string) => void | Promise<void>;
  isGenerating: boolean;
  trips: TripSession[];
}

const formatTripDate = (timestamp: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(timestamp);

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  onDeleteTrip,
  onOpenTrip,
  onSearch,
  isGenerating,
  trips,
}) => {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    void onSearch(trimmedQuery);
    setIsFocused(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isGenerating) {
      return;
    }

    setQuery(suggestion);
    void onSearch(suggestion);
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
            className="absolute inset-0 bg-[rgba(248,243,236,0.28)]"
          />
          <div
            aria-hidden="true"
            className="absolute left-[max(1rem,4vw)] top-[max(1.5rem,5vw)] h-[16rem] w-[min(44rem,78vw)] bg-[rgba(251,247,241,0.62)] blur-2xl"
          />

          <div
            className={`relative transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isFocused ? "scale-[1.005]" : ""
            }`}
          >
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
                <div className="mx-auto max-w-5xl">
                  <div className="max-w-3xl">
                    {/* <p className="inline-flex border border-[rgba(228,194,166,0.94)] bg-[rgba(251,247,241,0.9)] px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-[rgba(191,89,46,0.98)] shadow-[0_6px_18px_rgba(118,74,36,0.06)]">
                      Plan a trip
                    </p> */}
                    <h1 className="font-display mt-4 text-[clamp(2.1rem,6vw,4.1rem)] leading-[0.95] tracking-[-0.05em] text-[rgba(63,36,22,0.98)] [text-shadow:0_1px_0_rgba(255,250,244,0.35)]">
                      Start with one clear idea.
                    </h1>
                    <p className="mt-3 max-w-xl text-[0.98rem] leading-7 text-[rgba(79,52,35,0.92)]">
                      Tell Poreia where you want to go, what kind of trip you
                      want, or how much you want to spend.
                    </p>
                  </div>

                  <div className="mt-8 max-w-4xl rounded-[0.55rem] border border-[rgba(230,214,197,0.96)] bg-[rgba(255,252,248,0.94)] shadow-[0_20px_48px_rgba(118,74,36,0.1)] backdrop-blur-[3px]">
                    <div className="border-b border-[rgba(240,226,210,0.94)] px-4 py-3">
                      <div>
                        <label
                          htmlFor="trip-search-input"
                          className="block text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(127,86,58,0.7)]"
                        >
                          Where should we start?
                        </label>
                        <p className="mt-1 text-sm text-[rgba(117,81,58,0.72)]">
                          One sentence is enough.
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-4">
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-14 items-center justify-center text-[rgba(211,98,57,0.96)]">
                          {isGenerating ? (
                            <Sparkles className="animate-spin-slow" size={18} />
                          ) : (
                            <Search size={18} />
                          )}
                        </div>
                        <input
                          id="trip-search-input"
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() =>
                            setTimeout(() => setIsFocused(false), 200)
                          }
                          placeholder="3 relaxed days in Lisbon with ocean views and late dinners"
                          className="h-14 w-full rounded-[0.55rem] border border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] pl-14 pr-4 text-lg font-semibold text-[rgba(74,43,26,0.97)] outline-none transition-colors placeholder:text-[rgba(150,112,82,0.52)] focus:border-[rgba(223,147,93,0.92)]"
                          disabled={isGenerating}
                        />
                      </div>
                      {isGenerating ? (
                        <p className="mt-2 text-sm text-[rgba(125,86,61,0.78)]">
                          Generation might take a while. Hang tight while Poreia
                          builds the first draft.
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(126,82,54,0.72)]">
                            Try one of these
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2.5">
                            {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() => handleSuggestionClick(prompt)}
                                disabled={isGenerating}
                                className="rounded-[0.55rem] border border-[rgba(239,215,193,0.96)] bg-[rgba(255,252,247,0.95)] px-4 py-2.5 text-left text-sm font-medium text-[rgba(89,58,38,0.94)] transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[rgba(234,160,100,0.78)] hover:text-[rgba(208,95,54,0.96)] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0 disabled:hover:border-[rgba(239,215,193,0.96)] disabled:hover:text-[rgba(89,58,38,0.94)]"
                              >
                                {prompt}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={!query.trim() || isGenerating}
                          className="flex min-h-[3.25rem] w-full shrink-0 items-center justify-center gap-2 rounded-[0.55rem] border border-[rgba(214,98,54,0.16)] bg-[rgba(230,106,63,0.96)] px-4 py-3 text-sm font-semibold text-white transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-[rgba(217,98,56,1)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[10.5rem]"
                        >
                          Start planning
                          <ArrowUpRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
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
              <h2 className="font-display mt-2 text-[clamp(1.45rem,3vw,2.1rem)] leading-[0.98] tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                Pick up where you left off.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[rgba(112,75,52,0.76)]">
              Keep multiple trips in progress.
            </p>
          </div>

          {trips.length ? (
            <div className="max-h-[30rem] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {trips.map((trip) => (
                  <article
                    key={trip.id}
                    className="group relative flex min-h-[10.25rem] w-full flex-col justify-between border border-[rgba(226,214,200,0.95)] bg-[rgba(255,251,246,0.96)] p-4 text-left transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 xl:min-h-[9.75rem]"
                  >
                    <button
                      type="button"
                      aria-label={`Delete ${trip.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteTrip(trip.id);
                      }}
                      className="absolute right-3 top-3 rounded-[0.5rem] p-2 text-[rgba(121,84,60,0.58)] transition-colors hover:bg-[rgba(255,250,246,0.85)] hover:text-[rgba(207,80,71,0.96)]"
                    >
                      <Trash2 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenTrip(trip.id)}
                      className="flex h-full flex-col justify-between text-left"
                    >
                      <div>
                        <div className="inline-flex rounded-[0.45rem] border border-[rgba(255,255,255,0.82)] bg-[rgba(255,252,247,0.8)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgba(72,131,126,0.92)]">
                          {trip.currentItinerary
                            ? `${trip.currentItinerary.totalDays} days`
                            : "Draft"}
                        </div>
                        <h3 className="mt-4 font-display text-[1.45rem] leading-[1.02] tracking-[-0.04em] text-[rgba(72,43,27,0.96)] lg:text-[1.55rem]">
                          {trip.currentItinerary?.destination || trip.title}
                        </h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[rgba(105,69,48,0.78)]">
                          {trip.currentItinerary?.overview ||
                            "Open this trip to keep refining the itinerary."}
                        </p>
                      </div>

                      <div className="mt-5 flex items-center justify-between text-[0.8rem] font-medium text-[rgba(118,80,57,0.78)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={14} />
                          Updated {formatTripDate(trip.updatedAt)}
                        </span>
                        <span className="text-[rgba(206,95,55,0.94)] transition-transform duration-200 group-hover:translate-x-0.5">
                          Open
                        </span>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[rgba(228,204,188,0.95)] bg-[rgba(255,250,245,0.74)] px-5 py-10 text-center">
              <p className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-[rgba(84,50,31,0.96)]">
                Your trip shelf is empty.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[rgba(112,75,52,0.76)]">
                The first itinerary you generate will stay here so you can jump
                back in without reopening a menu.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SearchOverlay;
