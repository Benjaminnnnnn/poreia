import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import dynamic from "next/dynamic";
import React, {
  lazy,
  startTransition,
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { hasFiniteCoordinates } from "../lib/coordinates";
import {
  getActivityImage,
  ResolvedActivityImage,
} from "../services/activityImageService";
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
  ItinerarySectionNav,
  ItinerarySidePanel,
} from "./itinerary/ItineraryContent";
import { PlaceDetailOverlay } from "./itinerary/PlaceDetailCard";
import {
  DAY_CONTAINER_PATTERN,
  DAY_MARKER_COLORS,
  WorkspaceTab,
} from "./itinerary/constants";
import { PageLoading } from "./ui/PageLoading";

const ItineraryPlanView = lazy(() => import("./itinerary/ItineraryPlanView"));
const WorldMap = dynamic(() => import("./WorldMap"), { ssr: false });

const ITINERARY_SECTION_TOP_OFFSET = 132;
const SECTION_SCROLL_SETTLE_TOLERANCE = 6;
const SECTION_SCROLL_LOCK_TIMEOUT_MS = 1200;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface ItineraryResultProps {
  itinerary: TravelItinerary;
  className?: string;
  headerActions?: React.ReactNode;
  onUpdate?: (updatedItinerary: TravelItinerary) => void;
  onWorkspaceTabChange?: (tab: WorkspaceTab) => void;
}

