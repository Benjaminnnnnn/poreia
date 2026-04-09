import { BookText, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import { DayPlan, TravelItinerary } from "../../types";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import Surface from "../ui/Surface";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/Tooltip";
import { MOOD_OPTIONS, MOOD_OPTION_LOOKUP, WorkspaceTab } from "./constants";

export interface ItinerarySectionNavItem {
  id: string;
  label: string;
}

interface ItineraryHeaderProps {
  actions?: React.ReactNode;
  destination: string;
  journaledDaysCount: number;
  title: string;
  totalBudget: number;
  totalDays: number;
  currency: string;
}

export const ItineraryHeader: React.FC<ItineraryHeaderProps> = ({
  actions,
  currency,
  destination,
  journaledDaysCount,
  title,
  totalBudget,
  totalDays,
}) => (
  <div className="relative shrink-0 border-b border-white/15 bg-white/5 px-4 py-4 sm:px-6 md:px-7 md:py-4">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 max-w-2xl">
        <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#D97757]">
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
        <h2 className="font-display text-[1.8rem] font-bold leading-none text-white md:text-[2.4rem]">
          {destination}
        </h2>
        <p className="mt-1 max-w-lg line-clamp-2 text-sm leading-6 text-white/70">
          {title}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center md:pt-1">{actions}</div>
      ) : null}
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
  const [draftNotesByDay, setDraftNotesByDay] = useState<
    Record<number, string>
  >({});

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
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/90 drop-shadow-md">
          <BookText size={16} /> Notes by day
        </h3>
        <p className="mt-3 text-sm leading-6 text-white/70">
          Capture how each day felt while the details are fresh. These notes
          stay with the trip and remain available when you come back later.
        </p>
      </div>

      <div className="space-y-4">
        {days.map((dayPlan, dayIndex) => (
          <Surface as="section" key={dayPlan.day} variant="glass" radius="md">
            <div className="flex flex-col gap-3 border-b border-white/15 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/50">
                  Day {dayPlan.day}
                </p>
                <h4 className="mt-1 text-lg font-bold text-white">
                  {dayPlan.theme}
                </h4>
                <p className="mt-2 text-sm text-white/60">
                  {dayPlan.activities.length} planned{" "}
                  {dayPlan.activities.length === 1 ? "stop" : "stops"}
                </p>
              </div>

              <div className="w-full max-w-xl">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/50">
                  Mood
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((option) => {
                    const isActive = dayPlan.mood === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          onUpdateDayReflection(dayIndex, {
                            mood: isActive ? undefined : option.value,
                            notes: draftNotesByDay[dayPlan.day] ?? "",
                          })
                        }
                        className={`rounded-[0.65rem] h-11 ${
                          isActive
                            ? option.activeClassName
                            : option.idleClassName
                        }`}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <label
                htmlFor={`day-notes-${dayPlan.day}`}
                className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/50"
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
                className="field-focus mt-2 min-h-[9rem] w-full resize-y rounded-[0.8rem] border border-white/20 bg-white/10 px-4 py-3 text-sm leading-6 text-white placeholder:text-white/35"
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
}> = ({ activeSectionId, isCollapsed, items, onSelect, onToggleCollapsed }) => {
  const renderItem = (item: ItinerarySectionNavItem) => {
    const isActive = item.id === activeSectionId;

    return (
      <Button
        key={item.id}
        type="button"
        variant={isActive ? "primary" : "default"}
        onClick={() => onSelect(item.id)}
        aria-pressed={isActive}
        className={`relative w-full justify-start rounded-[0.95rem] h-11 text-[0.96rem] tracking-[-0.02em]
        `}
      >
        <span className="truncate">{item.label}</span>
      </Button>
    );
  };

  return (
    <nav
      aria-label="Itinerary sections"
      className={`hidden lg:relative lg:z-30 lg:flex lg:h-full lg:shrink-0 lg:flex-col scrollbar-themed lg:overflow-y-auto lg:overflow-x-visible lg:border-r lg:border-white/15 lg:bg-black/20 ${
        isCollapsed ? "lg:w-[4.5rem]" : "lg:w-[12.5rem]"
      }`}
    >
      {isCollapsed ? (
        <div className="flex min-h-full w-full flex-col items-center gap-4 overflow-visible px-2.5 py-5">
          <div className="flex flex-col items-center gap-2.5">
            {items.map((item) => {
              const isActive = item.id === activeSectionId;
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={isActive ? "primary" : "default"}
                      size="icon-xs"
                      onClick={() => onSelect(item.id)}
                      aria-label={item.label}
                      aria-pressed={isActive}
                      className={`h-3 w-3 rounded-xs ${isActive ? "bg-primary" : "bg-white/40"}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          <div className="mt-auto">
            <Button
              type="button"
              size="icon"
              onClick={onToggleCollapsed}
              aria-label="Expand section navigation"
              className="rounded-full text-white/60 bg-white/0 hover:text-white"
            >
              <ChevronRight size={17} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-full w-full flex-col px-2.5 py-5">
          <div className="flex flex-col gap-1.5">{items.map(renderItem)}</div>

          <div className="mt-auto pt-4">
            <Button
              type="button"
              onClick={onToggleCollapsed}
              className="w-full justify-start gap-2 rounded-[0.95rem] text-white/60 bg-white/0 hover:text-white"
            >
              <ChevronLeft size={16} />
              Hide sidebar
            </Button>
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
    <div className="flex h-full min-h-0 flex-col gap-8 scrollbar-themed overflow-y-auto bg-black/20 backdrop-blur-sm p-6">
      <div>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#D97757]">
          Trip journal
        </p>
        <h3 className="font-display mt-3 text-[2rem] leading-[0.98] text-white">
          Give each day a memory.
        </h3>
        <p className="mt-4 max-w-md text-sm leading-7 text-white/70">
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
              variant="glass"
              padding="none"
              radius="md"
              className="px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/50">
                    Day {day.day}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {day.theme}
                  </p>
                </div>
                <Badge
                  tone={moodOption ? undefined : "neutral"}
                  size="sm"
                  className={
                    moodOption
                      ? `${moodOption.pillClassName} rounded-[0.45rem] px-3 py-1 text-xs`
                      : "rounded-[0.45rem] px-3 py-1 text-xs border-white/15 bg-white/10 text-white/50"
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
