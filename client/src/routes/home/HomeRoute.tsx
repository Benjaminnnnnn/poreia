import { useAppNavigation } from "@/app/navigation";
import SearchPromptBar from "@/components/ui/SearchPromptBar";
import { SUGGESTED_PROMPTS } from "@/constants";
import { useTrips } from "@/features/trips/state/TripsContext";
import { motion } from "framer-motion";
import { MoveUpRight, Search } from "lucide-react";
import React, { useState } from "react";

const SEARCH_OVERLAY_IMAGE =
  "https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=2560&q=80";

const HomeRoute: React.FC = () => {
  const {
    actions: { openTrip },
  } = useAppNavigation();
  const {
    actions: { createTrip },
    state: { isCreatingTrip },
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
    <div className="h-full overflow-y-auto">
      {/* Hero Section — full viewport */}
      <section className="relative flex h-[100dvh] min-h-[600px] flex-col overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src={SEARCH_OVERLAY_IMAGE}
            alt="Mountain Landscape"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
        </div>

        {/* Main content — pt clears the absolute AppHeader (~4.5rem) */}
        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-6 pt-[4.5rem] text-center sm:px-12 sm:pt-[5rem] lg:px-24">
          {/* Hero text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-12 flex max-w-3xl flex-col items-center"
          >
            <h1 className="mb-6 text-5xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-6xl lg:text-7xl">
              Start with one clear idea.
            </h1>
            <p className="max-w-2xl text-lg font-light leading-relaxed text-white/90 drop-shadow-md sm:text-xl">
              Tell Poreia where you want to go, what kind of trip you want, or
              how much you want to spend.
            </p>
          </motion.div>

          {/* Glassmorphic card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className={`w-full max-w-4xl rounded-[2rem] border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-10 ${
              isFocused ? "scale-[1.005]" : ""
            }`}
          >
            <div className="mb-6 text-center">
              <h2 className="mb-2 text-xs font-bold tracking-[0.15em] text-white/80 uppercase">
                Where should we start?
              </h2>
              <p className="text-sm text-white/90">One sentence is enough.</p>
            </div>

            <form onSubmit={handleSubmit} aria-busy={isGenerating}>
              <div className="mb-4 w-full">
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
              </div>

              {isGenerating ? (
                <p
                  id={searchHintId}
                  role="status"
                  aria-live="polite"
                  className="loading-status mb-8 text-center text-sm text-white/70"
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
                  className="mb-8 text-center text-sm text-white/70"
                >
                  Start with the destination, tone, timing, or budget.
                </p>
              )}

              <div className="w-full">
                <h3 className="mb-4 text-center text-xs font-bold tracking-[0.15em] text-white/80 uppercase">
                  Try one of these
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSuggestionClick(prompt)}
                      disabled={isGenerating}
                      className="group flex min-h-[3.25rem] w-full items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-5 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <span className="shrink-0 text-white/50 transition-colors duration-150 group-hover:text-white/80">
                        <MoveUpRight size={14} strokeWidth={2.5} />
                      </span>
                      <span className="text-[0.9rem] font-medium leading-snug text-white/90 group-hover:text-white">
                        {prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </motion.div>
        </main>
      </section>
    </div>
  );
};

export default HomeRoute;
