import React from "react";
import { BookText, Calendar, NotebookPen } from "lucide-react";
import { DayPlan, TravelItinerary } from "../../types";
import Badge from "../ui/Badge";
import Surface from "../ui/Surface";
import {
  MOOD_OPTIONS,
  MOOD_OPTION_LOOKUP,
  WorkspaceTab,
} from "./constants";

interface ItineraryHeaderProps {
  activeTab: WorkspaceTab;
  destination: string;
  journaledDaysCount: number;
  onTabChange: (tab: WorkspaceTab) => void;
  title: string;
  totalBudget: number;
  totalDays: number;
  currency: string;
}

export const ItineraryHeader: React.FC<ItineraryHeaderProps> = ({
  activeTab,
  currency,
  destination,
  journaledDaysCount,
  onTabChange,
  title,
  totalBudget,
  totalDays,
}) => (
  <div className="relative shrink-0 border-b border-[rgba(232,221,207,0.92)] bg-[rgba(252,248,242,0.96)] px-4 py-4 sm:px-6 md:px-7 md:py-4">
    <div className="flex flex-col gap-4 pr-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
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
        <p className="mt-1 max-w-md line-clamp-2 text-sm text-[rgba(105,70,48,0.82)]">
          {title}
        </p>
      </div>

      <div className="inline-flex w-full border border-[rgba(232,219,205,0.94)] bg-[rgba(255,252,248,0.92)] p-1 lg:w-auto">
        <button
          type="button"
          onClick={() => onTabChange("itinerary")}
          className={`flex min-h-[38px] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors lg:min-w-[8rem] ${
            activeTab === "itinerary"
              ? "bg-[rgba(230,106,63,0.96)] text-white"
              : "text-[rgba(109,74,52,0.82)] hover:bg-[rgba(247,239,230,0.92)]"
          }`}
        >
          <Calendar size={15} />
          Itinerary
        </button>
        <button
          type="button"
          onClick={() => onTabChange("notes")}
          className={`flex min-h-[38px] flex-1 items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors lg:min-w-[8rem] ${
            activeTab === "notes"
              ? "bg-[rgba(230,106,63,0.96)] text-white"
              : "text-[rgba(109,74,52,0.82)] hover:bg-[rgba(247,239,230,0.92)]"
          }`}
        >
          <NotebookPen size={15} />
          Notes
        </button>
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
}) => (
  <section className="space-y-5">
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
              value={dayPlan.notes || ""}
              onChange={(event) =>
                onUpdateDayReflection(dayIndex, {
                  mood: dayPlan.mood,
                  notes: event.target.value,
                })
              }
              placeholder="What surprised you, what you loved, what you would skip, what the day felt like..."
              className="mt-2 min-h-[9rem] w-full resize-y border border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] px-4 py-3 text-sm leading-6 text-[rgba(74,43,26,0.95)] outline-none transition-colors placeholder:text-[rgba(150,112,82,0.52)] focus:border-[rgba(223,147,93,0.92)]"
            />
          </div>
        </Surface>
      ))}
    </div>
  </section>
);

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
            ? MOOD_OPTION_LOOKUP.get(day.mood)
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
                  tone="neutral"
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
