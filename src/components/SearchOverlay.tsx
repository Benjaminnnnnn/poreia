import React, { useState } from 'react';
import { Search, Sparkles, SendHorizontal } from 'lucide-react';
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
    <div className={`absolute inset-0 z-40 flex flex-col items-center justify-end pointer-events-none px-6 pb-6 pt-24 transition-all duration-500 ${isFocused ? 'bg-sky-950/12 backdrop-blur-sm' : ''}`}>
      <div className={`w-full max-w-3xl transition-all duration-300 pointer-events-auto ${isFocused ? 'mb-[18vh]' : 'mb-[5vh]'}`}>
        <div 
          className={`
            relative group overflow-hidden
            rounded-[2rem] transition-all duration-300
            ${isFocused ? 'scale-[1.02]' : 'hover:-translate-y-0.5'}
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-sky-500/30 via-cyan-400/20 to-orange-400/30 blur-xl" />
          <div className="absolute inset-0 rounded-[2rem] border border-white/60 bg-white/82 backdrop-blur-2xl shadow-[0_28px_80px_rgba(8,47,73,0.22)]" />
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2 p-2">
            <div className="pl-4 pr-3 text-sky-600">
               {isGenerating ? <Sparkles className="animate-spin-slow" size={24} /> : <Search size={24} />}
            </div>

            <label htmlFor="trip-search-input" className="sr-only">
              Describe the trip you want to plan
            </label>
            <input
              id="trip-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Plan a 5-day foodie trip to Tokyo on a $2,000 budget..."
              className="h-16 flex-1 bg-transparent border-none outline-none text-base font-medium text-sky-950 placeholder-sky-800/45 sm:text-lg"
              disabled={isGenerating}
            />

            <button 
              type="submit"
              disabled={!query.trim() || isGenerating}
              className="shrink-0 rounded-2xl bg-orange-500 p-3.5 text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <SendHorizontal size={20} />
            </button>
          </form>

          {/* Loading Progress Bar */}
          {isGenerating && (
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-orange-400 w-full animate-progress" />
          )}
        </div>

        {/* Suggestions */}
        <div className={`
          mt-4 grid gap-3 transition-all duration-300 overflow-hidden
          ${isFocused ? 'opacity-100 max-h-60' : 'opacity-100 max-h-60'}
        `}>
          <div className="flex flex-wrap gap-2 justify-center">
             {SUGGESTED_PROMPTS.map((prompt, idx) => (
               <button
                 key={idx}
                 onClick={() => handleSuggestionClick(prompt)}
                 className="cursor-pointer rounded-full border border-white/50 bg-white/72 px-4 py-2 text-sm font-medium text-sky-900 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:text-orange-600"
               >
                 {prompt}
               </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