const ItineraryResult: React.FC<ItineraryResultProps> = ({
  itinerary,
  className = "",
  headerActions,
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
  const [activeSectionId, setActiveSectionId] = useState("overview");
  const [isSectionNavCollapsed, setIsSectionNavCollapsed] = useState(false);
  const [selectedMapPin, setSelectedMapPin] = useState<{
    pin: MapPinData;
    activity: Activity;
  } | null>(null);
  const deferredSelectedActivityId = useDeferredValue(selectedActivityId);
  const mainScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionIdRef = useRef<string | null>(null);
  const lockedSectionIdRef = useRef<string | null>(null);
  const lockedScrollTopRef = useRef<number | null>(null);
  const scrollLockTimeoutRef = useRef<number | null>(null);

  const clearSectionScrollLock = useCallback(() => {
    lockedSectionIdRef.current = null;
    lockedScrollTopRef.current = null;
    if (scrollLockTimeoutRef.current !== null) {
      window.clearTimeout(scrollLockTimeoutRef.current);
      scrollLockTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearSectionScrollLock, [clearSectionScrollLock]);

  useEffect(() => {
    onWorkspaceTabChange?.(activeTab);
  }, [activeTab, onWorkspaceTabChange]);

  useEffect(() => {
    setActiveSectionId(activeTab === "notes" ? "notes" : "overview");
  }, [activeTab]);

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
        const image = await getActivityImage(
          activity,
          localItinerary.destination,
        );
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

  const handleMapPinClick = useCallback(
    (pin: MapPinData) => {
      setSelectedActivityId(pin.id);
      const entry = activityLookup.get(pin.id);
      setSelectedMapPin(entry ? { pin, activity: entry.activity } : null);
    },
    [activityLookup],
  );

  const handleCloseMapPin = useCallback(() => setSelectedMapPin(null), []);

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
      const activeDayIdx = previous.days.findIndex(
        (day) => day.day === activeDayNum,
      );
      const overDayIdx = previous.days.findIndex(
        (day) => day.day === overDayNum,
      );

      const newDays = previous.days.map((day) => ({
        ...day,
        activities: [...day.activities],
      }));
      const activeItems = newDays[activeDayIdx].activities;
      const overItems = newDays[overDayIdx].activities;
      const activeIndex = activeItems.findIndex(
        (activity) => activity.id === activeId,
      );

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
        overIndex =
          overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
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
    ? (activityLookup.get(activeDragId)?.activity ?? null)
    : null;
  const activeActivityImage = activeActivity
    ? activityImages[activeActivity.id]
    : undefined;

  const journaledDaysCount = useMemo(
    () =>
      localItinerary.days.filter((day) =>
        Boolean(day.mood || day.notes?.trim()),
      ).length,
    [localItinerary.days],
  );

  const hasRecordedCosts = useMemo(
    () =>
      localItinerary.days.some((day) =>
        day.activities.some((activity) => activity.costEstimate !== undefined),
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

  const sectionNavItems = useMemo(
    () => [
      { id: "overview", label: "Overview" },
      { id: "cost-breakdown", label: "Cost Breakdown" },
      ...localItinerary.days.map((day) => ({
        id: `day-${day.day}`,
        label: `Day ${day.day}`,
      })),
      { id: "notes", label: "Notes" },
    ],
    [localItinerary.days],
  );

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const scrollContainer = mainScrollRef.current;
      if (!scrollContainer) {
        return;
      }

      const target = scrollContainer.querySelector<HTMLElement>(
        `[data-itinerary-section="${sectionId}"]`,
      );

      if (!target) {
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const nextTop =
        scrollContainer.scrollTop +
        (targetRect.top - containerRect.top) -
        ITINERARY_SECTION_TOP_OFFSET;
      const boundedTop = Math.max(0, nextTop);

      lockedSectionIdRef.current = sectionId;
      lockedScrollTopRef.current = boundedTop;
      if (scrollLockTimeoutRef.current !== null) {
        window.clearTimeout(scrollLockTimeoutRef.current);
      }
      scrollLockTimeoutRef.current = window.setTimeout(() => {
        clearSectionScrollLock();
      }, SECTION_SCROLL_LOCK_TIMEOUT_MS);

      scrollContainer.scrollTo({
        top: boundedTop,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    },
    [clearSectionScrollLock],
  );

  useEffect(() => {
    if (!pendingSectionIdRef.current) {
      return;
    }

    const pendingSectionId = pendingSectionIdRef.current;
    pendingSectionIdRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      scrollToSection(pendingSectionId);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, scrollToSection]);

  useEffect(() => {
    const scrollContainer = mainScrollRef.current;
    if (!scrollContainer) {
      return;
    }

    const updateActiveSection = () => {
      const lockedSectionId = lockedSectionIdRef.current;
      const lockedScrollTop = lockedScrollTopRef.current;
      if (lockedSectionId && lockedScrollTop !== null) {
        if (
          Math.abs(scrollContainer.scrollTop - lockedScrollTop) <=
          SECTION_SCROLL_SETTLE_TOLERANCE
        ) {
          clearSectionScrollLock();
          setActiveSectionId(lockedSectionId);
        }
        return;
      }

      const visibleSections = Array.from(
        scrollContainer.querySelectorAll<HTMLElement>(
          "[data-itinerary-section]",
        ),
      ).filter((section) =>
        activeTab === "notes"
          ? section.dataset.itinerarySection === "notes"
          : section.dataset.itinerarySection !== "notes",
      );

      if (!visibleSections.length) {
        return;
      }

      const containerTop = scrollContainer.getBoundingClientRect().top;
      const targetLine = containerTop + ITINERARY_SECTION_TOP_OFFSET + 8;

      let nextActiveSection =
        visibleSections[0].dataset.itinerarySection ?? "overview";

      for (const section of visibleSections) {
        if (section.getBoundingClientRect().top <= targetLine) {
          nextActiveSection =
            section.dataset.itinerarySection ?? nextActiveSection;
          continue;
        }

        break;
      }

      setActiveSectionId(nextActiveSection);
    };

    updateActiveSection();
    scrollContainer.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener("scroll", updateActiveSection);
    };
  }, [activeTab, clearSectionScrollLock, localItinerary.days, scrollToSection]);

  const handleSectionSelect = useCallback(
    (sectionId: string) => {
      setActiveSectionId(sectionId);

      if (sectionId === "notes") {
        if (activeTab === "notes") {
          scrollToSection("notes");
          return;
        }

        pendingSectionIdRef.current = "notes";
        setActiveTab("notes");
        return;
      }

      if (activeTab === "itinerary") {
        scrollToSection(sectionId);
        return;
      }

      pendingSectionIdRef.current = sectionId;
      setActiveTab("itinerary");
    },
    [activeTab, scrollToSection],
  );

  return (
    <div
      className={`flex w-full min-h-0 flex-col overflow-hidden lg:flex-row ${className}`}
    >
      <div className="relative z-20 min-h-0 min-w-0 flex-1 bg-black/30 backdrop-blur-md">
        <div className="flex h-full min-h-0">
          <ItinerarySectionNav
            activeSectionId={activeSectionId}
            isCollapsed={isSectionNavCollapsed}
            items={sectionNavItems}
            onSelect={handleSectionSelect}
            onToggleCollapsed={() =>
              setIsSectionNavCollapsed((collapsed) => !collapsed)
            }
          />

          <div
            ref={mainScrollRef}
            className="relative z-10 min-h-0 min-w-0 flex-1 overflow-y-auto scrollbar-themed overflow-x-hidden"
          >
            <ItineraryHeader
              actions={headerActions}
              currency={localItinerary.currency}
              destination={localItinerary.destination}
              journaledDaysCount={journaledDaysCount}
              title={localItinerary.title}
              totalBudget={displayedTotalBudget}
              totalDays={localItinerary.totalDays}
            />

            <div className="p-4 pb-32 sm:px-5 md:p-6 md:pb-28">
              <div className="min-w-0 space-y-7">
                {activeTab === "itinerary" ? (
                  <Suspense
                    fallback={
                      <PageLoading label="Loading itinerary planner..." />
                    }
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
          </div>
        </div>
      </div>

      <div className="relative z-10 hidden h-[20rem] shrink-0 border-t border-white/15 bg-black/25 backdrop-blur-sm md:block lg:h-auto lg:min-h-0 lg:w-[46vw] lg:min-w-[28rem] lg:max-w-[46vw] lg:border-l lg:border-t-0 xl:w-[44vw] xl:max-w-[44vw]">
        <ItinerarySidePanel activeTab={activeTab} itinerary={localItinerary}>
          <Suspense
            fallback={
              <PageLoading className="h-full" label="Loading map..." />
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
        <PlaceDetailOverlay
          activity={selectedMapPin?.activity ?? null}
          pin={selectedMapPin?.pin ?? null}
          onClose={handleCloseMapPin}
        />
      </div>
    </div>
  );
};

export default ItineraryResult;
