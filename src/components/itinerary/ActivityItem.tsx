import React, { useId, useState } from "react";
import {
  Check,
  Clock,
  DollarSign,
  GripVertical,
  ImageIcon,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Activity } from "../../types";
import { ResolvedActivityImage } from "../../services/activityImageService";
import Button from "../ui/Button";

interface ActivityCardLayoutProps {
  activity: Activity;
  cardRef?: React.Ref<HTMLDivElement>;
  cardProps?: React.HTMLAttributes<HTMLDivElement>;
  children?: React.ReactNode;
  className: string;
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
    className={`focus-ring group relative rounded-[0.7rem] border border-[rgba(232,222,211,0.96)] bg-[rgba(255,255,253,0.98)] p-3 shadow-[0_8px_20px_rgba(108,62,26,0.04)] ${className}`}
  >
    <button
      ref={dragHandleRef}
      type="button"
      data-drag-handle="true"
      {...dragHandleProps}
      onClick={(event) => {
        event.stopPropagation();
        dragHandleProps?.onClick?.(event);
      }}
      className={`focus-ring absolute left-1 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 touch-none items-center justify-center rounded-[0.7rem] border border-[rgba(239,215,193,0.9)] bg-[rgba(255,246,239,0.96)] text-[rgba(204,139,99,0.9)] transition-[background-color,border-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:cursor-grabbing active:scale-[0.98] md:left-1.5 md:h-9 md:w-9 md:border-transparent md:bg-transparent ${
        dragHandleProps?.className ?? ""
      }`}
      aria-label={`Reorder ${activity.description}`}
      title="Drag to reorder"
    >
      <GripVertical size={18} />
    </button>

