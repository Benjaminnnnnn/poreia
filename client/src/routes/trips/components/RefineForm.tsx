import { ListCheck } from "lucide-react";
import React from "react";
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
        <form onSubmit={onSubmit}>
          <SearchPromptBar
            id="trip-refine-input"
            disabled={isRefining}
            disableGlow
            disableRing
            isLoading={isRefining}
            label="Refine your itinerary"
            leadingIcon={<ListCheck size={18} />}
            loadingLabel="Refining…"
            onValueChange={onInputChange}
            placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
            submitLabel="Refine"
            value={inputValue}
          />
        </form>
      </div>
    </div>
  );
};

export default RefineForm;
