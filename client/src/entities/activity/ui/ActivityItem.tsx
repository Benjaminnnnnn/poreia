import { cn } from "@/shared/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Clock,
  GripVertical,
  ImageIcon,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import React, { useId, useState } from "react";
import { ResolvedActivityImage } from "@/entities/activity/api/activityImageService";
import { Activity } from "@/shared/types";
import Button from "@/shared/ui/Button";
import FadeImage from "@/shared/ui/FadeImage";

/** Format a cost amount using the currency code's symbol (e.g. "USD" → "$40"). */
function formatCost(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode}${amount}`;
  }
}

interface ActivityCardLayoutProps {
  activity: Activity;
  cardRef?: React.Ref<HTMLDivElement>;
  cardProps?: React.HTMLAttributes<HTMLDivElement>;
  children?: React.ReactNode;
  className?: string;
  currency: string;
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  image?: ResolvedActivityImage;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const ActivityCardLayout: React.FC<ActivityCardLayoutProps> = ({
  activity,
  cardRef,
  cardProps,
  children,
  className,
  currency,
  dragHandleProps,
  dragHandleRef,
  image,
  onClick,
  style,
}) => (
  <div
    ref={cardRef}
    {...cardProps}
    onClick={onClick}
    style={style}
    className={cn(
      "focus-ring group relative flex overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg",
      className,
    )}
  >
    {/* Left image — absolute so it doesn't drive card height */}
    <div className="relative w-28 shrink-0 self-stretch overflow-hidden bg-white/10 sm:w-36">
      {image?.url ? (
        <FadeImage src={image.url} alt={activity.description} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20">
          <ImageIcon size={22} />
        </div>
      )}
    </div>

    {/* Drag handle strip */}
    <Button
      ref={dragHandleRef}
      type="button"
      variant="ghost"
      size="icon"
      data-drag-handle="true"
      {...dragHandleProps}
      onClick={(e) => {
        e.stopPropagation();
        dragHandleProps?.onClick?.(e);
      }}
      className={cn(
        "w-7 shrink-0 touch-none text-white/25 hover:text-white/60",
        dragHandleProps?.className ?? "",
      )}
      aria-label={`Reorder ${activity.description}`}
      title="Drag to reorder"
    >
      <GripVertical size={14} />
    </Button>

    {/* Content area — height driven by text, not image */}
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pr-3">
      {/* Time chip + cost */}
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/25 px-2.5 py-0.5 text-xs font-semibold text-orange-200 border border-orange-400/20 drop-shadow-sm">
          <Clock size={10} />
          {activity.time}
        </span>
        {activity.costEstimate !== undefined && activity.costEstimate > 0 ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-400/25 px-2 py-0.5 text-[10px] font-bold text-orange-200 border border-orange-400/20 drop-shadow-sm">
            {formatCost(activity.costEstimate, currency)}
          </span>
        ) : null}
      </div>

      {/* Activity title */}
      <p className="text-sm font-bold leading-snug text-white drop-shadow-md transition-colors duration-150 group-hover:text-orange-300 sm:text-[0.95rem]">
        {activity.description}
      </p>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-white/70 drop-shadow-sm">
        <MapPin size={10} className="shrink-0" />
        <span className="truncate">{activity.location}</span>
      </div>

      {/* Attribution */}
      {image?.sourceLabel ? (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 drop-shadow-sm">
          {image.sourceUrl ? (
            <a
              href={image.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-white/10 px-1.5 py-0.5 border border-white/10 transition-colors hover:bg-white/20 hover:text-white/90"
            >
              {image.sourceLabel}
            </a>
          ) : (
            <span className="rounded bg-white/10 px-1.5 py-0.5 border border-white/10">
              {image.sourceLabel}
            </span>
          )}
          {image.licenseLabel ? (
            <span className="text-white/35">{image.licenseLabel}</span>
          ) : null}
          {image.attributionLabel ? (
            image.attributionUrl ? (
              <a
                href={image.attributionUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 truncate normal-case tracking-normal text-white/50 underline underline-offset-2 transition-colors hover:text-white/80"
                title={image.attributionLabel}
              >
                {image.attributionLabel}
              </a>
            ) : (
              <span
                className="min-w-0 truncate normal-case tracking-normal text-white/50"
                title={image.attributionLabel}
              >
                {image.attributionLabel}
              </span>
            )
          ) : null}
        </div>
      ) : null}

      {/* Mobile-only actions (rendered by children) */}
      {children}
    </div>
  </div>
);

interface SortableActivityCardProps {
  activity: Activity;
  cardRef?: React.Ref<HTMLDivElement>;
  currency: string;
  dragHandleProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: React.Ref<HTMLButtonElement>;
  image?: ResolvedActivityImage;
  isHandleOnly: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  sortableCardProps?: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
}

const SortableActivityCard: React.FC<SortableActivityCardProps> = ({
  activity,
  cardRef,
  currency,
  dragHandleProps,
  dragHandleRef,
  image,
  isHandleOnly,
  isSelected,
  onClick,
  onDelete,
  onEdit,
  sortableCardProps,
  style,
}) => (
  <div
    ref={cardRef}
    {...sortableCardProps}
    onClick={onClick}
    style={style}
    className={cn(
      "focus-ring group relative flex overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md shadow-lg will-change-transform transition-[transform,box-shadow,border-color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
      isHandleOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
      isSelected
        ? "border-white/25 shadow-xl ring-2 ring-white/20 bg-white/15"
        : "hover:border-white/25 hover:shadow-xl hover:bg-white/15",
    )}
  >
    {/* Left image with drag handle overlaid */}
    <div className="relative w-28 shrink-0 self-stretch bg-white/10 sm:w-36">
      {image?.url ? (
        <FadeImage src={image.url} alt={activity.description} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-white/20">
          <ImageIcon size={22} />
        </div>
      )}
      {/* Drag handle — left-center of image, fade in on card hover */}
      <Button
        ref={dragHandleRef}
        type="button"
        variant="ghost"
        size="icon"
        data-drag-handle="true"
        {...(isHandleOnly ? dragHandleProps : undefined)}
        onClick={(e) => {
          e.stopPropagation();
          isHandleOnly && dragHandleProps?.onClick?.(e);
        }}
        className="absolute left-1.5 top-1/2 z-10 h-7 w-6 -translate-y-1/2 touch-none rounded-md bg-black/40 text-white/90 opacity-0 backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 hover:bg-black/50"
        aria-label={`Reorder ${activity.description}`}
        title="Drag to reorder"
      >
        <GripVertical size={13} />
      </Button>
    </div>

    {/* Content — height driven by text, not image */}
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 py-3 pl-3 pr-3 md:pr-10">
      {/* Time chip + cost */}
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-orange-400/25 px-2.5 py-0.5 text-xs font-semibold text-orange-200 border border-orange-400/20 drop-shadow-sm">
          <Clock size={10} />
          {activity.time}
        </span>
        {activity.costEstimate !== undefined && activity.costEstimate > 0 ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-400/25 px-2 py-0.5 text-[10px] font-bold text-orange-200 border border-orange-400/20 drop-shadow-sm">
            {formatCost(activity.costEstimate, currency)}
          </span>
        ) : null}
      </div>

      {/* Title — white with drop shadow */}
      <p className="text-sm font-bold leading-snug text-white drop-shadow-md transition-colors duration-150 group-hover:text-orange-300 sm:text-[0.95rem]">
        {activity.description}
      </p>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-white/70 drop-shadow-sm">
        <MapPin size={10} className="shrink-0" />
        <span className="truncate">{activity.location}</span>
      </div>

      {/* Attribution */}
      {image?.sourceLabel ? (
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 drop-shadow-sm">
          {image.sourceUrl ? (
            <a
              href={image.sourceUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="rounded bg-white/10 px-1.5 py-0.5 border border-white/10 transition-colors hover:bg-white/20 hover:text-white/90"
            >
              {image.sourceLabel}
            </a>
          ) : (
            <span className="rounded bg-white/10 px-1.5 py-0.5 border border-white/10">
              {image.sourceLabel}
            </span>
          )}
          {image.licenseLabel ? (
            <span className="text-white/35">{image.licenseLabel}</span>
          ) : null}
          {image.attributionLabel ? (
            image.attributionUrl ? (
              <a
                href={image.attributionUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 truncate normal-case tracking-normal text-white/50 underline underline-offset-2 transition-colors hover:text-white/80"
                title={image.attributionLabel}
              >
                {image.attributionLabel}
              </a>
            ) : (
              <span className="min-w-0 truncate normal-case tracking-normal text-white/50">
                {image.attributionLabel}
              </span>
            )
          ) : null}
        </div>
      ) : null}

      {/* Mobile-only action row */}
      <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-white/10 pt-2 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="h-7 gap-1.5 rounded-full px-3 text-[11px] text-white/55 hover:bg-white/15 hover:text-white"
          aria-label={`Edit ${activity.description}`}
        >
          <Pencil size={11} />
          <span className="font-semibold tracking-[0.08em]">Edit</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="h-7 gap-1.5 rounded-full px-3 text-[11px] text-white/55 hover:bg-red-500/20 hover:text-red-300"
          aria-label={`Delete ${activity.description}`}
        >
          <Trash2 size={11} />
          <span className="font-semibold tracking-[0.08em]">Delete</span>
        </Button>
      </div>
    </div>

    {/* Desktop action buttons — top-right corner, fade in on hover */}
    <div className="pointer-events-none absolute right-2 top-2 hidden flex-col gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 md:flex">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="rounded-lg text-white/70 hover:bg-white hover:text-foreground"
        title="Edit"
        aria-label={`Edit ${activity.description}`}
      >
        <Pencil size={13} />
      </Button>
      <Button
        type="button"
        variant="default"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="rounded-lg"
        title="Delete"
        aria-label={`Delete ${activity.description}`}
      >
        <Trash2 size={13} />
      </Button>
    </div>
  </div>
);

const ActivityEditCard: React.FC<{
  activity: Activity;
  currency: string;
  onCancel: () => void;
  onSave: (activity: Activity) => void;
  style: React.CSSProperties;
  setNodeRef: (node: HTMLDivElement | null) => void;
}> = ({ activity, currency, onCancel, onSave, setNodeRef, style }) => {
  const [editForm, setEditForm] = useState<Activity>({ ...activity });
  const editFormId = useId();
  const originalLocation = activity.location.trim();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-3 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur-md"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${editFormId}-time`}
            className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/60"
          >
            Time
          </label>
          <input
            id={`${editFormId}-time`}
            type="text"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-primary/60 focus:bg-white/15 focus:outline-none"
            value={editForm.time}
            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
          />
        </div>
        <div>
          <label
            htmlFor={`${editFormId}-cost`}
            className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/60"
          >
            Cost ({currency})
          </label>
          <input
            id={`${editFormId}-cost`}
            type="number"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-primary/60 focus:bg-white/15 focus:outline-none"
            value={editForm.costEstimate || ""}
            onChange={(e) =>
              setEditForm({
                ...editForm,
                costEstimate: parseFloat(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${editFormId}-activity`}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/60"
        >
          Activity
        </label>
        <input
          id={`${editFormId}-activity`}
          type="text"
          className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-primary/60 focus:bg-white/15 focus:outline-none"
          value={editForm.description}
          onChange={(e) =>
            setEditForm({ ...editForm, description: e.target.value })
          }
        />
      </div>
      <div>
        <label
          htmlFor={`${editFormId}-location`}
          className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/60"
        >
          Location
        </label>
        <input
          id={`${editFormId}-location`}
          type="text"
          className="mt-1 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-primary/60 focus:bg-white/15 focus:outline-none"
          value={editForm.location}
          onChange={(e) =>
            setEditForm({ ...editForm, location: e.target.value })
          }
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon-sm"
          className="rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
          aria-label="Cancel"
        >
          <X size={16} />
        </Button>
        <Button
          onClick={() => {
            const nextLocation = editForm.location.trim();
            const locationChanged = nextLocation !== originalLocation;
            onSave({
              ...editForm,
              img_prompt:
                locationChanged || !editForm.img_prompt?.trim()
                  ? nextLocation || editForm.img_prompt
                  : editForm.img_prompt,
            });
          }}
          size="icon-sm"
          className="rounded-lg"
          aria-label="Save"
        >
          <Check size={16} />
        </Button>
      </div>
    </div>
  );
};

export const ActivityDragOverlayCard: React.FC<{
  activity: Activity;
  currency: string;
  image?: ResolvedActivityImage;
}> = ({ activity, currency, image }) => (
  <ActivityCardLayout
    activity={activity}
    currency={currency}
    image={image}
    className="cursor-grabbing border-primary/40 shadow-xl ring-2 ring-primary/20 will-change-transform"
  />
);

interface SortableActivityItemProps {
  activity: Activity;
  currency: string;
  image?: ResolvedActivityImage;
  isHandleOnly: boolean;
  onDelete: () => void;
  onSave: (newActivity: Activity) => void;
  onClick: () => void;
  isSelected: boolean;
}

export const SortableActivityItem: React.FC<SortableActivityItemProps> = ({
  activity,
  currency,
  image,
  isHandleOnly,
  onDelete,
  onSave,
  onClick,
  isSelected,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id, disabled: isEditing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : "auto",
  };

  if (isEditing) {
    return (
      <ActivityEditCard
        activity={activity}
        currency={currency}
        setNodeRef={setNodeRef}
        style={style}
        onCancel={() => setIsEditing(false)}
        onSave={(next) => {
          onSave(next);
          setIsEditing(false);
        }}
      />
    );
  }

  return (
    <SortableActivityCard
      activity={activity}
      cardRef={setNodeRef}
      currency={currency}
      dragHandleProps={
        isHandleOnly ? { ...attributes, ...listeners } : undefined
      }
      dragHandleRef={isHandleOnly ? setActivatorNodeRef : undefined}
      image={image}
      isHandleOnly={isHandleOnly}
      isSelected={isSelected}
      onEdit={() => setIsEditing(true)}
      onDelete={onDelete}
      onClick={onClick}
      sortableCardProps={
        isHandleOnly ? undefined : { ...attributes, ...listeners }
      }
      style={style}
    />
  );
};