    <div className="flex items-start gap-2.5 pl-8 pr-3 sm:gap-3 sm:pl-10 sm:pr-8">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.45rem] border border-[rgba(239,215,193,0.92)] bg-[rgba(255,242,227,0.86)] sm:h-20 sm:w-20">
        {image?.url ? (
          <img
            src={image.url}
            alt={activity.description}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[rgba(188,156,131,0.8)]">
            <ImageIcon size={20} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[rgba(63,138,140,0.96)]">
            <Clock size={12} />
            {activity.time}
          </div>
          {activity.costEstimate !== undefined && activity.costEstimate > 0 ? (
            <div className="flex items-center gap-1 whitespace-nowrap rounded-[0.35rem] bg-[rgba(255,235,214,0.88)] px-2 py-0.5 text-[10px] font-bold text-[rgba(217,102,58,0.96)]">
              <DollarSign size={10} />
              {currency}
              {activity.costEstimate}
            </div>
          ) : null}
        </div>
        <p className="mb-1 line-clamp-3 text-sm font-semibold leading-snug text-[rgba(74,43,26,0.96)] sm:mb-1.5 sm:line-clamp-2">
          {activity.description}
        </p>
        <div className="flex items-center gap-1 truncate text-xs text-[rgba(116,79,56,0.66)]">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{activity.location}</span>
        </div>
        {image?.sourceLabel ? (
          <div className="mt-2 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(134,101,77,0.58)]">
            {image.sourceUrl ? (
              <a
                href={image.sourceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-[0.3rem] bg-[rgba(255,242,227,0.82)] px-1.5 py-0.5 text-[rgba(145,104,73,0.7)] transition-colors hover:bg-[rgba(244,233,220,0.96)] hover:text-[rgba(117,81,56,0.84)]"
              >
                {image.sourceLabel}
              </a>
            ) : (
              <span className="rounded-[0.3rem] bg-[rgba(255,242,227,0.82)] px-1.5 py-0.5 text-[rgba(145,104,73,0.7)]">
                {image.sourceLabel}
              </span>
            )}
            {image.licenseLabel ? <span>{image.licenseLabel}</span> : null}
            {image.attributionLabel ? (
              image.attributionUrl ? (
                <a
                  href={image.attributionUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="block min-w-0 max-w-full truncate whitespace-nowrap normal-case tracking-normal text-[rgba(116,79,56,0.72)] underline decoration-[rgba(191,153,126,0.45)] underline-offset-2 transition-colors hover:text-[rgba(88,58,38,0.84)]"
                  title={image.attributionLabel}
                >
                  {image.attributionLabel}
                </a>
              ) : (
                <span
                  className="block min-w-0 max-w-full truncate whitespace-nowrap normal-case tracking-normal text-[rgba(116,79,56,0.72)]"
                  title={image.attributionLabel}
                >
                  {image.attributionLabel}
                </span>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </div>

    {children}
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
  <ActivityCardLayout
    activity={activity}
    cardRef={cardRef}
    currency={currency}
    cardProps={sortableCardProps}
    dragHandleProps={isHandleOnly ? dragHandleProps : undefined}
    dragHandleRef={isHandleOnly ? dragHandleRef : undefined}
    image={image}
    onClick={onClick}
    style={style}
    className={`will-change-transform transition-[transform,box-shadow,border-color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
      isHandleOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
    } ${
      isSelected
        ? "border-[rgba(77,169,165,0.62)] ring-2 ring-[rgba(127,198,194,0.42)] shadow-lg"
        : "border-white hover:border-[rgba(237,170,118,0.65)] hover:shadow-lg"
    }`}
  >
    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[rgba(239,215,193,0.72)] pt-2.5 md:absolute md:right-2 md:top-2 md:mt-0 md:flex-col md:gap-1 md:border-t-0 md:pt-0 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        className="focus-ring inline-flex min-h-[2.35rem] items-center gap-1.5 rounded-full border border-[rgba(229,216,202,0.94)] bg-[rgba(255,250,245,0.98)] px-3 text-[rgba(153,118,93,0.84)] transition-colors hover:bg-[rgba(227,242,239,0.86)] hover:text-[rgba(42,140,142,0.92)] md:h-10 md:w-10 md:justify-center md:rounded-[0.6rem] md:border-transparent md:bg-transparent md:px-0"
        title="Edit"
        aria-label={`Edit ${activity.description}`}
      >
        <Pencil size={14} />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] md:hidden">
          Edit
        </span>
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="focus-ring inline-flex min-h-[2.35rem] items-center gap-1.5 rounded-full border border-[rgba(243,219,209,0.96)] bg-[rgba(255,248,244,0.98)] px-3 text-[rgba(177,108,78,0.9)] transition-colors hover:bg-red-50 hover:text-red-500 md:h-10 md:w-10 md:justify-center md:rounded-[0.6rem] md:border-transparent md:bg-transparent md:px-0"
        title="Delete"
        aria-label={`Delete ${activity.description}`}
      >
        <Trash2 size={14} />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] md:hidden">
          Delete
        </span>
      </button>
    </div>
  </ActivityCardLayout>
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
      className="space-y-3 rounded-[0.7rem] border-2 border-[rgba(77,169,165,0.62)] bg-[rgba(255,251,246,0.96)] p-4 shadow-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor={`${editFormId}-time`}
            className="text-xs font-semibold text-[rgba(120,83,58,0.78)]"
          >
            Time
          </label>
          <input
            id={`${editFormId}-time`}
            type="text"
            className="field-focus mt-1 min-h-[44px] w-full rounded-[0.65rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] px-3 py-2 text-sm"
            value={editForm.time}
            onChange={(event) =>
              setEditForm({ ...editForm, time: event.target.value })
            }
          />
        </div>
        <div>
          <label
            htmlFor={`${editFormId}-cost`}
            className="text-xs font-semibold text-[rgba(120,83,58,0.78)]"
          >
            Cost ({currency})
          </label>
          <input
            id={`${editFormId}-cost`}
            type="number"
            className="field-focus mt-1 min-h-[44px] w-full rounded-[0.65rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] px-3 py-2 text-sm"
            value={editForm.costEstimate || ""}
            onChange={(event) =>
              setEditForm({
                ...editForm,
                costEstimate: parseFloat(event.target.value) || 0,
              })
            }
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${editFormId}-activity`}
          className="text-xs font-semibold text-[rgba(120,83,58,0.78)]"
        >
          Activity
        </label>
        <input
          id={`${editFormId}-activity`}
          type="text"
          className="field-focus mt-1 min-h-[44px] w-full rounded-[0.65rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] px-3 py-2 text-sm font-medium"
          value={editForm.description}
          onChange={(event) =>
            setEditForm({ ...editForm, description: event.target.value })
          }
        />
      </div>
      <div>
        <label
          htmlFor={`${editFormId}-location`}
          className="text-xs font-semibold text-[rgba(120,83,58,0.78)]"
        >
          Location
        </label>
        <input
          id={`${editFormId}-location`}
          type="text"
          className="field-focus mt-1 min-h-[44px] w-full rounded-[0.65rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] px-3 py-2 text-sm"
          value={editForm.location}
          onChange={(event) =>
            setEditForm({ ...editForm, location: event.target.value })
          }
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          onClick={onCancel}
          variant="ghost"
          size="icon-sm"
          className="rounded-[0.45rem] text-[rgba(120,83,58,0.78)] hover:bg-[rgba(255,241,227,0.92)]"
          aria-label="Cancel activity edits"
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
          className="rounded-[0.45rem]"
          aria-label="Save activity edits"
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
    className="origin-top-left cursor-grabbing border-[rgba(77,169,165,0.72)] shadow-[0_28px_70px_rgba(108,62,26,0.18)] will-change-transform"
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
        onSave={(nextActivity) => {
          onSave(nextActivity);
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
      dragHandleProps={isHandleOnly ? { ...attributes, ...listeners } : undefined}
      dragHandleRef={isHandleOnly ? setActivatorNodeRef : undefined}
      image={image}
      isHandleOnly={isHandleOnly}
      isSelected={isSelected}
      onEdit={() => setIsEditing(true)}
      onDelete={onDelete}
      onClick={onClick}
      sortableCardProps={
        isHandleOnly
          ? undefined
          : {
              ...attributes,
              ...listeners,
            }
      }
      style={style}
    />
  );
};
