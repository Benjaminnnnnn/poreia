
import React, { useState, useEffect, useMemo } from 'react';
import { TravelItinerary, DayPlan, Activity, MapPinData } from '../types';
import { Calendar, Clock, MapPin, DollarSign, Wallet, GripVertical, Trash2, Pencil, X, Check, Plus, ImageIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import WorldMap from './WorldMap';
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

const COLORS = ['#0ea5e9', '#22d3ee', '#f97316', '#facc15', '#14b8a6', '#fb7185'];

// --- Helper to get image URL ---
const getActivityImageUrl = (prompt?: string, seed?: string) => {
    if (!prompt) return null;
    const encodedPrompt = encodeURIComponent(prompt);
    // Using pollinations.ai for dynamic AI images based on the prompt
    // Adding nologo and limiting size for performance
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=300&height=300&nologo=true&seed=${seed || '1'}`;
};

// --- Activity Card Component (Shared for Sortable & Overlay) ---
interface ActivityCardProps {
    activity: Activity;
    currency: string;
    isOverlay?: boolean;
    dragProps?: any;
    onEdit?: () => void;
    onDelete?: () => void;
    onClick?: () => void;
    isActive?: boolean;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ 
    activity, 
    currency, 
    isOverlay, 
    dragProps, 
    onEdit, 
    onDelete,
    onClick,
    isActive
}) => {
    const imageUrl = useMemo(() => getActivityImageUrl(activity.img_prompt, activity.id), [activity.img_prompt, activity.id]);

    return (
        <div 
            {...dragProps}
            onClick={onClick}
            className={`
            relative rounded-2xl bg-white/92 p-3 border transition-all group shadow-[0_18px_40px_rgba(8,47,73,0.06)]
            ${isOverlay 
                ? 'border-sky-400 shadow-2xl scale-105 rotate-2 cursor-grabbing' 
                : isActive 
                    ? 'border-sky-300 ring-2 ring-sky-200 shadow-lg cursor-grab active:cursor-grabbing touch-none'
                    : 'border-white hover:border-orange-200 hover:shadow-lg cursor-grab active:cursor-grabbing touch-none'
            }
        `}>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-sky-200 z-10 pointer-events-none">
                <GripVertical size={18} />
            </div>

            {/* Content Container */}
            <div className="pl-10 pr-8 flex gap-3 items-start">
                
                {/* Image Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-sky-50 rounded-xl overflow-hidden border border-sky-100 relative">
                   {imageUrl ? (
                       <img 
                            src={imageUrl} 
                            alt={activity.description} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                       />
                   ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300">
                           <ImageIcon size={20} />
                       </div>
                   )}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-2 mb-1">
                        <div className="flex items-center gap-1.5 text-sky-700 font-medium text-xs">
                            <Clock size={12} />
                            {activity.time}
                        </div>
                        {activity.costEstimate !== undefined && activity.costEstimate > 0 && (
                            <div className="flex items-center gap-1 text-orange-600 font-bold text-[10px] bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                <DollarSign size={10} />
                                {currency}{activity.costEstimate}
                            </div>
                        )}
                    </div>
                    <p className="text-sky-950 font-semibold text-sm leading-snug mb-1.5 line-clamp-2">{activity.description}</p>
                    <div className="flex items-center gap-1 text-sky-800/55 text-xs truncate">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{activity.location}</span>
                    </div>
                </div>
            </div>

            {/* Actions (Hidden in overlay) */}
            {!isOverlay && onEdit && onDelete && (
                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors" title="Edit">
                        <Pencil size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};


// --- Sortable Activity Item Component ---
interface SortableActivityItemProps {
  activity: Activity;
  currency: string;
  onDelete: () => void;
  onSave: (newActivity: Activity) => void;
  onClick: () => void;
  isActive: boolean;
}

const SortableActivityItem: React.FC<SortableActivityItemProps> = ({ activity, currency, onDelete, onSave, onClick, isActive }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Activity>({ ...activity });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: activity.id, disabled: isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

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
        className="space-y-3 rounded-2xl border-2 border-sky-400 bg-white p-4 shadow-lg"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Time</label>
            <input 
              className="w-full rounded-xl border bg-slate-50 p-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
              value={editForm.time}
              onChange={e => setEditForm({...editForm, time: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Cost ({currency})</label>
            <input 
              type="number"
              className="w-full rounded-xl border bg-slate-50 p-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
              value={editForm.costEstimate || ''}
              onChange={e => setEditForm({...editForm, costEstimate: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>
        <div>
           <label className="text-xs font-semibold text-slate-500">Activity</label>
           <input 
              className="w-full rounded-xl border bg-slate-50 p-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-sky-200" 
              value={editForm.description}
              onChange={e => setEditForm({...editForm, description: e.target.value})}
            />
        </div>
        <div>
           <label className="text-xs font-semibold text-slate-500">Location</label>
           <input 
              className="w-full rounded-xl border bg-slate-50 p-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
              value={editForm.location}
              onChange={e => setEditForm({...editForm, location: e.target.value})}
            />
        </div>
        {/* Img Prompt Edit - Optional but good to see */}
        <div>
           <label className="text-xs font-semibold text-slate-500">Image Description (AI)</label>
           <input 
              className="w-full rounded-xl border bg-slate-50 p-1.5 text-sm outline-none focus:ring-2 focus:ring-sky-200" 
              value={editForm.img_prompt || ''}
              onChange={e => setEditForm({...editForm, img_prompt: e.target.value})}
            />
        </div>

        <div className="flex justify-end gap-2 pt-2">
           <button onClick={handleCancel} className="rounded-xl p-1.5 text-slate-500 hover:bg-slate-100"><X size={16}/></button>
           <button onClick={handleSave} className="rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 p-1.5 text-white hover:brightness-105"><Check size={16}/></button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
        <ActivityCard 
            activity={activity} 
            currency={currency} 
            onEdit={() => setIsEditing(true)}
            onDelete={onDelete}
            onClick={onClick}
            isActive={isActive}
            dragProps={{...attributes, ...listeners}}
        />
    </div>
  );
};

// --- Main Itinerary Component ---
const ItineraryResult: React.FC<ItineraryResultProps> = ({ itinerary, className = "", onUpdate }) => {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string | undefined>();
  const [localItinerary, setLocalItinerary] = useState<TravelItinerary>(itinerary);

  useEffect(() => {
    if (!activeDragId) {
        setLocalItinerary(itinerary);
    }
  }, [itinerary, activeDragId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Generate pins for the map
  const mapPins = useMemo(() => {
    const pins: MapPinData[] = [];
    localItinerary.days.forEach(day => {
        day.activities.forEach(act => {
            if (act.lat && act.lng) {
                pins.push({
                    id: act.id,
                    name: act.location,
                    description: act.description,
                    lat: act.lat,
                    lng: act.lng,
                    image: getActivityImageUrl(act.img_prompt, act.id) || undefined
                });
            }
        });
    });
    return pins;
  }, [localItinerary]);

  const findDayContainer = (id: string, currentItin: TravelItinerary): number | undefined => {
    const day = currentItin.days.find(d => d.activities.some(a => a.id === id));
    return day?.day;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeDayNum = findDayContainer(activeId, localItinerary);
    let overDayNum = findDayContainer(overId, localItinerary);

    if (!overDayNum) {
        const match = overId.match(/^day-(\d+)$/);
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

    const activeDayNum = findDayContainer(activeIdVal, localItinerary);
    let overDayNum = findDayContainer(overIdVal, localItinerary);
    
    if (!overDayNum && overIdVal.match(/^day-(\d+)$/)) {
        overDayNum = parseInt(overIdVal.match(/^day-(\d+)$/)![1]);
    }

    if (activeDayNum && overDayNum) {
        const activeDayIdx = localItinerary.days.findIndex(d => d.day === activeDayNum);
        const overDayIdx = localItinerary.days.findIndex(d => d.day === overDayNum);

        const activeIndex = localItinerary.days[activeDayIdx].activities.findIndex(a => a.id === activeIdVal);
        const overIndex = localItinerary.days[overDayIdx].activities.findIndex(a => a.id === overIdVal);

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

  const activeActivity = activeDragId 
    ? localItinerary.days.flatMap(d => d.activities).find(a => a.id === activeDragId) 
    : null;

  return (
    <div className={`w-full bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(240,249,255,0.9))] flex flex-col lg:flex-row overflow-hidden ${className}`}>
        
        {/* LEFT COLUMN: Scrollable Itinerary List */}
        <div className="z-20 h-full flex-1 overflow-y-auto overflow-x-hidden bg-white/88 relative shadow-xl backdrop-blur-xl">
            {/* Header Image/Gradient */}
            <div className="relative h-52 shrink-0 overflow-hidden bg-gradient-to-br from-sky-500 via-cyan-400 to-orange-400">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_24%),linear-gradient(to_top,rgba(8,47,73,0.58),rgba(8,47,73,0.12),transparent)]" />
                <div className="absolute bottom-6 left-6 pr-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm shadow-sm">
                        {localItinerary.totalDays} Days
                        </span>
                        <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm shadow-sm">
                        {localItinerary.currency}{localItinerary.totalBudget.toLocaleString()} Total
                        </span>
                    </div>
                    <h2 className="font-display text-2xl font-bold text-white drop-shadow-sm md:text-4xl">{localItinerary.destination}</h2>
                    <p className="mt-1 max-w-md line-clamp-2 text-sm text-sky-50 drop-shadow-sm">{localItinerary.title}</p>
                </div>
            </div>

            <div className="p-4 md:p-6 space-y-8 pb-32">
                {/* Overview */}
                <section>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-sky-700/60">Overview</h3>
                    <p className="text-sm leading-relaxed text-slate-700 md:text-base">
                    {localItinerary.overview}
                    </p>
                </section>

                {/* Budget Breakdown */}
                <section className="rounded-[1.75rem] border border-white bg-[linear-gradient(180deg,#ffffff,rgba(240,249,255,0.95))] p-4 shadow-[0_20px_50px_rgba(8,47,73,0.06)]">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sky-700/60">
                        <Wallet size={16} /> Budget Allocation
                    </h3>
                    <div className="h-56 w-full">
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

                {/* Daily Itinerary - Draggable */}
                <section className="space-y-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-sky-700/60">
                        <Calendar size={16} /> Daily Plan
                    </h3>
                    
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="relative space-y-8 border-l-2 border-sky-100 pl-4">
                        {localItinerary.days.map((dayPlan, dayIndex) => (
                            <div key={dayPlan.day} className="relative">
                            {/* Timeline Dot */}
                            <div className="absolute -left-[21px] top-0 h-3 w-3 rounded-full bg-orange-400 ring-4 ring-white" />
                            
                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-sky-950">Day {dayPlan.day}: {dayPlan.theme}</h4>
                            </div>

                            {/* Droppable Area for Day */}
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
                                        onDelete={() => handleDeleteActivity(dayIndex, activity.id)}
                                        onSave={(newAct) => handleSaveActivity(dayIndex, newAct)}
                                        onClick={() => setSelectedActivityId(activity.id)}
                                        isActive={selectedActivityId === activity.id}
                                    />
                                    ))}
                                    {dayPlan.activities.length === 0 && (
                                        <div className="rounded-2xl border-2 border-dashed border-sky-100 py-4 text-center text-sm text-sky-700/50">
                                            Drop items here
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                            </div>
                        ))}
                        </div>
                        
                        {/* Drag Overlay for smooth visual */}
                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }) }}>
                        {activeActivity ? (
                            <ActivityCard 
                                activity={activeActivity}
                                currency={localItinerary.currency}
                                isOverlay
                            />
                        ) : null}
                        </DragOverlay>
                    </DndContext>
                </section>
            </div>
        </div>

        {/* RIGHT COLUMN: Interactive Map */}
        <div className="hidden lg:block w-[55%] h-full relative z-10">
            <WorldMap 
                pins={mapPins} 
                onPinClick={(pin) => setSelectedActivityId(pin.id)} 
                selectedPinId={selectedActivityId}
                className="w-full h-full"
            />
        </div>

    </div>
  );
};

export default ItineraryResult;
