import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Surface from "@/components/ui/Surface";
import type { Trip } from "@/types";
import { ArrowUpRight, Clock3, Trash2 } from "lucide-react";
import React from "react";

export interface SavedTripCardProps {
  trip: Trip;
  coverImage?: string | null;
  badgeText: string;
  metadataLabel: string;
  metadataSecondary?: string;
  stopCountLabel: string;
  onOpen: () => void;
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "full" | "compact";
  className?: string;
}

export const SavedTripCard: React.FC<SavedTripCardProps> = ({
  trip,
  coverImage,
  badgeText,
  metadataLabel,
  metadataSecondary,
  stopCountLabel,
  onOpen,
  onDelete,
  variant = "full",
  className,
}) => {
  const destination = trip.currentItinerary?.destination || trip.title;
  const overview =
    trip.currentItinerary?.overview ||
    (variant === "full"
      ? "Open this itinerary to keep shaping the route."
      : "Open this trip to keep refining the itinerary.");

  if (variant === "compact") {
    return (
      <Surface
        as="article"
        variant="card"
        radius="xl"
        onClick={onOpen}
        className={
          className ||
          "group relative flex min-h-[8.75rem] w-full cursor-pointer flex-col justify-between overflow-hidden p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(237,170,118,0.42)] hover:shadow-[0_18px_32px_rgba(108,62,26,0.08)]"
        }
      >
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${trip.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="absolute right-3 top-3 z-10 rounded-[0.8rem] border border-[rgba(236,220,204,0.86)] bg-[rgba(255,252,248,0.9)] text-[rgba(121,84,60,0.62)] hover:border-[rgba(234,193,169,0.92)] hover:bg-[rgba(255,250,246,0.98)] hover:text-[rgba(207,80,71,0.96)]"
          >
            <Trash2 size={15} />
          </Button>
        )}

        <div className="pr-9">
          <Badge
            tone="glass"
            size="sm"
            className="-ml-3 rounded-[0.8rem] border-[rgba(255,255,255,0.82)] bg-[rgba(255,252,247,0.8)] tracking-[0.14em]"
          >
            {badgeText}
          </Badge>
          <h2 className="mt-2 line-clamp-2 max-w-[15ch] font-display text-[1.35rem] leading-[0.96] tracking-[-0.045em] text-[rgba(72,43,27,0.96)] lg:text-[1.5rem]">
            {destination}
          </h2>
          <p className="mt-1.5 line-clamp-2 max-w-[34ch] text-[0.92rem] leading-6 text-[rgba(105,69,48,0.78)]">
            {overview}
          </p>
        </div>

        <div className="mt-4 flex w-full items-center justify-between text-[0.82rem] font-medium text-[rgba(118,80,57,0.78)]">
          <span className="inline-flex items-center gap-1.5 [font-variant-numeric:tabular-nums]">
            <Clock3 size={14} />
            {metadataLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[rgba(206,95,55,0.94)] transition-transform duration-200 group-hover:translate-x-0.5">
            Open
            <ArrowUpRight size={14} />
          </span>
        </div>
      </Surface>
    );
  }

  // Full variant with cover image
  return (
    <Surface
      as="article"
      variant="glass"
      padding="none"
      radius="xl"
      onClick={onOpen}
      className={
        className ||
        "group relative flex cursor-pointer flex-col overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_16px_48px_rgba(255,255,255,0.15)]"
      }
    >
      {onDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Delete ${trip.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(e);
          }}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/40 bg-white/15 text-white backdrop-blur-lg hover:border-orange-500/60 hover:bg-orange-500/25 hover:text-orange-100"
        >
          <Trash2 size={16} />
        </Button>
      )}

      {/* Cover Image */}
      <div className="relative h-52 w-full overflow-hidden rounded-[1rem]">
        {coverImage ? (
          <img
            src={coverImage}
            alt={destination}
            className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-teal-600/20 via-transparent to-orange-600/20" />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

        <div className="absolute left-4 top-4">
          <Badge
            tone="glass"
            size="md"
            className="rounded-full border-primary/40 bg-primary text-white backdrop-blur-lg tracking-[0.18em]"
          >
            {badgeText}
          </Badge>
        </div>
      </div>

      {/* Glassmorphic Footer */}
      <div className="relative flex flex-1 flex-col justify-between border-t border-white/15 bg-gradient-to-t from-white/12 to-white/5 px-5 py-5 backdrop-blur-lg">
        <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white/70">
          <span>{metadataLabel}</span>
          {metadataSecondary && (
            <>
              <span className="text-white/50">•</span>
              <span>{metadataSecondary}</span>
            </>
          )}
        </div>

        <h3 className="font-display mt-2 line-clamp-2 text-[1.55rem] leading-[0.96] tracking-[-0.04em] text-white drop-shadow-lg">
          {destination}
        </h3>

        <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/80 drop-shadow-sm">
          {overview}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
            <Clock3 size={14} />
            {stopCountLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-300 transition-transform duration-200 group-hover:translate-x-0.5">
            Open trip
            <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </Surface>
  );
};

export default SavedTripCard;
