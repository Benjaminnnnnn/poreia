import {
  Compass,
  History,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
} from "lucide-react";
import React, { createContext, use } from "react";
import { TripSession } from "../types";

interface SidebarProps {
  trips: TripSession[];
  isOpen: boolean;
  onToggle: () => void;
  onDeleteTrip: (id: string) => void;
  activeTripId: string | null;
  onNavigate: (tripId: string | null) => void;
}

interface SidebarContextValue {
  activeTripId: string | null;
  isOpen: boolean;
  onDeleteTrip: (id: string) => void;
  onNavigate: (tripId: string | null) => void;
  onToggle: () => void;
  trips: TripSession[];
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

function useSidebarContext() {
  const context = use(SidebarContext);

  if (!context) {
    throw new Error("Sidebar compound components must be used within Sidebar.");
  }

  return context;
}

function isMobileViewport() {
  return window.innerWidth < 768;
}

function SidebarProvider({
  activeTripId,
  children,
  isOpen,
  onDeleteTrip,
  onNavigate,
  onToggle,
  trips,
}: React.PropsWithChildren<SidebarProps>) {
  return (
    <SidebarContext value={{ activeTripId, isOpen, onDeleteTrip, onNavigate, onToggle, trips }}>
      {children}
    </SidebarContext>
  );
}

function SidebarRoot({ children }: React.PropsWithChildren) {
  const { isOpen } = useSidebarContext();

  return (
    <div
      className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,249,255,0.88)_58%,rgba(255,247,237,0.88))] backdrop-blur-2xl border-r border-white/55 shadow-2xl shadow-sky-950/10 transition-all duration-300 ease-in-out
        md:relative md:shadow-none
        ${isOpen ? "w-72 translate-x-0" : "w-0 -translate-x-full md:w-20 md:translate-x-0"}
      `}
    >
      {children}
    </div>
  );
}

function SidebarHeader() {
  const { isOpen, onToggle } = useSidebarContext();

  return (
    <div
      className={`relative flex items-center h-16 shrink-0 px-4 transition-all duration-300 ${isOpen ? "justify-between" : "justify-center"} group/header`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="relative w-10 h-10 shrink-0">
          <div
            className={`absolute inset-0 bg-gradient-to-br from-sky-500 via-cyan-400 to-orange-400 rounded-2xl flex items-center justify-center text-white transition-all duration-300
              ${!isOpen ? "group-hover/header:opacity-0 group-hover/header:scale-90" : ""}
            `}
          >
            <Compass size={22} strokeWidth={2.5} />
          </div>

          {!isOpen ? <SidebarCollapsedToggle /> : null}
        </div>

        {isOpen ? (
          <div className="flex flex-col transition-opacity duration-200">
            <h1 className="text-lg font-bold text-slate-900 leading-none">Poreia</h1>
            <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-[0.24em]">
              Travel Atelier
            </span>
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <button
          onClick={onToggle}
          className="p-2 text-slate-400 hover:text-sky-700 hover:bg-white rounded-xl transition-colors"
          title="Close sidebar"
        >
          <PanelLeftClose size={20} />
        </button>
      ) : null}
    </div>
  );
}

function SidebarCollapsedToggle() {
  const { onToggle } = useSidebarContext();

  return (
    <button
      onClick={onToggle}
      className="absolute inset-0 flex items-center justify-center bg-white text-sky-700 rounded-2xl opacity-0 scale-90 group-hover/header:opacity-100 group-hover/header:scale-100 transition-all duration-300"
      title="Open Sidebar"
    >
      <PanelLeftOpen size={20} />
    </button>
  );
}

function SidebarNewTripButton() {
  const { isOpen, onNavigate, onToggle } = useSidebarContext();

  const handleNewTrip = () => {
    onNavigate(null);

    if (isMobileViewport()) {
      onToggle();
    }
  };

  return (
    <div className="px-4 py-4 shrink-0">
      <button
        onClick={handleNewTrip}
        className={`
          flex items-center gap-3 rounded-2xl bg-slate-950 text-white transition-all shadow-lg shadow-slate-950/20 hover:bg-slate-800
          ${isOpen ? "w-full px-4 py-3" : "w-12 h-12 justify-center mx-auto"}
        `}
        title="New Trip"
      >
        <Plus size={20} className="text-white" />
        {isOpen ? <span className="text-sm font-medium text-white">New Trip</span> : null}
      </button>
    </div>
  );
}

function SidebarTripHistory() {
  const { isOpen, trips } = useSidebarContext();

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2 space-y-2">
      {isOpen ? (
        <div className="text-xs font-bold text-slate-500 px-3 py-2 uppercase tracking-wider flex items-center gap-2">
          <History size={12} className="text-sky-600" /> Recent Trips
        </div>
      ) : null}

      {trips.map((trip) => (
        <SidebarTripHistoryItem key={trip.id} trip={trip} />
      ))}

      {trips.length === 0 && isOpen ? (
        <div className="px-3 py-4 text-sm text-slate-500 italic text-center">
          No history yet.
        </div>
      ) : null}
    </div>
  );
}

function SidebarTripHistoryItem({ trip }: { trip: TripSession }) {
  const { activeTripId, isOpen, onDeleteTrip, onNavigate, onToggle } = useSidebarContext();
  const isActive = activeTripId === trip.id;

  const handleTripClick = () => {
    onNavigate(trip.id);

    if (isMobileViewport()) {
      onToggle();
    }
  };

  const handleDeleteClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDeleteTrip(trip.id);

    if (isActive) {
      onNavigate(null);
    }
  };

  return (
    <div className="group relative flex items-center">
      <button
        onClick={handleTripClick}
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

        {isOpen ? <span className="text-sm font-medium truncate">{trip.title}</span> : null}
      </button>

      {isOpen ? (
        <button
          onClick={handleDeleteClick}
          className="absolute right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl opacity-0 group-hover:opacity-100 transition-all"
          title="Delete trip"
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function SidebarFooter() {
  const { isOpen } = useSidebarContext();

  return (
    <div className="p-4 border-t border-white/60 bg-white/55 shrink-0">
      <div className={`flex items-center ${isOpen ? "gap-3" : "justify-center"}`}>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 via-cyan-400 to-orange-400 flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0 ring-2 ring-white/80">
          AI
        </div>

        {isOpen ? (
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-slate-900 truncate">
              Poreia Planner
            </span>
            <span className="text-xs text-slate-600 truncate">Explore Plan</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const SidebarCompound = {
  Footer: SidebarFooter,
  Header: SidebarHeader,
  NewTripButton: SidebarNewTripButton,
  Root: SidebarRoot,
  TripHistory: SidebarTripHistory,
};

const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <SidebarProvider {...props}>
      <SidebarCompound.Root>
        <SidebarCompound.Header />
        <SidebarCompound.NewTripButton />
        <SidebarCompound.TripHistory />
        <SidebarCompound.Footer />
      </SidebarCompound.Root>
    </SidebarProvider>
  );
};

export default Sidebar;
