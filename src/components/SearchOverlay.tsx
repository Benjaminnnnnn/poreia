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
    <div className={`fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end pointer-events-none p-6 transition-all duration-500 ${isFocused ? 'h-full bg-black/20 backdrop-blur-sm' : 'h-auto'}`}>
      
      <div className={`w-full max-w-2xl transition-all duration-300 pointer-events-auto ${isFocused ? 'mb-[50vh] translate-y-1/2' : 'mb-8'}`}>
        
        {/* Search Box Container */}
        <div 
          className={`
            relative group overflow-hidden
            bg-white/80 backdrop-blur-xl 
            border border-white/40 shadow-2xl shadow-blue-900/10
            rounded-3xl transition-all duration-300
            ${isFocused ? 'scale-105 ring-4 ring-blue-500/20' : 'hover:scale-[1.01]'}
          `}
        >
          <form onSubmit={handleSubmit} className="relative flex items-center p-2">
            <div className="pl-4 pr-3 text-blue-600">
               {isGenerating ? <Sparkles className="animate-spin-slow" size={24} /> : <Search size={24} />}
            </div>
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder="Plan a 5-day foodie trip to Tokyo on a $2,000 budget..."
              className="w-full h-14 bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 text-lg font-medium"
              disabled={isGenerating}
            />

            <button 
              type="submit"
              disabled={!query.trim() || isGenerating}
              className="p-3 bg-blue-600 rounded-2xl text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SendHorizontal size={20} />
            </button>
          </form>

          {/* Loading Progress Bar */}
          {isGenerating && (
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-blue-400 w-full animate-progress" />
          )}
        </div>

        {/* Suggestions */}
        <div className={`
          mt-4 grid gap-2 transition-all duration-300 overflow-hidden
          ${isFocused ? 'opacity-100 max-h-60' : 'opacity-0 max-h-0'}
        `}>
          <div className="flex flex-wrap gap-2 justify-center">
             {SUGGESTED_PROMPTS.map((prompt, idx) => (
               <button
                 key={idx}
                 onClick={() => handleSuggestionClick(prompt)}
                 className="px-4 py-2 bg-white/90 backdrop-blur-md border border-white/50 rounded-full text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
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
