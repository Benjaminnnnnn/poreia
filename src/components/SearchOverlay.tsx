import React, { useState } from 'react';
import { ArrowUpRight, Search, Sparkles } from 'lucide-react';
import { SUGGESTED_PROMPTS } from '../constants';

interface SearchOverlayProps {
  onSearch: (prompt: string) => void;
  isGenerating: boolean;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ onSearch, isGenerating }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
      setIsFocused(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion);
    setIsFocused(false);
  };

  return (
    <div className="flex h-full w-full items-start justify-center px-4 py-20 sm:px-5 md:items-center md:px-8 md:py-12">
      <section className="w-full max-w-4xl rounded-[2rem] border border-white/80 bg-[rgba(255,250,245,0.96)] px-5 py-6 shadow-[0_28px_80px_rgba(101,58,22,0.1)] sm:px-8 sm:py-10 md:rounded-[2.5rem] md:px-12 md:py-12">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[rgba(200,97,55,0.9)]">
            AI travel agency
          </p>
          <h1 className="font-display mt-4 max-w-2xl text-[clamp(2.2rem,9vw,5rem)] leading-[0.96] tracking-[-0.05em] text-[rgba(74,43,26,0.96)]">
            Start with a trip idea.
          </h1>
          <p className="mt-4 max-w-2xl text-[0.95rem] leading-7 text-[rgba(105,70,48,0.84)] md:text-lg">
            Describe the kind of getaway you want, and Poreia will turn it into a ready-to-edit itinerary.
          </p>

          <div className={`mt-8 transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
            <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(239,215,193,0.92)] bg-[rgba(255,252,248,0.98)] shadow-[0_20px_48px_rgba(101,58,22,0.08)]">

              <form onSubmit={handleSubmit} className="relative flex flex-col gap-3 p-3 md:flex-row md:items-center">
                <div className="flex flex-1 items-center gap-3 rounded-[1.4rem] px-3 py-3 md:min-h-[4.8rem] md:px-4">
                  <div className="text-[rgba(200,97,55,0.95)]">
                    {isGenerating ? <Sparkles className="animate-spin-slow" size={22} /> : <Search size={22} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <label
                      htmlFor="trip-search-input"
                      className="mb-1 block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[rgba(120,77,50,0.74)]"
                    >
                      Prompt
                    </label>
                    <input
                      id="trip-search-input"
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                      placeholder="A long weekend in Lisbon with ocean views, late dinners, and a sensible budget"
                      className="h-8 w-full bg-transparent border-none p-0 text-base font-medium text-[rgba(74,43,26,0.96)] outline-none placeholder:text-[rgba(120,77,50,0.46)] sm:text-lg"
                      disabled={isGenerating}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!query.trim() || isGenerating}
                  className="flex min-h-[3.5rem] w-full shrink-0 items-center justify-center gap-2 rounded-[1.35rem] border border-[rgba(214,98,54,0.2)] bg-[rgba(230,106,63,0.96)] px-5 py-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(210,96,47,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[rgba(217,98,56,1)] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-[4.8rem] md:min-w-[10rem] md:w-auto"
                >
                  Start planning
                  <ArrowUpRight size={18} />
                </button>
              </form>

              {isGenerating && (
                <div className="absolute bottom-0 left-0 h-1 w-full bg-[rgba(230,106,63,0.72)] animate-progress" />
              )}
            </div>
          </div>

          <div className="mt-7">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[rgba(126,82,54,0.72)]">
              Sample prompts
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {SUGGESTED_PROMPTS.slice(0, 4).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(prompt)}
                  className="w-full rounded-full border border-[rgba(244,223,202,0.92)] bg-[rgba(255,252,248,0.96)] px-4 py-3 text-left text-sm font-medium text-[rgba(89,58,38,0.94)] transition-all hover:-translate-y-0.5 hover:border-[rgba(236,156,94,0.72)] hover:text-[rgba(211,93,53,0.96)] sm:w-auto sm:py-2.5"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SearchOverlay;
