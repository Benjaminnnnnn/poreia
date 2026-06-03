"use client";

import { ListCheck, Loader2, SendHorizontal } from "lucide-react";
import React from "react";
import Button from "@/shared/ui/Button";
import SearchPromptBar from "@/features/create-trip/ui/TripPromptInput";

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
            isLoading={isRefining}
            label="Refine your itinerary"
            leadingIcon={<ListCheck size={18} />}
            onValueChange={onInputChange}
            placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
            trailingContent={
              <Button
                type="submit"
                variant="primary"
                size="icon-sm"
                disabled={isRefining || !inputValue.trim()}
                aria-label={isRefining ? "Refining…" : "Refine itinerary"}
                className="rounded-full"
              >
                {isRefining ? (
                  <Loader2 className="animate-spin" size={15} />
                ) : (
                  <SendHorizontal size={15} />
                )}
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
