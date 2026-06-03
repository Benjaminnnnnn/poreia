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
import { AnimatePresence, motion } from "framer-motion";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Calendar, Wallet } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useMediaQuery } from "@/shared/lib/useMediaQuery";
import { ResolvedActivityImage } from "@/entities/activity/api/activityImageService";
import { Activity, BudgetBreakdown, DayPlan } from "@/shared/types";
import Surface from "@/shared/ui/Surface";
import { ActivityDragOverlayCard, SortableActivityItem } from "./ActivityItem";
import { COLORS, DAY_MARKER_COLORS } from "./constants";

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
    id="itinerary-section-cost-breakdown"
    data-itinerary-section="cost-breakdown"
    variant="glass"
    radius="2xl"
    padding="none"
    className="scroll-mt-24 shadow-2xl overflow-hidden"
  >
    <div className="p-5 pb-4">
      <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/90 drop-shadow-md">
        <Wallet size={16} />{" "}
        {hasRecordedCosts ? "Recorded Spend by Day" : "Budget Allocation"}
      </h3>
      <p className="text-sm leading-6 text-white/75 drop-shadow-sm">
        {breakdown.length
          ? "Use this as a quick sense-check before you keep refining the route."
          : "Add or adjust costs on activities to make the budget picture more useful."}
      </p>
    </div>

    {breakdown.length ? (
      <>
        <div
          className="px-5 h-48 w-full sm:h-56"
          style={{ marginTop: "-0.5rem" }}
        >
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
                {breakdown.map((entry, index) => (
                  <Cell
                    key={entry.category}
                    fill={COLORS[index % COLORS.length]}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `${currency}${value}`}
                contentStyle={{
                  borderRadius: "12px",
                  background: "rgba(255, 255, 255, 0.15)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  boxShadow:
                    "0 8px 32px rgba(0, 0, 0, 0.4)",
                  backdropFilter: "blur(12px)",
                  fontSize: "14px",
                }}
                labelStyle={{
                  color: "rgba(255, 255, 255, 0.95)",
                  fontWeight: 600,
                }}
                itemStyle={{
                  color: "rgba(255, 255, 255, 0.9)",
                }}
                wrapperStyle={{
                  outline: "none",
                }}
                cursor={{ fill: "rgba(255, 255, 255, 0.08)" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid gap-2 px-5 pb-5 sm:grid-cols-2">
          {breakdown.map((entry, index) => (
            <div
              key={entry.category}
              className="flex items-center justify-between rounded-[1rem] border border-white/15 bg-white/10 backdrop-blur-sm px-3 py-2.5"
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-white/85">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                {entry.category}
              </span>
              <span className="text-sm font-semibold text-white/90 drop-shadow-sm">
                {currency}
                {entry.amount}
              </span>
            </div>
          ))}
        </div>
      </>
    ) : (
      <div className="px-5 py-6 text-center text-sm leading-6 text-white/65 border-t border-white/10">
        No budget details yet.
      </div>
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
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white/90 drop-shadow-md">
          <Calendar size={16} /> Daily Plan
        </h3>
        <p className="mt-2 text-sm leading-6 text-white/75 drop-shadow-sm">
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
        <div className="relative space-y-6 md:space-y-7 md:border-l md:border-white/20 md:pl-4">
          {days.map((dayPlan, dayIndex) => (
            <div
              key={dayPlan.day}
              id={`itinerary-section-day-${dayPlan.day}`}
              data-itinerary-section={`day-${dayPlan.day}`}
              className="relative scroll-mt-24"
            >
              <div
                className="absolute -left-[18px] top-1 hidden h-2.5 w-2.5 rounded-full ring-4 ring-white/20 md:block shadow-lg"
                style={{
                  backgroundColor:
                    DAY_MARKER_COLORS[
                      (dayPlan.day - 1) % DAY_MARKER_COLORS.length
                    ],
                  boxShadow: `0 0 12px ${DAY_MARKER_COLORS[(dayPlan.day - 1) % DAY_MARKER_COLORS.length]}40`,
                }}
              />

              <div className="mb-4 border-b border-white/10 pb-3 md:border-b-0 md:pb-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/60 drop-shadow-sm">
                  Day {dayPlan.day}
                </p>
                <h4 className="mt-1 text-lg font-bold text-white drop-shadow-md">
                  {dayPlan.theme}
                </h4>
                <p className="mt-1 text-sm text-white/70 drop-shadow-sm">
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
                  <AnimatePresence initial={false}>
                    {dayPlan.activities.map((activity) => (
                      <motion.div
                        key={activity.id}
                        exit={{ opacity: 0, x: -10, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <SortableActivityItem
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
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {dayPlan.activities.length === 0 ? (
                    <div className="border-2 border-dashed border-white/20 rounded-[1rem] px-4 py-5 text-center text-sm leading-6 text-white/65 backdrop-blur-sm">
                      Drop a stop here to rebalance the day.
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
      <Surface
        as="section"
        id="itinerary-section-overview"
        data-itinerary-section="overview"
        variant="glass"
        radius="2xl"
        padding="none"
        className="h-full scroll-mt-24 shadow-2xl"
      >
        <div className="p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/90 drop-shadow-md">
            Overview
          </h3>
          <p className="max-w-[66ch] text-sm leading-7 text-white/80 drop-shadow-sm md:text-base">
            {overview}
          </p>
        </div>
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
