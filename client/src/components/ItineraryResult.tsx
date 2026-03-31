import React, {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  getActivityImage,
  ResolvedActivityImage,
} from "../services/activityImageService";
import { hasFiniteCoordinates } from "../lib/coordinates";
import {
  Activity,
  BudgetBreakdown,
  DayPlan,
  MapPinData,
  TravelItinerary,
} from "../types";
import {
  ItineraryHeader,
  ItineraryNotesView,
  ItinerarySidePanel,
} from "./itinerary/ItineraryContent";
import {
  DAY_CONTAINER_PATTERN,
  DAY_MARKER_COLORS,
  WorkspaceTab,
} from "./itinerary/constants";

const ItineraryPlanView = lazy(() => import("./itinerary/ItineraryPlanView"));
const WorldMap = lazy(() => import("./WorldMap"));

interface ItineraryResultProps {
  itinerary: TravelItinerary;
  className?: string;
  onUpdate?: (updatedItinerary: TravelItinerary) => void;
  onWorkspaceTabChange?: (tab: WorkspaceTab) => void;
}

const PanelFallback: React.FC<{ className?: string; label: string }> = ({
  className = "",
  label,
}) => (
  <div
    className={`flex items-center justify-center rounded-[0.7rem] border border-[rgba(232,222,211,0.96)] bg-[rgba(255,251,246,0.9)] px-4 py-6 text-sm font-medium text-[rgba(105,70,48,0.78)] ${className}`}
  >
    {label}
  </div>
);

