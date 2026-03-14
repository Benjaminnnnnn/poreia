import {
  Compass,
  History,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
} from "lucide-react";
import React from "react";
import { TripSession } from "../types";

interface SidebarProps {
  trips: TripSession[];
  isOpen: boolean;
  onToggle: () => void;
  onDeleteTrip: (id: string) => void;
  activeTripId: string | null;
  onNavigate: (tripId: string | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  trips,
  isOpen,
  onToggle,
  onDeleteTrip,
  activeTripId,
  onNavigate,
}) => {
  const handleNewChat = () => {
    onNavigate(null); // Navigate to home
    if (window.innerWidth < 768) {
      onToggle(); // Close sidebar on mobile
    }
  };

  const handleTripClick = (id: string) => {
    onNavigate(id);
    if (window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,249,255,0.88)_58%,rgba(255,247,237,0.88))] backdrop-blur-2xl border-r border-white/55 shadow-2xl shadow-sky-950/10 transition-all duration-300 ease-in-out
        md:relative md:shadow-none
        ${isOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:w-20 md:translate-x-0"}
      `}
    >
      {/* --- Header: Logo & Toggle --- */}
      <div
        className={`relative flex items-center h-16 shrink-0 px-4 transition-all duration-300 ${isOpen ? "justify-between" : "justify-center"} group/header`}
      >
        {/* Logo Section */}
        <div className={`flex items-center gap-3 overflow-hidden`}>
          {/* Logo Container with Overlay Logic */}
          <div className="relative w-10 h-10 shrink-0">
            {/* 1. The Colorful App Logo (Always visible in expanded, visible in collapsed until hover) */}
            <div
              className={`absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-400 to-orange-400 rounded-2xl flex items-center justify-center text-white transition-all duration-300
                    ${!isOpen ? "group-hover/header:opacity-0 group-hover/header:scale-90" : ""}
                `}
            >
              <Compass size={22} strokeWidth={2.5} />
            </div>

            {/* 2. The Open Button (Only in collapsed mode, overlays on hover) */}
            {!isOpen && (
              <button
                onClick={onToggle}
                className={`absolute inset-0 flex items-center justify-center bg-white text-sky-700 rounded-2xl
                            opacity-0 scale-90
                            group-hover/header:opacity-100 group-hover/header:scale-100
                            transition-all duration-300
                        `}
                title="Open Sidebar"
              >
                <PanelLeftOpen size={20} />
              </button>
            )}
          </div>

          {/* App Name (Only visible when open) */}
          <div
            className={`flex flex-col transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0 w-0 hidden"}`}
          >
            <h1 className="text-lg font-bold text-slate-900 leading-none">
              Poreia
            </h1>
            <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-[0.24em]">
              Travel Atelier
            </span>
          </div>
        </div>

        {/* Toggle Button (Only visible when open) */}
        {isOpen && (
          <button
            onClick={onToggle}
            className="p-2 text-slate-400 hover:text-sky-700 hover:bg-white rounded-xl transition-colors"
            title="Close sidebar"
          >
            <PanelLeftClose size={20} />
          </button>
        )}
      </div>

      {/* --- New Trip Button --- */}
      <div className="px-4 py-4 shrink-0">
        <button
          onClick={handleNewChat}
          className={`
            flex items-center gap-3 rounded-2xl bg-slate-950 text-white transition-all shadow-lg shadow-slate-950/20 hover:bg-slate-800
            ${isOpen ? "w-full px-4 py-3" : "w-12 h-12 justify-center mx-auto"}
          `}
          title="New Trip"
        >
          <Plus size={20} className="text-white" />
          {isOpen && <span className="text-sm font-medium text-white">New Trip</span>}
        </button>
      </div>

      {/* --- Trip History List --- */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-2">
        {/* Only show label if open */}
        {isOpen && (
          <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-wider flex items-center gap-2">
            <History size={12} className="text-sky-600" /> Recent Trips
          </div>
        )}

        {/* List Items */}
        {trips.map((trip) => {
          const isActive = activeTripId === trip.id;
          return (
            <div key={trip.id} className="group relative flex items-center">
              <button
                onClick={() => handleTripClick(trip.id)}
                className={`
                      flex items-center gap-3 rounded-lg transition-all
                      ${isOpen ? "w-full px-3 py-2.5 text-left" : "w-12 h-12 justify-center mx-auto"}
                      ${isActive ? "bg-gradient-to-r from-sky-100 to-orange-50 text-sky-950 shadow-sm ring-1 ring-sky-200" : "hover:bg-white/90 text-slate-700"}
                    `}
                title={!isOpen ? trip.title : ""}
              >
                <MessageSquare
                  size={18}
                  className={`shrink-0 ${isActive ? "text-orange-500" : "text-slate-500"}`}
                />

                {/* Title (Hidden if collapsed) */}
                {isOpen && (
                  <span className="text-sm font-medium truncate">
                    {trip.title}
                  </span>
                )}
              </button>

              {/* Delete Button (Only visible on hover + expanded) */}
              {isOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTrip(trip.id);
                    if (isActive) onNavigate(null);
                  }}
                  className="absolute right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete trip"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}

        {trips.length === 0 && isOpen && (
          <div className="px-3 py-4 text-sm text-slate-500 italic text-center">
            No history yet.
          </div>
        )}
      </div>

      {/* --- Footer: User Profile --- */}
      <div className="p-4 border-t border-white/60 bg-white/55 shrink-0">
        <div
          className={`flex items-center ${isOpen ? "gap-3" : "justify-center"}`}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 via-cyan-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 ring-2 ring-white/80">
            AI
          </div>

          {isOpen && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-slate-900 truncate">
                Poreia Planner
              </span>
              <span className="text-xs text-slate-600 truncate">Explore Plan</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
