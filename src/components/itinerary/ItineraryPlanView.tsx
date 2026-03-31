import React from "react";
import { createPortal } from "react-dom";
import { Calendar, Wallet } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  Cell,
  Legend,
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

const BudgetChartCard: React.FC<{
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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
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
                      image={activityImages[activity.id]}
                      onDelete={() => onDeleteActivity(dayIndex, activity.id)}
                      onSave={(newActivity) =>
                        onSaveActivity(dayIndex, newActivity)
                      }
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
    />
  </>
);

export default ItineraryPlanView;
