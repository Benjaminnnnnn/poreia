import React, { useEffect, useState } from "react";
import {
  BookText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DayPlan, TravelItinerary } from "../../types";
import Badge from "../ui/Badge";
import Surface from "../ui/Surface";
import Tooltip from "../ui/Tooltip";
import {
  MOOD_OPTIONS,
  MOOD_OPTION_LOOKUP,
} from "./constants";

export interface ItinerarySectionNavItem {
  id: string;
  label: string;
}

interface ItineraryHeaderProps {
  destination: string;
  journaledDaysCount: number;
  title: string;
  totalBudget: number;
  totalDays: number;
  currency: string;
}

export const ItineraryHeader: React.FC<ItineraryHeaderProps> = ({
  currency,
  destination,
  journaledDaysCount,
  title,
  totalBudget,
  totalDays,
}) => (
  <div className="relative shrink-0 border-b border-[rgba(232,221,207,0.92)] bg-[rgba(252,248,242,0.96)] px-4 py-4 sm:px-6 md:px-7 md:py-4">
    <div className="flex flex-col gap-4 pr-4">
      <div className="max-w-2xl">
        <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[rgba(200,97,55,0.82)]">
          Trip plan
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge tone="coral" size="xs">
            {totalDays} Days
          </Badge>
          <Badge tone="coral" size="xs">
            {currency}
            {totalBudget.toLocaleString()} Total
          </Badge>
          {journaledDaysCount ? (
            <Badge tone="teal" size="xs">
              {journaledDaysCount} journaled
            </Badge>
          ) : null}
        </div>
        <h2 className="font-display text-[1.8rem] font-bold leading-none text-[rgba(74,43,26,0.96)] md:text-[2.4rem]">
          {destination}
        </h2>
        <p className="mt-1 max-w-lg line-clamp-2 text-sm leading-6 text-[rgba(105,70,48,0.82)]">
          {title}
        </p>
      </div>
    </div>
  </div>
);

interface ItineraryNotesViewProps {
  days: DayPlan[];
  onUpdateDayReflection: (
    dayIndex: number,
    patch: Pick<DayPlan, "mood" | "notes">,
  ) => void;
}

