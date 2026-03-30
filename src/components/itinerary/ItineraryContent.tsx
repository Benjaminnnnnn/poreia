import React, { ComponentProps } from "react";
import { createPortal } from "react-dom";
import { BookText, Calendar, NotebookPen, Wallet } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  closestCorners,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ResolvedActivityImage } from "../../services/activityImageService";
import { Activity, BudgetBreakdown, DayPlan, TravelItinerary } from "../../types";
import {
  COLORS,
  MOOD_OPTIONS,
  MOOD_OPTION_LOOKUP,
  WorkspaceTab,
} from "./constants";
import {
  ActivityDragOverlayCard,
  SortableActivityItem,
} from "./ActivityItem";

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
          <span className="rounded-[0.35rem] border border-[rgba(237,170,118,0.38)] bg-[rgba(255,249,243,0.92)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(217,102,58,0.96)]">
            {totalDays} Days
          </span>
          <span className="rounded-[0.35rem] border border-[rgba(237,170,118,0.38)] bg-[rgba(255,249,243,0.92)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(217,102,58,0.96)]">
            {currency}
            {totalBudget.toLocaleString()} Total
          </span>
          {journaledDaysCount ? (
            <span className="rounded-[0.35rem] border border-[rgba(110,160,154,0.32)] bg-[rgba(233,245,242,0.96)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(55,128,121,0.96)]">
              {journaledDaysCount} journaled
            </span>
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

export const BudgetChartCard: React.FC<{
  breakdown: BudgetBreakdown[];
  currency: string;
  hasRecordedCosts: boolean;
}> = ({ breakdown, currency, hasRecordedCosts }) => (
  <section className="rounded-[0.7rem] border border-[rgba(232,222,211,0.96)] bg-[rgba(255,251,246,0.96)] p-4 shadow-[0_12px_24px_rgba(108,62,26,0.04)]">
    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
      <Wallet size={16} />{" "}
      {hasRecordedCosts ? "Recorded Spend by Day" : "Budget Allocation"}
    </h3>
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={breakdown}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={70}
            paddingAngle={5}
            dataKey="amount"
          >
            {breakdown.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${currency}${value}`}
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
          <Legend iconType="circle" verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </section>
);

interface DailyPlanSectionProps {
  activeActivity: Activity | null;
  activeActivityImage?: string;
  activityImages: Record<string, ResolvedActivityImage>;
  currency: string;
  days: DayPlan[];
  onDeleteActivity: (dayIndex: number, activityId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragStart: (event: DragStartEvent) => void;
  onSaveActivity: (dayIndex: number, activity: Activity) => void;
  onSelectActivity: (activityId: string) => void;
  selectedActivityId?: string;
  sensors: ComponentProps<typeof DndContext>["sensors"];
}

export const DailyPlanSection: React.FC<DailyPlanSectionProps> = ({
  activeActivity,
  activeActivityImage,
  activityImages,
  currency,
  days,
  onDeleteActivity,
  onDragEnd,
  onDragOver,
  onDragStart,
  onSaveActivity,
  onSelectActivity,
  selectedActivityId,
  sensors,
}) => (
  <section className="space-y-6">
    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
      <Calendar size={16} /> Daily Plan
    </h3>

    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="relative space-y-6 md:space-y-7 md:border-l md:border-[rgba(239,215,193,0.92)] md:pl-4">
        {days.map((dayPlan, dayIndex) => (
          <div key={dayPlan.day} className="relative">
            <div className="absolute -left-[18px] top-1 hidden h-2.5 w-2.5 rounded-full bg-[rgba(230,106,63,1)] ring-4 ring-white md:block" />

            <div className="mb-4 border-b border-[rgba(239,215,193,0.72)] pb-3 md:border-b-0 md:pb-0">
              <h4 className="text-lg font-bold text-[rgba(74,43,26,0.96)]">
                Day {dayPlan.day}: {dayPlan.theme}
              </h4>
            </div>

            <SortableContext
              id={`day-${dayPlan.day}`}
              items={dayPlan.activities.map((activity) => activity.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-h-[50px] space-y-4">
                {dayPlan.activities.map((activity) => (
                  <SortableActivityItem
                    key={activity.id}
                    activity={activity}
                    currency={currency}
                    imageUrl={activityImages[activity.id]?.url}
                    onDelete={() => onDeleteActivity(dayIndex, activity.id)}
                    onSave={(newActivity) => onSaveActivity(dayIndex, newActivity)}
                    onClick={() => onSelectActivity(activity.id)}
                    isSelected={selectedActivityId === activity.id}
                  />
                ))}
                {dayPlan.activities.length === 0 ? (
                  <div className="rounded-[0.7rem] border-2 border-dashed border-[rgba(239,215,193,0.92)] py-4 text-center text-sm text-[rgba(120,83,58,0.62)]">
                    Drop items here
                  </div>
                ) : null}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <DragOverlay
              dropAnimation={{
                duration: 180,
                easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                sideEffects: defaultDropAnimationSideEffects({
                  styles: { active: { opacity: "0.5" } },
                }),
              }}
            >
              {activeActivity ? (
                <ActivityDragOverlayCard
                  activity={activeActivity}
                  currency={currency}
                  imageUrl={activeActivityImage}
                />
              ) : null}
            </DragOverlay>,
            document.body,
          )
        : null}
    </DndContext>
  </section>
);

interface ItineraryPlanViewProps {
  activeActivity: Activity | null;
  activeActivityImage?: string;
  activityImages: Record<string, ResolvedActivityImage>;
  budgetBreakdown: BudgetBreakdown[];
  currency: string;
  days: DayPlan[];
  hasRecordedCosts: boolean;
  onDeleteActivity: (dayIndex: number, activityId: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragStart: (event: DragStartEvent) => void;
  onSaveActivity: (dayIndex: number, activity: Activity) => void;
  onSelectActivity: (activityId: string) => void;
  overview: string;
  selectedActivityId?: string;
  sensors: ComponentProps<typeof DndContext>["sensors"];
}

export const ItineraryPlanView: React.FC<ItineraryPlanViewProps> = ({
  activeActivity,
  activeActivityImage,
  activityImages,
  budgetBreakdown,
  currency,
  days,
  hasRecordedCosts,
  onDeleteActivity,
  onDragEnd,
  onDragOver,
  onDragStart,
  onSaveActivity,
  onSelectActivity,
  overview,
  selectedActivityId,
  sensors,
}) => (
  <>
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
        Overview
      </h3>
      <p className="text-sm leading-relaxed text-[rgba(93,61,40,0.88)] md:text-base">
        {overview}
      </p>
    </section>

    <BudgetChartCard
      breakdown={budgetBreakdown}
      currency={currency}
      hasRecordedCosts={hasRecordedCosts}
    />

    <DailyPlanSection
      activeActivity={activeActivity}
      activeActivityImage={activeActivityImage}
      activityImages={activityImages}
      currency={currency}
      days={days}
      onDeleteActivity={onDeleteActivity}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragStart={onDragStart}
      onSaveActivity={onSaveActivity}
      onSelectActivity={onSelectActivity}
      selectedActivityId={selectedActivityId}
      sensors={sensors}
    />
  </>
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
        </section>
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
                      : "border-[rgba(236,220,204,0.96)] bg-[rgba(255,252,248,0.92)] text-[rgba(102,68,47,0.82)]"
                  }`}
                >
                  {day.mood || "No mood yet"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