const ItineraryResult: React.FC<ItineraryResultProps> = ({
  itinerary,
  className = "",
  onUpdate,
  onWorkspaceTabChange,
}) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("itinerary");
  const [selectedActivityId, setSelectedActivityId] = useState<
    string | undefined
  >();
  const [localItinerary, setLocalItinerary] =
    useState<TravelItinerary>(itinerary);
  const [activityImages, setActivityImages] = useState<
    Record<string, ResolvedActivityImage>
  >({});
  const deferredSelectedActivityId = useDeferredValue(selectedActivityId);

  useEffect(() => {
    onWorkspaceTabChange?.(activeTab);
  }, [activeTab, onWorkspaceTabChange]);

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
      itineraryActivityEntries.filter(
        ({ activity }) => !activityImages[activity.id],
      ),
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
        return image ? ([activity.id, image] as const) : null;
      }),
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      const resolvedImages = results.filter(
        (result): result is readonly [string, ResolvedActivityImage] =>
          Boolean(result),
      );

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

  const mapPins = useMemo(
    () =>
      itineraryActivityEntries.flatMap(({ activity, dayNumber }) => {
        if (!hasFiniteCoordinates(activity)) {
          return [];
        }

        return [
          {
            id: activity.id,
            name: activity.location,
            description: activity.description,
            dayNumber,
            dayColor:
              DAY_MARKER_COLORS[(dayNumber - 1) % DAY_MARKER_COLORS.length],
            lat: activity.lat,
            lng: activity.lng,
            image: activityImages[activity.id]?.url,
          } satisfies MapPinData,
        ];
      }),
    [activityImages, itineraryActivityEntries],
  );

  const handleSelectActivity = useCallback((activityId: string) => {
    setSelectedActivityId(activityId);
  }, []);

  const handleMapPinClick = useCallback((pin: MapPinData) => {
    setSelectedActivityId(pin.id);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeDayNum = activityLookup.get(activeId)?.dayNumber;
    let overDayNum = activityLookup.get(overId)?.dayNumber;

    if (!overDayNum) {
      const match = overId.match(DAY_CONTAINER_PATTERN);
      if (match) {
        overDayNum = parseInt(match[1], 10);
      }
    }

    if (!activeDayNum || !overDayNum || activeDayNum === overDayNum) {
      return;
    }

    setLocalItinerary((previous) => {
      const activeDayIdx = previous.days.findIndex((day) => day.day === activeDayNum);
      const overDayIdx = previous.days.findIndex((day) => day.day === overDayNum);

      const newDays = previous.days.map((day) => ({
        ...day,
        activities: [...day.activities],
      }));
      const activeItems = newDays[activeDayIdx].activities;
      const overItems = newDays[overDayIdx].activities;
      const activeIndex = activeItems.findIndex((activity) => activity.id === activeId);

      if (activeIndex === -1) {
        return previous;
      }

      let overIndex;
      if (overItems.some((activity) => activity.id === overId)) {
        overIndex = overItems.findIndex((activity) => activity.id === overId);
        const isBelow =
          Boolean(over) &&
          Boolean(active.rect.current.translated) &&
          active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelow ? 1 : 0;
        overIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
      } else {
        overIndex = overItems.length + 1;
      }

      const [movedItem] = activeItems.splice(activeIndex, 1);
      const safeOverIndex = Math.min(Math.max(0, overIndex), overItems.length);
      overItems.splice(safeOverIndex, 0, movedItem);

      return { ...previous, days: newDays };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || !onUpdate) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeEntry = activityLookup.get(activeId);
    const overEntry = activityLookup.get(overId);
    const activeDayNum = activeEntry?.dayNumber;
    let overDayNum = overEntry?.dayNumber;

    if (!overDayNum && overId.match(DAY_CONTAINER_PATTERN)) {
      overDayNum = parseInt(overId.match(DAY_CONTAINER_PATTERN)![1], 10);
    }

    if (activeDayNum && overDayNum) {
      const activeDayIdx = localItinerary.days.findIndex(
        (day) => day.day === activeDayNum,
      );
      const overDayIdx = localItinerary.days.findIndex(
        (day) => day.day === overDayNum,
      );
      const activeIndex = activeEntry?.activityIndex ?? -1;
      const overIndex = overEntry?.activityIndex ?? -1;

      let finalItinerary = localItinerary;

      if (activeDayIdx === overDayIdx && activeIndex !== overIndex) {
        const newDays = localItinerary.days.map((day) => ({
          ...day,
          activities: [...day.activities],
        }));
        newDays[activeDayIdx].activities = arrayMove(
          newDays[activeDayIdx].activities,
          activeIndex,
          overIndex,
        );
        finalItinerary = { ...localItinerary, days: newDays };
        setLocalItinerary(finalItinerary);
      }

      onUpdate(finalItinerary);
    }
  };

  const handleDeleteActivity = (dayIndex: number, activityId: string) => {
    const newDays = localItinerary.days.map((day, index) =>
      index === dayIndex
        ? {
            ...day,
            activities: day.activities.filter(
              (activity) => activity.id !== activityId,
            ),
          }
        : day,
    );
    const newItinerary = { ...localItinerary, days: newDays };
    setLocalItinerary(newItinerary);
    onUpdate?.(newItinerary);
  };

  const handleSaveActivity = (dayIndex: number, newActivity: Activity) => {
    const newDays = localItinerary.days.map((day, index) => {
      if (index !== dayIndex) {
        return day;
      }

      const newActivities = [...day.activities];
      const activityIndex = newActivities.findIndex(
        (activity) => activity.id === newActivity.id,
      );

      if (activityIndex > -1) {
        newActivities[activityIndex] = newActivity;
      }

      return { ...day, activities: newActivities };
    });

    const newItinerary = { ...localItinerary, days: newDays };
    setLocalItinerary(newItinerary);
    onUpdate?.(newItinerary);
  };

  const updateDayReflection = (
    dayIndex: number,
    patch: Pick<DayPlan, "mood" | "notes">,
  ) => {
    const newDays = localItinerary.days.map((day, index) =>
      index === dayIndex ? { ...day, ...patch } : day,
    );
    const newItinerary = { ...localItinerary, days: newDays };
    setLocalItinerary(newItinerary);
    onUpdate?.(newItinerary);
  };

  const activeActivity = activeDragId
    ? activityLookup.get(activeDragId)?.activity ?? null
    : null;
  const activeActivityImage = activeActivity
    ? activityImages[activeActivity.id]
    : undefined;

  const journaledDaysCount = useMemo(
    () =>
      localItinerary.days.filter(
        (day) => Boolean(day.mood || day.notes?.trim()),
      ).length,
    [localItinerary.days],
  );

  const hasRecordedCosts = useMemo(
    () =>
      localItinerary.days.some((day) =>
        day.activities.some(
          (activity) => activity.costEstimate !== undefined,
        ),
      ),
    [localItinerary.days],
  );

  const recordedSpendByDay = useMemo<BudgetBreakdown[]>(
    () =>
      localItinerary.days
        .map((day) => ({
          category: `Day ${day.day}`,
          amount: day.activities.reduce(
            (sum, activity) => sum + (activity.costEstimate ?? 0),
            0,
          ),
        }))
        .filter((entry) => entry.amount > 0),
    [localItinerary.days],
  );

  const displayedBudgetBreakdown = hasRecordedCosts
    ? recordedSpendByDay
    : localItinerary.budgetBreakdown;
  const displayedTotalBudget = hasRecordedCosts
    ? recordedSpendByDay.reduce((sum, entry) => sum + entry.amount, 0)
    : localItinerary.totalBudget;

  return (
    <div
      className={`flex w-full flex-col overflow-hidden bg-[rgba(248,245,240,0.98)] xl:flex-row ${className}`}
    >
      <div className="relative z-20 min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[rgba(252,250,247,0.98)]">
        <ItineraryHeader
          activeTab={activeTab}
          currency={localItinerary.currency}
          destination={localItinerary.destination}
          journaledDaysCount={journaledDaysCount}
          onTabChange={setActiveTab}
          title={localItinerary.title}
          totalBudget={displayedTotalBudget}
          totalDays={localItinerary.totalDays}
        />

        <div className="space-y-7 p-4 pb-32 sm:px-5 md:p-6 md:pb-28">
          {activeTab === "itinerary" ? (
            <Suspense
              fallback={<PanelFallback label="Loading itinerary planner..." />}
            >
              <ItineraryPlanView
                activeActivity={activeActivity}
                activeActivityImage={activeActivityImage}
                activityImages={activityImages}
                budgetBreakdown={displayedBudgetBreakdown}
                currency={localItinerary.currency}
                days={localItinerary.days}
                hasRecordedCosts={hasRecordedCosts}
                onDeleteActivity={handleDeleteActivity}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragStart={handleDragStart}
                onSaveActivity={handleSaveActivity}
                onSelectActivity={handleSelectActivity}
                overview={localItinerary.overview}
                selectedActivityId={selectedActivityId}
              />
            </Suspense>
          ) : (
            <ItineraryNotesView
              days={localItinerary.days}
              onUpdateDayReflection={updateDayReflection}
            />
          )}
        </div>
      </div>

      <div className="relative z-10 hidden h-[20rem] shrink-0 border-t border-[rgba(229,218,204,0.92)] bg-[rgba(243,237,228,0.65)] md:block xl:h-full xl:w-[52%] xl:border-l xl:border-t-0">
        <ItinerarySidePanel activeTab={activeTab} itinerary={localItinerary}>
          <Suspense
            fallback={
              <PanelFallback
                className="h-full rounded-none border-0"
                label="Loading map..."
              />
            }
          >
            <WorldMap
              pins={mapPins}
              onPinClick={handleMapPinClick}
              selectedPinId={deferredSelectedActivityId}
              className="h-full w-full"
            />
          </Suspense>
        </ItinerarySidePanel>
      </div>
    </div>
  );
};

export default ItineraryResult;