export const ItineraryNotesView: React.FC<ItineraryNotesViewProps> = ({
  days,
  onUpdateDayReflection,
}) => {
  const [draftNotesByDay, setDraftNotesByDay] = useState<Record<number, string>>(
    {},
  );

  useEffect(() => {
    setDraftNotesByDay(
      Object.fromEntries(days.map((day) => [day.day, day.notes || ""])),
    );
  }, [days]);

  return (
    <section
      id="itinerary-section-notes"
      data-itinerary-section="notes"
      className="scroll-mt-24 space-y-5"
    >
      <div className="max-w-2xl">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
          <BookText size={16} /> Notes by day
        </h3>
        <p className="mt-3 text-sm leading-6 text-[rgba(103,67,45,0.8)]">
          Capture how each day felt while the details are fresh. These notes stay
          with the trip and remain available when you come back later.
        </p>
      </div>

      <div className="space-y-4">
        {days.map((dayPlan, dayIndex) => (
          <Surface
            as="section"
            key={dayPlan.day}
            variant="card"
            radius="md"
            className="shadow-[0_10px_24px_rgba(108,62,26,0.04)]"
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
                  {dayPlan.activities.length} planned{" "}
                  {dayPlan.activities.length === 1 ? "stop" : "stops"}
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
                          onUpdateDayReflection(dayIndex, {
                            mood: isActive ? undefined : option.value,
                            notes: draftNotesByDay[dayPlan.day] ?? "",
                          })
                        }
                        className={`focus-ring min-h-[44px] rounded-[0.65rem] border px-3.5 py-2 text-sm font-medium transition-colors ${
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
                value={draftNotesByDay[dayPlan.day] ?? ""}
                onChange={(event) =>
                  setDraftNotesByDay((current) => ({
                    ...current,
                    [dayPlan.day]: event.target.value,
                  }))
                }
                onBlur={() =>
                  onUpdateDayReflection(dayIndex, {
                    mood: dayPlan.mood,
                    notes: draftNotesByDay[dayPlan.day] ?? "",
                  })
                }
                placeholder="What surprised you, what you loved, what you would skip, what the day felt like..."
                className="field-focus mt-2 min-h-[9rem] w-full resize-y rounded-[0.8rem] border border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] px-4 py-3 text-sm leading-6 text-[rgba(74,43,26,0.95)] placeholder:text-[rgba(150,112,82,0.52)]"
              />
            </div>
          </Surface>
        ))}
      </div>
    </section>
  );
};

export const ItinerarySectionNav: React.FC<{
  activeSectionId: string;
  isCollapsed: boolean;
  items: ItinerarySectionNavItem[];
  onSelect: (sectionId: string) => void;
  onToggleCollapsed: () => void;
}> = ({
  activeSectionId,
  isCollapsed,
  items,
  onSelect,
  onToggleCollapsed,
}) => {
  const renderItem = (item: ItinerarySectionNavItem) => {
    const isActive = item.id === activeSectionId;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onSelect(item.id)}
        aria-pressed={isActive}
        className={`focus-ring relative flex min-h-[44px] w-full items-center rounded-[0.95rem] px-4 py-3 text-left text-[0.96rem] font-semibold tracking-[-0.02em] transition-[background-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isActive
            ? "bg-[rgba(230,106,63,0.96)] text-[rgba(255,251,246,0.98)] shadow-[0_10px_18px_rgba(217,102,58,0.2)]"
            : "text-[rgba(94,72,57,0.76)] hover:bg-[rgba(246,240,232,0.92)] hover:text-[rgba(78,55,42,0.92)]"
        }`}
      >
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Itinerary sections"
      className={`hidden lg:relative lg:z-30 lg:flex lg:h-full lg:shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible lg:border-r lg:border-[rgba(232,221,207,0.94)] lg:bg-[rgba(249,246,241,0.98)] ${
        isCollapsed ? "lg:w-[4.5rem]" : "lg:w-[12.5rem]"
      }`}
    >
      {isCollapsed ? (
        <div className="flex min-h-full w-full flex-col items-center gap-4 overflow-visible px-2.5 py-5">
          <div className="flex flex-col items-center gap-2.5">
            {items.map((item) => {
              const isActive = item.id === activeSectionId;
              return (
                <Tooltip key={item.id} content={item.label} side="right">
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-label={item.label}
                    aria-pressed={isActive}
                    className={`focus-ring inline-flex h-3 w-3 rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive
                        ? "border-[rgba(230,106,63,0.96)] bg-[rgba(230,106,63,0.96)] shadow-[0_0_0_4px_rgba(233,175,141,0.22)]"
                        : "border-[rgba(210,188,169,0.96)] bg-[rgba(255,251,246,0.95)] hover:border-[rgba(214,103,58,0.56)] hover:bg-[rgba(255,245,237,0.96)]"
                    }`}
                  />
                </Tooltip>
              );
            })}
          </div>

          <div className="mt-auto">
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Expand section navigation"
              className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-full text-[rgba(130,86,62,0.74)] transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[rgba(244,238,230,0.92)] hover:text-[rgba(84,57,43,0.92)]"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-full w-full flex-col px-2.5 py-5">
          <div className="flex flex-col gap-1.5">{items.map(renderItem)}</div>

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="focus-ring inline-flex min-h-[44px] w-full items-center gap-2 rounded-[0.95rem] px-3.5 text-sm font-semibold text-[rgba(118,79,57,0.76)] transition-[background-color,color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[rgba(244,238,230,0.92)] hover:text-[rgba(84,57,43,0.92)]"
            >
              <ChevronLeft size={16} />
              Hide sidebar
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export const ItinerarySidePanel: React.FC<{
  activeTab: WorkspaceTab;
  children: React.ReactNode;
  itinerary: TravelItinerary;
}> = ({ activeTab, children, itinerary }) => {
  if (activeTab === "itinerary") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-8 overflow-y-auto bg-[linear-gradient(180deg,rgba(244,238,229,0.92)_0%,rgba(239,233,223,0.98)_100%)] p-6">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[rgba(200,97,55,0.82)]">
          Trip journal
        </p>
        <h3 className="font-display mt-3 text-[2rem] leading-[0.98] text-[rgba(74,43,26,0.96)]">
          Give each day a memory.
        </h3>
        <p className="mt-4 max-w-md text-sm leading-7 text-[rgba(101,68,47,0.82)]">
          Track the mood of the day, leave yourself a note for later, and keep
          the emotional arc of the trip next to the plan itself.
        </p>
      </div>

      <div className="space-y-3 pb-6">
        {itinerary.days.map((day) => {
          const moodOption = day.mood
            ? MOOD_OPTION_LOOKUP.get(
                day.mood as (typeof MOOD_OPTIONS)[number]["value"],
              )
            : null;
          return (
            <Surface
              as="div"
              key={`journal-summary-${day.day}`}
              variant="subtle"
              padding="none"
              radius="md"
              className="px-4 py-3"
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
                <Badge
                  tone={moodOption ? undefined : "neutral"}
                  size="sm"
                  className={
                    moodOption
                      ? `${moodOption.pillClassName} rounded-[0.45rem] px-3 py-1 text-xs`
                      : "rounded-[0.45rem] px-3 py-1 text-xs"
                  }
                >
                  {day.mood || "No mood yet"}
                </Badge>
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
};
