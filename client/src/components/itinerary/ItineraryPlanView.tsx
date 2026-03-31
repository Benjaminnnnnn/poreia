import React from "react";
import { createPortal } from "react-dom";
import { Calendar, Wallet } from "lucide-react";
import {
  type MouseSensorOptions,
  type TouchSensorOptions,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ResolvedActivityImage } from "../../services/activityImageService";
import { Activity, BudgetBreakdown, DayPlan } from "../../types";
import { COLORS } from "./constants";
import {
  ActivityDragOverlayCard,
  SortableActivityItem,
} from "./ActivityItem";
import Surface from "../ui/Surface";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const DRAG_HANDLE_SELECTOR = "[data-drag-handle='true']";
const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

const startedFromDragHandle = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest(DRAG_HANDLE_SELECTOR));

class HandleOnlyMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: (
        { nativeEvent: event }: React.MouseEvent,
        { onActivation }: MouseSensorOptions,
      ) => {
        if (event.button !== 0 || !startedFromDragHandle(event.target)) {
          return false;
        }

        onActivation?.({ event });
        return true;
      },
    },
  ];
}

class HandleOnlyTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: (
        { nativeEvent: event }: React.TouchEvent,
        { onActivation }: TouchSensorOptions,
      ) => {
        if (event.touches.length > 1 || !startedFromDragHandle(event.target)) {
          return false;
        }

        onActivation?.({ event });
        return true;
      },
    },
  ];
}

const BudgetChartCard: React.FC<{
  breakdown: BudgetBreakdown[];
  currency: string;
  hasRecordedCosts: boolean;
}> = ({ breakdown, currency, hasRecordedCosts }) => (
  <Surface
    as="section"
    variant="card"
    radius="md"
    className="shadow-[0_12px_24px_rgba(108,62,26,0.04)]"
  >
    <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
      <Wallet size={16} />{" "}
      {hasRecordedCosts ? "Recorded Spend by Day" : "Budget Allocation"}
    </h3>
    <p className="text-sm leading-6 text-[rgba(108,72,49,0.78)]">
      {breakdown.length
        ? "Use this as a quick sense-check before you keep refining the route."
        : "Add or adjust costs on activities to make the budget picture more useful."}
    </p>

    {breakdown.length ? (
      <>
        <div className="mt-4 h-48 w-full sm:h-56">
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
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${currency}${value}`}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid rgba(234, 221, 207, 0.96)",
                  background: "rgba(255, 251, 246, 0.96)",
                  color: "rgba(74, 43, 26, 0.96)",
                  boxShadow: "0 14px 30px rgba(108, 62, 26, 0.08)",
                }}
                cursor={{ fill: "rgba(255, 248, 240, 0.7)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {breakdown.map((entry, index) => (
            <div
              key={entry.category}
              className="flex items-center justify-between rounded-[0.8rem] border border-[rgba(236,223,209,0.96)] bg-[rgba(255,252,248,0.9)] px-3 py-2.5"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[rgba(96,63,42,0.84)]">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {entry.category}
              </span>
              <span className="text-sm font-semibold text-[rgba(74,43,26,0.96)]">
                {currency}
                {entry.amount}
              </span>
            </div>
          ))}
        </div>
      </>
    ) : (
      <Surface
        as="div"
        variant="dashed"
        padding="none"
        radius="md"
        className="mt-4 px-4 py-6 text-center text-sm leading-6 text-[rgba(120,83,58,0.68)]"
      >
        No budget details yet.
      </Surface>
    )}
  </Surface>
);

interface DailyPlanSectionProps {
  activeActivity: Activity | null;
  activeActivityImage?: ResolvedActivityImage;
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
}

const DailyPlanSection: React.FC<DailyPlanSectionProps> = ({
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
}) => {
  const isMobileViewport = useMediaQuery(MOBILE_MEDIA_QUERY);
  const sensors = useSensors(
    isMobileViewport
      ? useSensor(HandleOnlyMouseSensor, {
          activationConstraint: { distance: 6 },
        })
      : useSensor(MouseSensor, {
          activationConstraint: { distance: 8 },
        }),
    isMobileViewport
      ? useSensor(HandleOnlyTouchSensor, {
          activationConstraint: { delay: 140, tolerance: 12 },
        })
      : useSensor(TouchSensor, {
          activationConstraint: { delay: 140, tolerance: 12 },
        }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <section className="space-y-6">
      <div className="max-w-2xl">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
          <Calendar size={16} /> Daily Plan
        </h3>
        <p className="mt-2 text-sm leading-6 text-[rgba(108,72,49,0.78)]">
          Drag activities into the right order, move them between days, and
          tighten the route until it feels effortless.
        </p>
      </div>

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
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,82,54,0.68)]">
                  Day {dayPlan.day}
                </p>
                <h4 className="mt-1 text-lg font-bold text-[rgba(74,43,26,0.96)]">
                  Day {dayPlan.day}: {dayPlan.theme}
                </h4>
                <p className="mt-1 text-sm text-[rgba(108,72,49,0.72)]">
                  {dayPlan.activities.length} planned{" "}
                  {dayPlan.activities.length === 1 ? "stop" : "stops"}
                </p>
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
                      image={activityImages[activity.id]}
                      isHandleOnly={isMobileViewport}
                      onDelete={() => onDeleteActivity(dayIndex, activity.id)}
                      onSave={(newActivity) =>
                        onSaveActivity(dayIndex, newActivity)
                      }
                      onClick={() => onSelectActivity(activity.id)}
                      isSelected={selectedActivityId === activity.id}
                    />
                  ))}
                  {dayPlan.activities.length === 0 ? (
                    <Surface
                      as="div"
                      variant="dashed"
                      padding="none"
                      radius="md"
                      className="border-2 border-[rgba(239,215,193,0.92)] px-4 py-5 text-center text-sm leading-6 text-[rgba(120,83,58,0.68)]"
                    >
                      Drop a stop here to rebalance the day.
                    </Surface>
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
                    image={activeActivityImage}
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )
          : null}
      </DndContext>
    </section>
  );
};

interface ItineraryPlanViewProps {
  activeActivity: Activity | null;
  activeActivityImage?: ResolvedActivityImage;
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
}

const ItineraryPlanView: React.FC<ItineraryPlanViewProps> = ({
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
}) => (
  <>
    <div className="flex flex-col gap-4">
      <Surface as="section" variant="subtle" radius="md" className="h-full">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[rgba(120,83,58,0.72)]">
          Overview
        </h3>
        <p className="max-w-[66ch] text-sm leading-7 text-[rgba(93,61,40,0.88)] md:text-base">
          {overview}
        </p>
      </Surface>

      <BudgetChartCard
        breakdown={budgetBreakdown}
        currency={currency}
        hasRecordedCosts={hasRecordedCosts}
      />
    </div>

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
    />
  </>
);

export default ItineraryPlanView;
