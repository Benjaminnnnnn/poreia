import { LayoutList, SendHorizontal, Sparkles } from "lucide-react";
import React from "react";
import Button from "@/components/ui/Button";
import SearchPromptBar from "@/components/ui/SearchPromptBar";

interface RefineFormProps {
  inputValue: string;
  isRefining: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
}

const RefineForm: React.FC<RefineFormProps> = ({
  inputValue,
  isRefining,
  onInputChange,
  onSubmit,
}) => {
  return (
    <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-20 flex justify-center px-3 md:bottom-5 md:px-4">
      <div className="pointer-events-auto w-full max-w-full md:max-w-2xl">
        <form onSubmit={onSubmit} className="group relative">
          <SearchPromptBar
            id="trip-refine-input"
            disabled={isRefining}
            isLoading={isRefining}
            label="Refine your itinerary"
            leadingIcon={<LayoutList className="search-status-search" size={18} />}
            loadingIcon={<Sparkles className="search-status-sparkles" size={18} />}
            onValueChange={onInputChange}
            placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
            trailingContent={
              <Button
                type="submit"
                disabled={!inputValue.trim() || isRefining}
                size="icon"
                aria-label="Refine itinerary"
                className="border-[rgba(214,98,54,0.2)] p-2 disabled:opacity-50"
              >
                <SendHorizontal size={16} />
              </Button>
            }
            value={inputValue}
            variant="refine"
          />
        </form>
      </div>
    </div>
  );
};

export default RefineForm;
