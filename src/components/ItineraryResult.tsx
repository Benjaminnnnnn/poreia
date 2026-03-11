
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
            relative bg-white rounded-xl p-3 border transition-all group
            ${isOverlay 
                ? 'border-blue-500 shadow-2xl scale-105 rotate-2 cursor-grabbing' 
                : isActive 
                    ? 'border-blue-500 ring-1 ring-blue-500 shadow-md cursor-grab active:cursor-grabbing touch-none'
                    : 'border-slate-100 hover:border-blue-300 hover:shadow-md cursor-grab active:cursor-grabbing touch-none'
            }
        `}>
            <div className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-slate-300 z-10 pointer-events-none">
                <GripVertical size={18} />
            </div>

            {/* Content Container */}
            <div className="pl-10 pr-8 flex gap-3 items-start">
                
                {/* Image Thumbnail */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-slate-100 rounded-lg overflow-hidden border border-slate-100 relative">
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
                        <div className="flex items-center gap-1.5 text-blue-600 font-medium text-xs">
                            <Clock size={12} />
                            {activity.time}
                        </div>
                        {activity.costEstimate !== undefined && activity.costEstimate > 0 && (
                            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                <DollarSign size={10} />
                                {currency}{activity.costEstimate}
                            </div>
                        )}
                    </div>
                    <p className="text-slate-800 font-semibold text-sm leading-snug mb-1.5 line-clamp-2">{activity.description}</p>
                    <div className="flex items-center gap-1 text-slate-400 text-xs truncate">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{activity.location}</span>
                    </div>
                </div>
            </div>

            {/* Actions (Hidden in overlay) */}
            {!isOverlay && onEdit && onDelete && (
                <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                        <Pencil size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Delete">
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
        className="bg-white rounded-xl p-4 border-2 border-blue-500 shadow-lg space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500">Time</label>
            <input 
              className="w-full text-sm p-1.5 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none" 
              value={editForm.time}
              onChange={e => setEditForm({...editForm, time: e.target.value})}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500">Cost ({currency})</label>
            <input 
              type="number"
              className="w-full text-sm p-1.5 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none" 
              value={editForm.costEstimate || ''}
              onChange={e => setEditForm({...editForm, costEstimate: parseFloat(e.target.value) || 0})}
            />
          </div>
        </div>
        <div>
           <label className="text-xs font-semibold text-slate-500">Activity</label>
           <input 
              className="w-full text-sm p-1.5 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none font-medium" 
              value={editForm.description}
              onChange={e => setEditForm({...editForm, description: e.target.value})}
            />
        </div>
        <div>
           <label className="text-xs font-semibold text-slate-500">Location</label>
           <input 
              className="w-full text-sm p-1.5 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none" 
              value={editForm.location}
              onChange={e => setEditForm({...editForm, location: e.target.value})}
            />
        </div>
        {/* Img Prompt Edit - Optional but good to see */}
        <div>
           <label className="text-xs font-semibold text-slate-500">Image Description (AI)</label>
           <input 
              className="w-full text-sm p-1.5 border rounded bg-slate-50 focus:ring-2 focus:ring-blue-200 outline-none" 
              value={editForm.img_prompt || ''}
              onChange={e => setEditForm({...editForm, img_prompt: e.target.value})}
            />
        </div>

        <div className="flex justify-end gap-2 pt-2">
           <button onClick={handleCancel} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><X size={16}/></button>
           <button onClick={handleSave} className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"><Check size={16}/></button>
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
    <div className={`w-full bg-slate-50 flex flex-col lg:flex-row overflow-hidden ${className}`}>
        
        {/* LEFT COLUMN: Scrollable Itinerary List */}
        <div className="flex-1 h-full overflow-y-auto overflow-x-hidden bg-white relative shadow-xl z-20">
            {/* Header Image/Gradient */}
            <div className="h-48 bg-gradient-to-br from-blue-500 via-indigo-600 to-slate-800 relative shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-6 left-6 pr-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                        <span className="px-2 py-1 bg-slate-950/35 text-slate-50 backdrop-blur-sm rounded-md text-xs font-semibold shadow-sm">
                        {localItinerary.totalDays} Days
                        </span>
                        <span className="px-2 py-1 bg-slate-950/35 text-slate-50 backdrop-blur-sm rounded-md text-xs font-semibold shadow-sm">
                        {localItinerary.currency}{localItinerary.totalBudget.toLocaleString()} Total
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">{localItinerary.destination}</h2>
                    <p className="text-slate-100 text-sm mt-1 max-w-md line-clamp-2 drop-shadow-sm">{localItinerary.title}</p>
                </div>
            </div>

            <div className="p-4 md:p-6 space-y-8 pb-32">
                {/* Overview */}
                <section>
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-3">Overview</h3>
                    <p className="text-slate-600 leading-relaxed text-sm md:text-base">
                    {localItinerary.overview}
                    </p>
                </section>

                {/* Budget Breakdown */}
                <section className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold mb-4 flex items-center gap-2">
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
                    <h3 className="text-sm uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-2">
                        <Calendar size={16} /> Daily Plan
                    </h3>
                    
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                        {localItinerary.days.map((dayPlan, dayIndex) => (
                            <div key={dayPlan.day} className="relative">
                            {/* Timeline Dot */}
                            <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-white" />
                            
                            <div className="mb-4">
                                <h4 className="text-lg font-bold text-slate-800">Day {dayPlan.day}: {dayPlan.theme}</h4>
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
                                        <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
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
