"use client";

import Button from "@/components/ui/Button";
import SearchPromptBar from "@/components/ui/SearchPromptBar";
import { SUGGESTED_PROMPTS } from "@/constants";
import { useAppHeaderState } from "@/app/auth";
import { TripsProvider, useTrips } from "@/contexts/trips";
import { motion } from "framer-motion";
import { MoveUpRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

const SEARCH_OVERLAY_IMAGE =
  "https://images.pexels.com/photos/1261728/pexels-photo-1261728.jpeg?auto=compress&cs=tinysrgb&w=2560&q=80";

interface HomePageContentProps {
  onSearch: (prompt: string) => void;
  isSearching?: boolean;
}

function HomePageContent({ onSearch, isSearching = false }: HomePageContentProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchHintId = "trip-search-input-hint";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    onSearch(trimmedQuery);
    setIsFocused(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (isSearching) {
      return;
    }

    setQuery(suggestion);
    onSearch(suggestion);
    setIsFocused(false);
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-themed">
      <section className="relative flex h-auto min-h-screen sm:h-screen md:h-[100dvh] flex-col overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={SEARCH_OVERLAY_IMAGE}
            alt="Mountain Landscape"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />
        </div>

        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-4 py-4 pt-[4rem] text-center sm:px-6 sm:py-6 sm:pt-[4.5rem] md:px-12 md:py-8 md:pt-[5rem] lg:px-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-4 flex max-w-3xl flex-col items-center sm:mb-6 md:mb-8"
          >
            <h1 className="mb-3 text-3xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:mb-4 sm:text-5xl md:text-6xl lg:text-7xl">
              Start with one clear idea.
            </h1>
            <p className="max-w-2xl text-sm font-light leading-relaxed text-white/90 drop-shadow-md sm:text-base md:text-lg md:leading-relaxed lg:text-xl">
              Tell Poreia where you want to go, what kind of trip you want, or
              how much you want to spend.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className={`w-full max-w-4xl rounded-2xl sm:rounded-[2rem] border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5 md:p-7 ${
              isFocused ? "sm:scale-[1.005]" : ""
            }`}
          >
            <div className="mb-3 text-center sm:mb-4">
              <h2 className="mb-0.5 text-xs font-bold tracking-[0.15em] text-white/80 uppercase sm:mb-1">
                Where should we start?
              </h2>
              <p className="text-xs text-white/90 sm:text-sm">
                One sentence is enough.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              aria-busy={isSearching}
              className="space-y-2.5 sm:space-y-3"
            >
              <div className="w-full">
                <SearchPromptBar
                  aria-describedby={searchHintId}
                  disabled={isSearching}
                  id="trip-search-input"
                  isLoading={isSearching}
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

              {isSearching ? (
                <p
                  id={searchHintId}
                  role="status"
                  aria-live="polite"
                  className="loading-status text-center text-xs text-white/70 sm:text-sm"
                >
                  <span
                    className="loading-status-copy"
                    data-text="Generation might take a while. Hang tight while Poreia builds the first draft."
                  >
                    Plan generation might take a while, hang tight
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
                  className="text-center text-xs text-white/70 sm:text-sm"
                >
                  Start with the destination, tone, timing, or budget.
                </p>
              )}

              <div className="w-full">
                <h3 className="mb-2.5 text-center text-xs font-bold tracking-[0.15em] text-white/80 uppercase sm:mb-3">
                  Try one of these
                </h3>
                <div className="space-y-2 sm:space-y-2.5 md:grid md:grid-cols-2 md:gap-3">
                  {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
                    <Button
                      key={prompt}
                      type="button"
                      variant="ghost"
                      onClick={() => handleSuggestionClick(prompt)}
                      disabled={isSearching}
                      className="group h-auto w-full justify-start whitespace-normal rounded-lg py-2.5 px-3 text-left text-xs sm:rounded-xl sm:text-[0.9rem] border border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/35"
                    >
                      <span className="shrink-0 text-white/50 transition-colors duration-150 group-hover:text-white/80">
                        <MoveUpRight
                          size={12}
                          strokeWidth={2.5}
                          className="sm:w-[14px] sm:h-[14px]"
                        />
                      </span>
                      <span className="font-medium leading-snug text-white/90 group-hover:text-white">
                        {prompt}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>
            </form>
          </motion.div>
        </main>
      </section>
    </div>
  );
}

function AuthenticatedHomePage() {
  const router = useRouter();
  const {
    actions: { createTrip },
    state: { isCreatingTrip },
  } = useTrips();

  const handleSearch = async (prompt: string) => {
    const trip = await createTrip(prompt);
    if (trip) {
      router.push(`/t/${trip.id}`);
    }
  };

  return (
    <HomePageContent
      onSearch={(prompt) => void handleSearch(prompt)}
      isSearching={isCreatingTrip}
    />
  );
}

export default function HomePage() {
  const { authUser, openAuthModal } = useAppHeaderState();

  if (!authUser) {
    return <HomePageContent onSearch={openAuthModal} />;
  }

  return (
    <TripsProvider user={authUser}>
      <AuthenticatedHomePage />
    </TripsProvider>
  );
}
