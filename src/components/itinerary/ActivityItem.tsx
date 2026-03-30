import React, { useCallback, useState } from "react";
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

interface ActivityCardLayoutProps {
  activity: Activity;
  cardRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
  className: string;
  currency: string;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  imageUrl?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

const ActivityCardLayout: React.FC<ActivityCardLayoutProps> = ({
  activity,
  cardRef,
  children,
  className,
  currency,
  dragProps,
  imageUrl,
  onClick,
  style,
}) => (
  <div
    ref={cardRef}
    {...dragProps}
    onClick={onClick}
    style={style}
    className={`group relative rounded-[0.7rem] border border-[rgba(232,222,211,0.96)] bg-[rgba(255,255,253,0.98)] p-3 shadow-[0_8px_20px_rgba(108,62,26,0.04)] ${className}`}
  >
    <div className="pointer-events-none absolute left-1.5 top-1/2 z-10 -translate-y-1/2 p-2 text-[rgba(227,175,139,0.72)] sm:left-2">
      <GripVertical size={18} />
    </div>

    <div className="flex items-start gap-2.5 pl-8 pr-3 sm:gap-3 sm:pl-10 sm:pr-8">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[0.45rem] border border-[rgba(239,215,193,0.92)] bg-[rgba(255,242,227,0.86)] sm:h-20 sm:w-20">
        {imageUrl ? (
          <img
            src={imageUrl}
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
      </div>
    </div>

    {children}
  </div>
);

interface SortableActivityCardProps {
  activity: Activity;
  cardRef?: React.Ref<HTMLDivElement>;
  currency: string;
  imageUrl?: string;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
  dragProps: React.HTMLAttributes<HTMLDivElement>;
  style?: React.CSSProperties;
}

const SortableActivityCard: React.FC<SortableActivityCardProps> = ({
  activity,
  cardRef,
  currency,
  dragProps,
  imageUrl,
  isSelected,
  onClick,
  onDelete,
  onEdit,
  style,
}) => (
  <ActivityCardLayout
    activity={activity}
    cardRef={cardRef}
    currency={currency}
    dragProps={dragProps}
    imageUrl={imageUrl}
    onClick={onClick}
    style={style}
    className={`cursor-grab touch-none will-change-transform transition-[transform,box-shadow,border-color,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:cursor-grabbing ${
      isSelected
        ? "border-[rgba(77,169,165,0.62)] ring-2 ring-[rgba(127,198,194,0.42)] shadow-lg"
        : "border-white hover:border-[rgba(237,170,118,0.65)] hover:shadow-lg"
    }`}
  >
    <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
      <button
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        className="rounded-[0.45rem] p-1.5 text-[rgba(153,118,93,0.8)] transition-colors hover:bg-[rgba(227,242,239,0.86)] hover:text-[rgba(42,140,142,0.92)]"
        title="Edit"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="rounded-[0.45rem] p-1.5 text-[rgba(153,118,93,0.8)] transition-colors hover:bg-red-50 hover:text-red-500"
        title="Delete"
      >
        <Trash2 size={14} />
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-3 rounded-[0.7rem] border-2 border-[rgba(77,169,165,0.62)] bg-[rgba(255,251,246,0.96)] p-4 shadow-lg"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">
            Time
          </label>
          <input
            className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]"
            value={editForm.time}
            onChange={(event) =>
              setEditForm({ ...editForm, time: event.target.value })
            }
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">
            Cost ({currency})
          </label>
          <input
            type="number"
            className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]"
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
        <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">
          Activity
        </label>
        <input
          className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]"
          value={editForm.description}
          onChange={(event) =>
            setEditForm({ ...editForm, description: event.target.value })
          }
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">
          Location
        </label>
        <input
          className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]"
          value={editForm.location}
          onChange={(event) =>
            setEditForm({ ...editForm, location: event.target.value })
          }
        />
      </div>
      <div>
        <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">
          Image Search Hint
        </label>
        <input
          className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]"
          value={editForm.img_prompt || ""}
          onChange={(event) =>
            setEditForm({ ...editForm, img_prompt: event.target.value })
          }
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="rounded-[0.45rem] p-1.5 text-[rgba(120,83,58,0.78)] hover:bg-[rgba(255,241,227,0.92)]"
        >
          <X size={16} />
        </button>
        <button
          onClick={() => onSave(editForm)}
          className="rounded-[0.45rem] border border-[rgba(214,98,54,0.18)] bg-[rgba(230,106,63,0.96)] p-1.5 text-white transition-colors hover:bg-[rgba(217,98,56,1)]"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
};

export const ActivityDragOverlayCard: React.FC<{
  activity: Activity;
  currency: string;
  imageUrl?: string;
}> = ({ activity, currency, imageUrl }) => (
  <ActivityCardLayout
    activity={activity}
    currency={currency}
    imageUrl={imageUrl}
    className="origin-top-left cursor-grabbing border-[rgba(77,169,165,0.72)] shadow-[0_28px_70px_rgba(108,62,26,0.18)] will-change-transform"
  />
);

interface SortableActivityItemProps {
  activity: Activity;
  currency: string;
  imageUrl?: string;
  onDelete: () => void;
  onSave: (newActivity: Activity) => void;
  onClick: () => void;
  isSelected: boolean;
}

export const SortableActivityItem: React.FC<SortableActivityItemProps> = ({
  activity,
  currency,
  imageUrl,
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

  const setCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      setActivatorNodeRef(node);
    },
    [setActivatorNodeRef, setNodeRef],
  );

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
      cardRef={setCardRef}
      currency={currency}
      imageUrl={imageUrl}
      isSelected={isSelected}
      onEdit={() => setIsEditing(true)}
      onDelete={onDelete}
      onClick={onClick}
      dragProps={{ ...attributes, ...listeners }}
      style={style}
    />
  );
};
