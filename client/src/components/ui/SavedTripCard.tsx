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
      variant="card"
      padding="none"
      radius="xl"
      className={
        className ||
        "group relative overflow-hidden transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-[rgba(237,170,118,0.42)] hover:shadow-[0_20px_36px_rgba(108,62,26,0.08)]"
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
        className="focus-ring flex h-full w-full flex-col rounded-[1.25rem] text-left"
      >
        {/* Cover Image */}
        <div className="relative h-52 overflow-hidden">
          {coverImage ? (
            <img
              src={coverImage}
              alt={destination}
              className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(230,106,63,0.24),rgba(248,214,145,0.28),rgba(72,131,126,0.24))]" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(60,37,25,0.03)_0%,rgba(60,37,25,0.48)_100%)]" />

          {/* Badge in corner */}
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <Badge
              tone="glass"
              size="md"
              className="rounded-[0.8rem] tracking-[0.18em]"
            >
              {badgeText}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col px-5 py-5">
          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[rgba(126,82,54,0.72)]">
            <span>{metadataLabel}</span>
            {metadataSecondary && (
              <>
                <span className="text-[rgba(199,170,145,0.9)]">•</span>
                <span>{metadataSecondary}</span>
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="font-display mt-3 line-clamp-2 text-[1.65rem] leading-[0.98] tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
            {destination}
          </h3>

          {/* Overview */}
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[rgba(105,69,48,0.78)]">
            {overview}
          </p>

          {/* Footer with stop count */}
          <div className="mt-5 flex items-center justify-between text-sm font-medium text-[rgba(118,80,57,0.78)]">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {stopCountLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[rgba(206,95,55,0.94)] transition-transform duration-200 group-hover:translate-x-0.5">
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
