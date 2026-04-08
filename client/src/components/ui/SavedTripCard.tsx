import Badge from "@/components/ui/Badge";
import Surface from "@/components/ui/Surface";
import type { Trip } from "@/types";
import { ArrowUpRight, Clock3, Trash2 } from "lucide-react";
import React from "react";

export interface SavedTripCardProps {
  /**
   * The trip data object
   */
  trip: Trip;

  /**
   * Optional cover image URL for the trip
   */
  coverImage?: string | null;

  /**
   * Text to display in the badge (e.g., country name or "X days")
   */
  badgeText: string;

  /**
   * Primary metadata label (e.g., "X day plan" or "Updated X")
   */
  metadataLabel: string;

  /**
   * Optional secondary metadata label (e.g., "Updated X")
   */
  metadataSecondary?: string;

  /**
   * Number of stops to display in the footer
   */
  stopCountLabel: string;

  /**
   * Callback when the card/trip is clicked (to open it)
   */
  onOpen: () => void;

  /**
   * Optional callback when delete button is clicked
   */
  onDelete?: (event: React.MouseEvent<HTMLButtonElement>) => void;

  /**
   * Card variant: "full" shows large cover image, "compact" is minimal
   * @default "full"
   */
  variant?: "full" | "compact";

  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;
}

/**
 * SavedTripCard - Reusable trip card component for displaying saved itineraries
 *
 * Supports two variants:
 * - **full**: Large card with cover image, ideal for profile/archive view
 * - **compact**: Minimal card without image, ideal for rapid scanning
 *
 * @example
 * ```tsx
 * <SavedTripCard
 *   trip={trip}
 *   coverImage={imageUrl}
 *   badgeText="Italy"
 *   metadataLabel="12 day plan"
 *   metadataSecondary="Updated Dec 5"
 *   stopCountLabel="32 stops"
 *   onOpen={() => openTrip(trip.id)}
 *   onDelete={(e) => deleteTrip(trip.id)}
 *   variant="full"
 * />
 * ```
 */
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
        key={trip.id}
        variant="card"
        radius="xl"
        className={
          className ||
          "group relative flex min-h-[8.75rem] w-full flex-col justify-between overflow-hidden p-3.5 text-left transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(237,170,118,0.42)] hover:shadow-[0_18px_32px_rgba(108,62,26,0.08)]"
        }
      >
        {onDelete && (
          <button
            type="button"
            aria-label={`Delete ${trip.title}`}
            onClick={onDelete}
            className="focus-ring absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-[0.8rem] border border-[rgba(236,220,204,0.86)] bg-[rgba(255,252,248,0.9)] text-[rgba(121,84,60,0.62)] shadow-[0_8px_18px_rgba(108,62,26,0.06)] transition-[background-color,color,border-color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[rgba(234,193,169,0.92)] hover:bg-[rgba(255,250,246,0.98)] hover:text-[rgba(207,80,71,0.96)]"
          >
            <Trash2 size={15} />
          </button>
        )}

        <button
          type="button"
          onClick={onOpen}
          className="focus-ring flex h-full flex-col justify-between rounded-[1.25rem] text-left"
        >
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
        </button>
      </Surface>
    );
  }

  // Full variant with cover image
  return (
    <Surface
      as="article"
      key={trip.id}
      variant="glass"
      padding="none"
      radius="xl"
      className={
        className ||
        "group relative overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-white/30 hover:shadow-[0_16px_48px_rgba(255,255,255,0.15)]"
      }
    >
      {onDelete && (
        <button
          type="button"
          aria-label={`Delete ${trip.title}`}
          onClick={onDelete}
          className="focus-ring absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-white/15 text-white transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] backdrop-blur-lg hover:-translate-y-0.5 hover:border-orange-500/60 hover:bg-orange-500/25 hover:text-orange-100"
        >
          <Trash2 size={16} />
        </button>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="focus-ring flex h-full w-full flex-col text-left"
      >
        {/* Cover Image */}
        <div className="relative h-52 overflow-hidden rounded-[1rem]">
          {coverImage ? (
            <img
              src={coverImage}
              alt={destination}
              className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-teal-600/20 via-transparent to-orange-600/20" />
          )}

          {/* Refined gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />

          {/* Badge positioned on image */}
          <div className="absolute left-4 top-4">
            <Badge
              tone="glass"
              size="md"
              className="rounded-full border-orange-500/40 bg-orange-500/20 text-orange-100 backdrop-blur-lg tracking-[0.18em]"
            >
              {badgeText}
            </Badge>
          </div>
        </div>

        {/* Glassmorphic Footer */}
        <div className="relative flex flex-1 flex-col justify-between border-t border-white/15 bg-gradient-to-t from-white/12 to-white/5 px-5 py-5 backdrop-blur-lg">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-white/70">
            <span>{metadataLabel}</span>
            {metadataSecondary && (
              <>
                <span className="text-white/50">•</span>
                <span>{metadataSecondary}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display mt-2 line-clamp-2 text-[1.55rem] leading-[0.96] tracking-[-0.04em] text-white drop-shadow-lg">
            {destination}
          </h3>

          {/* Overview */}
          <p className="mt-2 line-clamp-2 text-sm leading-5 text-white/80 drop-shadow-sm">
            {overview}
          </p>

          {/* Footer with stop count and CTA */}
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
      </button>
    </Surface>
  );
};

export default SavedTripCard;
