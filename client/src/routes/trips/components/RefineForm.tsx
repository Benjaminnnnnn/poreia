import { LayoutList, SendHorizontal, Sparkles } from "lucide-react";
import React from "react";
import Button from "@/components/ui/Button";

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
          <div className="absolute inset-0 rounded-[0.7rem] border border-[rgba(228,215,201,0.95)] bg-[rgba(255,250,245,0.97)] shadow-[0_14px_36px_rgba(108,62,26,0.12)]" />
          <div className="relative flex items-center p-1.5">
            <div className="pl-2.5 pr-2 text-[rgba(217,102,58,0.92)]">
              {isRefining ? (
                <Sparkles className="animate-spin-slow" size={18} />
              ) : (
                <LayoutList size={18} />
              )}
            </div>
            <label htmlFor="trip-refine-input" className="sr-only">
              Refine your itinerary
            </label>
            <input
              id="trip-refine-input"
              type="text"
              value={inputValue}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Refine this trip (e.g., 'Add a dinner spot on Day 2')"
              className="field-focus h-11 w-full rounded-[0.45rem] border border-transparent bg-transparent px-1 text-sm font-medium text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(118,77,54,0.58)] md:text-base"
              disabled={isRefining}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isRefining}
              size="icon"
              aria-label="Refine itinerary"
              className="border-[rgba(214,98,54,0.2)] p-2 disabled:opacity-50"
            >
              <SendHorizontal size={16} />
            </Button>
          </div>
          {isRefining ? (
            <div className="animate-progress absolute bottom-0 left-2 right-2 h-[2px] bg-[rgba(230,106,63,0.72)]" />
          ) : null}
        </form>
      </div>
    </div>
  );
};

export default RefineForm;
