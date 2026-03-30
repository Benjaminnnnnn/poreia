import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TravelItinerary, Activity, MapPinData, DayPlan } from '../types';
import { Calendar, Clock, MapPin, DollarSign, Wallet, GripVertical, Trash2, Pencil, X, Check, ImageIcon, BookText, NotebookPen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import WorldMap from './WorldMap';
import { getActivityImage, ResolvedActivityImage } from '../services/activityImageService';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ItineraryResultProps {
  itinerary: TravelItinerary;
  className?: string;
  onUpdate?: (updatedItinerary: TravelItinerary) => void;
}

const COLORS = ['#e66a3f', '#ffbf69', '#4ba9a8', '#c85b53', '#f3a65d', '#7bb0a6'];
const DAY_MARKER_COLORS = ['#e66a3f', '#4ba9a8', '#c85b53', '#d49a2a', '#7d8fcb', '#7bb0a6'];
const DAY_CONTAINER_PATTERN = /^day-(\d+)$/;
const MOOD_OPTIONS = [
  {
    value: 'rested',
    label: 'Rested',
    activeClassName:
      'border-[rgba(112,168,120,0.34)] bg-[rgba(123,176,130,0.95)] text-white',
    idleClassName:
      'border-[rgba(170,202,175,0.72)] bg-[rgba(241,248,242,0.96)] text-[rgba(70,113,76,0.92)] hover:border-[rgba(123,176,130,0.72)]',
    pillClassName:
      'border-[rgba(170,202,175,0.72)] bg-[rgba(241,248,242,0.96)] text-[rgba(70,113,76,0.92)]',
  },
  {
    value: 'curious',
    label: 'Curious',
    activeClassName:
      'border-[rgba(95,156,151,0.34)] bg-[rgba(74,149,144,0.95)] text-white',
    idleClassName:
      'border-[rgba(157,209,204,0.72)] bg-[rgba(236,248,247,0.96)] text-[rgba(52,112,109,0.94)] hover:border-[rgba(74,149,144,0.72)]',
    pillClassName:
      'border-[rgba(157,209,204,0.72)] bg-[rgba(236,248,247,0.96)] text-[rgba(52,112,109,0.94)]',
  },
  {
    value: 'energized',
    label: 'Energized',
    activeClassName:
      'border-[rgba(221,151,80,0.34)] bg-[rgba(226,147,64,0.95)] text-white',
    idleClassName:
      'border-[rgba(242,201,150,0.74)] bg-[rgba(255,245,231,0.96)] text-[rgba(159,94,29,0.94)] hover:border-[rgba(226,147,64,0.72)]',
    pillClassName:
      'border-[rgba(242,201,150,0.74)] bg-[rgba(255,245,231,0.96)] text-[rgba(159,94,29,0.94)]',
  },
  {
    value: 'overwhelmed',
    label: 'Overwhelmed',
    activeClassName:
      'border-[rgba(181,118,105,0.34)] bg-[rgba(188,112,93,0.95)] text-white',
    idleClassName:
      'border-[rgba(226,185,175,0.74)] bg-[rgba(252,241,238,0.96)] text-[rgba(138,81,69,0.94)] hover:border-[rgba(188,112,93,0.72)]',
    pillClassName:
      'border-[rgba(226,185,175,0.74)] bg-[rgba(252,241,238,0.96)] text-[rgba(138,81,69,0.94)]',
  },
  {
    value: 'romantic',
    label: 'Romantic',
    activeClassName:
      'border-[rgba(189,121,149,0.34)] bg-[rgba(194,115,148,0.95)] text-white',
    idleClassName:
      'border-[rgba(233,191,209,0.74)] bg-[rgba(253,241,246,0.96)] text-[rgba(145,79,104,0.94)] hover:border-[rgba(194,115,148,0.72)]',
    pillClassName:
      'border-[rgba(233,191,209,0.74)] bg-[rgba(253,241,246,0.96)] text-[rgba(145,79,104,0.94)]',
  },
  {
    value: 'reflective',
    label: 'Reflective',
    activeClassName:
      'border-[rgba(127,131,177,0.34)] bg-[rgba(116,124,181,0.95)] text-white',
    idleClassName:
      'border-[rgba(191,195,230,0.74)] bg-[rgba(241,242,252,0.96)] text-[rgba(79,86,137,0.94)] hover:border-[rgba(116,124,181,0.72)]',
    pillClassName:
      'border-[rgba(191,195,230,0.74)] bg-[rgba(241,242,252,0.96)] text-[rgba(79,86,137,0.94)]',
  },
] as const;
type WorkspaceTab = 'itinerary' | 'notes';

const MOOD_OPTION_LOOKUP = new Map(
  MOOD_OPTIONS.map((option) => [option.value, option]),
);

// --- Activity Card Component (Shared for Sortable & Overlay) ---
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
}) => {
  return (
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
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[rgba(188,156,131,0.8)]">
              <ImageIcon size={20} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-0.5">
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
};

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
}) => {
  return (
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
          ? 'border-[rgba(77,169,165,0.62)] ring-2 ring-[rgba(127,198,194,0.42)] shadow-lg'
          : 'border-white hover:border-[rgba(237,170,118,0.65)] hover:shadow-lg'
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
};

interface ActivityDragOverlayCardProps {
  activity: Activity;
  currency: string;
  imageUrl?: string;
}

const ActivityDragOverlayCard: React.FC<ActivityDragOverlayCardProps> = ({
  activity,
  currency,
  imageUrl,
}) => {
  return (
    <ActivityCardLayout
      activity={activity}
      currency={currency}
      imageUrl={imageUrl}
      className="origin-top-left cursor-grabbing border-[rgba(77,169,165,0.72)] shadow-[0_28px_70px_rgba(108,62,26,0.18)] will-change-transform"
    />
  );
};


// --- Sortable Activity Item Component ---
interface SortableActivityItemProps {
  activity: Activity;
  currency: string;
  imageUrl?: string;
  onDelete: () => void;
  onSave: (newActivity: Activity) => void;
  onClick: () => void;
  isSelected: boolean;
}

const SortableActivityItem: React.FC<SortableActivityItemProps> = ({ activity, currency, imageUrl, onDelete, onSave, onClick, isSelected }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Activity>({ ...activity });

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: activity.id, disabled: isEditing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const setCardRef = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    setActivatorNodeRef(node);
  }, [setActivatorNodeRef, setNodeRef]);

  const handleSave = () => {
    onSave(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({ ...activity });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
        <div 
        ref={setNodeRef} 
        style={style}
        className="space-y-3 rounded-[0.7rem] border-2 border-[rgba(77,169,165,0.62)] bg-[rgba(255,251,246,0.96)] p-4 shadow-lg"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">Time</label>
            <input 
              className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]" 
              value={editForm.time}
              onChange={e => setEditForm({...editForm, time: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">Cost ({currency})</label>
            <input 
              type="number"
              className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]" 
              value={editForm.costEstimate || ''}
              onChange={e => setEditForm({...editForm, costEstimate: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>
        <div>
           <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">Activity</label>
           <input 
              className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]" 
              value={editForm.description}
              onChange={e => setEditForm({...editForm, description: e.target.value})}
            />
        </div>
        <div>
           <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">Location</label>
           <input 
              className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]" 
              value={editForm.location}
              onChange={e => setEditForm({...editForm, location: e.target.value})}
            />
        </div>
        {/* Optional search hint for image resolution */}
        <div>
           <label className="text-xs font-semibold text-[rgba(120,83,58,0.78)]">Image Search Hint</label>
           <input 
              className="w-full rounded-[0.45rem] border border-[rgba(233,213,193,0.92)] bg-[rgba(255,246,239,0.92)] p-1.5 text-sm outline-none focus:ring-2 focus:ring-[rgba(127,198,194,0.4)]" 
              value={editForm.img_prompt || ''}
              onChange={e => setEditForm({...editForm, img_prompt: e.target.value})}
            />
        </div>

        <div className="flex justify-end gap-2 pt-2">
           <button onClick={handleCancel} className="rounded-[0.45rem] p-1.5 text-[rgba(120,83,58,0.78)] hover:bg-[rgba(255,241,227,0.92)]"><X size={16}/></button>
           <button onClick={handleSave} className="rounded-[0.45rem] border border-[rgba(214,98,54,0.18)] bg-[rgba(230,106,63,0.96)] p-1.5 text-white transition-colors hover:bg-[rgba(217,98,56,1)]"><Check size={16}/></button>
        </div>
      </div>
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
        dragProps={{...attributes, ...listeners}}
        style={style}
    />
  );
};

// --- Main Itinerary Component ---
const ItineraryResult: React.FC<ItineraryResultProps> = ({ itinerary, className = "", onUpdate }) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('itinerary');
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>();
  const [localItinerary, setLocalItinerary] = useState<TravelItinerary>(itinerary);
  const [activityImages, setActivityImages] = useState<Record<string, ResolvedActivityImage>>({});
  const deferredSelectedActivityId = useDeferredValue(selectedActivityId);

  useEffect(() => {
    if (!activeDragId) {
        setLocalItinerary(itinerary);
    }
  }, [itinerary, activeDragId]);

  const itineraryActivityEntries = useMemo(
    () =>
      localItinerary.days.flatMap((day) =>
        day.activities.map((activity, activityIndex) => ({
          activity,
          activityIndex,
          dayNumber: day.day,
        })),
      ),
    [localItinerary.days],
  );

  const activityLookup = useMemo(() => {
    const lookup = new Map<
      string,
      {
        activity: Activity;
        activityIndex: number;
        dayNumber: number;
      }
    >();

    itineraryActivityEntries.forEach((entry) => {
      lookup.set(entry.activity.id, entry);
    });

    return lookup;
  }, [itineraryActivityEntries]);

  const activeActivityIds = useMemo(
    () => new Set(itineraryActivityEntries.map(({ activity }) => activity.id)),
    [itineraryActivityEntries],
  );

  const missingImageActivities = useMemo(
    () =>
      itineraryActivityEntries.filter(({ activity }) => !activityImages[activity.id]),
    [activityImages, itineraryActivityEntries],
  );

  useEffect(() => {
    startTransition(() => {
      setActivityImages((current) => {
        let removedStaleImages = false;
        const next: Record<string, ResolvedActivityImage> = {};

        Object.entries(current).forEach(([activityId, image]) => {
          if (activeActivityIds.has(activityId)) {
            next[activityId] = image;
            return;
          }

          removedStaleImages = true;
        });

        return removedStaleImages ? next : current;
      });
    });
  }, [activeActivityIds]);

  useEffect(() => {
    let isCancelled = false;

    if (!missingImageActivities.length) {
      return;
    }

    void Promise.all(
      missingImageActivities.map(async ({ activity }) => {
        const image = await getActivityImage(activity, localItinerary.destination);
        return image ? [activity.id, image] as const : null;
      }),
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      const resolvedImages = results.filter((result): result is readonly [string, ResolvedActivityImage] => Boolean(result));
      if (!resolvedImages.length) {
        return;
      }

      startTransition(() => {
        setActivityImages((current) => {
          const next = { ...current };
          resolvedImages.forEach(([activityId, image]) => {
            next[activityId] = image;
          });
          return next;
        });
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [localItinerary.destination, missingImageActivities]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Generate pins for the map
  const mapPins = useMemo(() => {
    return itineraryActivityEntries.flatMap(({ activity, dayNumber }) => {
      if (activity.lat === undefined || activity.lng === undefined) {
        return [];
      }

      return [
        {
          id: activity.id,
          name: activity.location,
          description: activity.description,
          dayNumber,
          dayColor: DAY_MARKER_COLORS[(dayNumber - 1) % DAY_MARKER_COLORS.length],
          lat: activity.lat,
          lng: activity.lng,
          image: activityImages[activity.id]?.url,
        } satisfies MapPinData,
      ];
    });
  }, [activityImages, itineraryActivityEntries]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeDayNum = activityLookup.get(activeId)?.dayNumber;
    let overDayNum = activityLookup.get(overId)?.dayNumber;

    if (!overDayNum) {
        const match = overId.match(DAY_CONTAINER_PATTERN);
        if (match) {
            overDayNum = parseInt(match[1]);
        }
    }

    if (!activeDayNum || !overDayNum || activeDayNum === overDayNum) return;

    setLocalItinerary(prev => {
        const activeDayIdx = prev.days.findIndex(d => d.day === activeDayNum);
        const overDayIdx = prev.days.findIndex(d => d.day === overDayNum);

        const newDays = prev.days.map(d => ({ ...d, activities: [...d.activities] }));
        const activeItems = newDays[activeDayIdx].activities;
        const overItems = newDays[overDayIdx].activities;

        const activeIndex = activeItems.findIndex(a => a.id === activeId);
        if (activeIndex === -1) return prev;

        let overIndex;
        if (overItems.some(a => a.id === overId)) {
             overIndex = overItems.findIndex(a => a.id === overId);
             const isBelow = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
             const modifier = isBelow ? 1 : 0;
             overIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
        } else {
            overIndex = overItems.length + 1;
        }

        const [movedItem] = activeItems.splice(activeIndex, 1);
        const safeOverIndex = Math.min(Math.max(0, overIndex), overItems.length);
        overItems.splice(safeOverIndex, 0, movedItem);

        return { ...prev, days: newDays };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    
    if (!over || !onUpdate) return;

    const activeIdVal = active.id as string;
    const overIdVal = over.id as string;

    const activeEntry = activityLookup.get(activeIdVal);
    const overEntry = activityLookup.get(overIdVal);
    const activeDayNum = activeEntry?.dayNumber;
    let overDayNum = overEntry?.dayNumber;
    
    if (!overDayNum && overIdVal.match(DAY_CONTAINER_PATTERN)) {
        overDayNum = parseInt(overIdVal.match(DAY_CONTAINER_PATTERN)![1]);
    }

    if (activeDayNum && overDayNum) {
        const activeDayIdx = localItinerary.days.findIndex(d => d.day === activeDayNum);
        const overDayIdx = localItinerary.days.findIndex(d => d.day === overDayNum);

        const activeIndex = activeEntry?.activityIndex ?? -1;
        const overIndex = overEntry?.activityIndex ?? -1;

        let finalItinerary = localItinerary;

        if (activeDayIdx === overDayIdx && activeIndex !== overIndex) {
            const newDays = localItinerary.days.map(d => ({...d, activities: [...d.activities]}));
            newDays[activeDayIdx].activities = arrayMove(
                newDays[activeDayIdx].activities,
                activeIndex,
                overIndex
            );
            finalItinerary = { ...localItinerary, days: newDays };
            setLocalItinerary(finalItinerary);
        }

        onUpdate(finalItinerary);
    }
  };

  const handleDeleteActivity = (dayIndex: number, actId: string) => {
      const newDays = localItinerary.days.map((d, idx) => {
          if (idx === dayIndex) {
              return { ...d, activities: d.activities.filter(a => a.id !== actId) };
          }
          return d;
      });
      const newItinerary = { ...localItinerary, days: newDays };
      setLocalItinerary(newItinerary);
      if (onUpdate) onUpdate(newItinerary);
  };

  const handleSaveActivity = (dayIndex: number, newActivity: Activity) => {
      const newDays = localItinerary.days.map((d, idx) => {
          if (idx === dayIndex) {
              const newActivities = [...d.activities];
              const actIndex = newActivities.findIndex(a => a.id === newActivity.id);
              if (actIndex > -1) {
                  newActivities[actIndex] = newActivity;
              }
              return { ...d, activities: newActivities };
          }
          return d;
      });
      const newItinerary = { ...localItinerary, days: newDays };
      setLocalItinerary(newItinerary);
      if (onUpdate) onUpdate(newItinerary);
  };

  const activeActivity = activeDragId ? activityLookup.get(activeDragId)?.activity ?? null : null;
  const activeActivityImage = activeActivity ? activityImages[activeActivity.id]?.url : undefined;
  const journaledDaysCount = useMemo(
    () => localItinerary.days.filter((day) => Boolean(day.mood || day.notes?.trim())).length,
    [localItinerary.days],
  );

  const updateDayReflection = (dayIndex: number, patch: Pick<DayPlan, 'mood' | 'notes'>) => {
    const newDays = localItinerary.days.map((day, index) =>
      index === dayIndex
        ? {
            ...day,
            ...patch,
          }
        : day,
    );

    const newItinerary = { ...localItinerary, days: newDays };
    setLocalItinerary(newItinerary);
    if (onUpdate) {
      onUpdate(newItinerary);
    }
  };

  return (
    <div className={`flex w-full flex-col overflow-hidden bg-[rgba(248,245,240,0.98)] xl:flex-row ${className}`}>
        
        {/* LEFT COLUMN: Scrollable Itinerary List */}
        <div className="relative z-20 min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[rgba(252,250,247,0.98)]">
            <div className="relative shrink-0 border-b border-[rgba(232,221,207,0.92)] bg-[rgba(252,248,242,0.96)] px-4 py-4 sm:px-6 md:px-7 md:py-4">
                <div className="flex flex-col gap-4 pr-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[rgba(200,97,55,0.82)]">
                          Trip plan
                        </p>
                        <div className="mb-2 flex flex-wrap gap-2">
                            <span className="rounded-[0.35rem] border border-[rgba(237,170,118,0.38)] bg-[rgba(255,249,243,0.92)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(217,102,58,0.96)]">
                            {localItinerary.totalDays} Days
                            </span>
                            <span className="rounded-[0.35rem] border border-[rgba(237,170,118,0.38)] bg-[rgba(255,249,243,0.92)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(217,102,58,0.96)]">
                            {localItinerary.currency}{localItinerary.totalBudget.toLocaleString()} Total
                            </span>
                            {journaledDaysCount ? (
                              <span className="rounded-[0.35rem] border border-[rgba(110,160,154,0.32)] bg-[rgba(233,245,242,0.96)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(55,128,121,0.96)]">
                                {journaledDaysCount} journaled
                              </span>
                            ) : null}
                        </div>
                        <h2 className="font-display text-[1.8rem] font-bold leading-none text-[rgba(74,43,26,0.96)] md:text-[2.4rem]">{localItinerary.destination}</h2>
                        <p className="mt-1 max-w-md line-clamp-2 text-sm text-[rgba(105,70,48,0.82)]">{localItinerary.title}</p>
                    </div>

                    <div className="inline-flex w-full border border-[rgba(232,219,205,0.94)] bg-[rgba(255,252,248,0.92)] p-1 lg:w-auto">
                      <button
                        type="button"
                        onClick={() => setActiveTab('itinerary')}
                        className={`flex min-h-[38px] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors lg:min-w-[8rem] ${
                          activeTab === 'itinerary'
                            ? 'bg-[rgba(230,106,63,0.96)] text-white'
                            : 'text-[rgba(109,74,52,0.82)] hover:bg-[rgba(247,239,230,0.92)]'
                        }`}
                      >
                        <Calendar size={15} />
                        Itinerary
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('notes')}
                        className={`flex min-h-[38px] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors lg:min-w-[8rem] ${
                          activeTab === 'notes'
                            ? 'bg-[rgba(230,106,63,0.96)] text-white'
                            : 'text-[rgba(109,74,52,0.82)] hover:bg-[rgba(247,239,230,0.92)]'
                        }`}
                      >
                        <NotebookPen size={15} />
                        Notes
                      </button>
                    </div>
                </div>
            </div>

            <div className="space-y-7 p-4 pb-32 sm:px-5 md:p-6 md:pb-28">
                {activeTab === 'itinerary' ? (
                  <>
                    <section>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">Overview</h3>
                        <p className="text-sm leading-relaxed text-[rgba(93,61,40,0.88)] md:text-base">
                        {localItinerary.overview}
                        </p>
                    </section>

                    <section className="rounded-[0.7rem] border border-[rgba(232,222,211,0.96)] bg-[rgba(255,251,246,0.96)] p-4 shadow-[0_12px_24px_rgba(108,62,26,0.04)]">
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
                            <Wallet size={16} /> Budget Allocation
                        </h3>
                        <div className="h-48 w-full sm:h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={localItinerary.budgetBreakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="amount"
                                    >
                                        {localItinerary.budgetBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: number) => `${localItinerary.currency}${value}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" verticalAlign="bottom" height={36}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
                            <Calendar size={16} /> Daily Plan
                        </h3>
                        
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="relative space-y-6 md:space-y-7 md:border-l md:border-[rgba(239,215,193,0.92)] md:pl-4">
                            {localItinerary.days.map((dayPlan, dayIndex) => (
                                <div key={dayPlan.day} className="relative">
                                <div className="absolute -left-[18px] top-1 hidden h-2.5 w-2.5 rounded-full bg-[rgba(230,106,63,1)] ring-4 ring-white md:block" />
                                
                                <div className="mb-4 border-b border-[rgba(239,215,193,0.72)] pb-3 md:border-b-0 md:pb-0">
                                    <h4 className="text-lg font-bold text-[rgba(74,43,26,0.96)]">Day {dayPlan.day}: {dayPlan.theme}</h4>
                                </div>

                                <SortableContext 
                                    id={`day-${dayPlan.day}`}
                                    items={dayPlan.activities.map(a => a.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-4 min-h-[50px]">
                                        {dayPlan.activities.map((activity) => (
                                        <SortableActivityItem 
                                            key={activity.id} 
                                            activity={activity} 
                                            currency={localItinerary.currency}
                                            imageUrl={activityImages[activity.id]?.url}
                                            onDelete={() => handleDeleteActivity(dayIndex, activity.id)}
                                            onSave={(newAct) => handleSaveActivity(dayIndex, newAct)}
                                            onClick={() => setSelectedActivityId(activity.id)}
                                            isSelected={selectedActivityId === activity.id}
                                        />
                                        ))}
                                        {dayPlan.activities.length === 0 && (
                                            <div className="rounded-[0.7rem] border-2 border-dashed border-[rgba(239,215,193,0.92)] py-4 text-center text-sm text-[rgba(120,83,58,0.62)]">
                                                Drop items here
                                            </div>
                                        )}
                                    </div>
                                </SortableContext>
                                </div>
                            ))}
                            </div>
                            
                            {typeof document !== 'undefined'
                              ? createPortal(
                                  <DragOverlay
                                    dropAnimation={{
                                      duration: 180,
                                      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                      sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
                                    }}
                                  >
                                    {activeActivity ? (
                                      <ActivityDragOverlayCard
                                        activity={activeActivity}
                                        currency={localItinerary.currency}
                                        imageUrl={activeActivityImage}
                                      />
                                    ) : null}
                                  </DragOverlay>,
                                  document.body,
                                )
                              : null}
                        </DndContext>
                    </section>
                  </>
                ) : (
                  <section className="space-y-5">
                    <div className="max-w-2xl">
                      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
                        <BookText size={16} /> Notes by day
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-[rgba(103,67,45,0.8)]">
                        Capture how each day felt while the details are fresh. These notes stay with the trip and remain available when you come back later.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {localItinerary.days.map((dayPlan, dayIndex) => (
                        <section
                          key={dayPlan.day}
                          className="border border-[rgba(232,222,211,0.96)] bg-[rgba(255,251,246,0.96)] p-4 shadow-[0_10px_24px_rgba(108,62,26,0.04)]"
                        >
                          <div className="flex flex-col gap-3 border-b border-[rgba(239,223,207,0.88)] pb-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]">
                                Day {dayPlan.day}
                              </p>
                              <h4 className="mt-1 text-lg font-bold text-[rgba(74,43,26,0.96)]">
                                {dayPlan.theme}
                              </h4>
                              <p className="mt-2 text-sm text-[rgba(108,72,49,0.78)]">
                                {dayPlan.activities.length} planned {dayPlan.activities.length === 1 ? 'stop' : 'stops'}
                              </p>
                            </div>

                            <div className="w-full max-w-xl">
                              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]">
                                Mood
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {MOOD_OPTIONS.map((option) => {
                                  const isActive = dayPlan.mood === option.value;
                                  return (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() =>
                                        updateDayReflection(dayIndex, {
                                          mood: isActive ? undefined : option.value,
                                          notes: dayPlan.notes,
                                        })
                                      }
                                      className={`border px-3 py-2 text-sm font-medium transition-colors ${
                                        isActive
                                          ? option.activeClassName
                                          : option.idleClassName
                                      }`}
                                    >
                                      {option.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="pt-4">
                            <label
                              htmlFor={`day-notes-${dayPlan.day}`}
                              className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]"
                            >
                              Notes
                            </label>
                            <textarea
                              id={`day-notes-${dayPlan.day}`}
                              value={dayPlan.notes || ''}
                              onChange={(event) =>
                                updateDayReflection(dayIndex, {
                                  mood: dayPlan.mood,
                                  notes: event.target.value,
                                })
                              }
                              placeholder="What surprised you, what you loved, what you would skip, what the day felt like..."
                              className="mt-2 min-h-[9rem] w-full resize-y border border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] px-4 py-3 text-sm leading-6 text-[rgba(74,43,26,0.95)] outline-none transition-colors placeholder:text-[rgba(150,112,82,0.52)] focus:border-[rgba(223,147,93,0.92)]"
                            />
                          </div>
                        </section>
                      ))}
                    </div>
                  </section>
                )}
            </div>
        </div>

        <div className="relative z-10 hidden h-[20rem] shrink-0 border-t border-[rgba(229,218,204,0.92)] bg-[rgba(243,237,228,0.65)] md:block xl:h-full xl:w-[52%] xl:border-l xl:border-t-0">
            {activeTab === 'itinerary' ? (
              <WorldMap 
                  pins={mapPins} 
                  onPinClick={(pin) => setSelectedActivityId(pin.id)} 
                  selectedPinId={deferredSelectedActivityId}
                  className="w-full h-full"
              />
            ) : (
              <div className="flex h-full flex-col justify-between bg-[linear-gradient(180deg,rgba(244,238,229,0.92)_0%,rgba(239,233,223,0.98)_100%)] p-6">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[rgba(200,97,55,0.82)]">
                    Trip journal
                  </p>
                  <h3 className="font-display mt-3 text-[2rem] leading-[0.98] text-[rgba(74,43,26,0.96)]">
                    Give each day a memory.
                  </h3>
                  <p className="mt-4 max-w-md text-sm leading-7 text-[rgba(101,68,47,0.82)]">
                    Track the mood of the day, leave yourself a note for later, and keep the emotional arc of the trip next to the plan itself.
                  </p>
                </div>

                <div className="space-y-3">
                  {localItinerary.days.map((day) => {
                    const moodOption = day.mood ? MOOD_OPTION_LOOKUP.get(day.mood) : null;
                    return (
                      <div
                        key={`journal-summary-${day.day}`}
                        className="border border-[rgba(230,217,203,0.92)] bg-[rgba(255,251,246,0.78)] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]">
                              Day {day.day}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[rgba(74,43,26,0.96)]">
                              {day.theme}
                            </p>
                          </div>
                          <span
                            className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                              moodOption
                                ? moodOption.pillClassName
                                : 'border-[rgba(236,220,204,0.96)] bg-[rgba(255,252,248,0.92)] text-[rgba(102,68,47,0.82)]'
                            }`}
                          >
                            {day.mood || 'No mood yet'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>

    </div>
  );
};

export default ItineraryResult;
