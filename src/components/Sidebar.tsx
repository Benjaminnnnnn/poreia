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
        fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[rgba(214,181,154,0.9)] bg-[rgba(255,250,245,0.96)] backdrop-blur-2xl shadow-2xl shadow-[rgba(120,74,36,0.08)] transition-all duration-300 ease-in-out
        md:relative md:shadow-none
        ${isOpen ? "w-[min(22rem,88vw)] translate-x-0 md:w-72" : "w-0 -translate-x-full md:w-20 md:translate-x-0"}
      `}
    >
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-[rgba(255,255,255,0.62)]"
      />
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
            className={`absolute inset-0 rounded-2xl border border-[rgba(214,98,54,0.18)] bg-[rgba(230,106,63,0.96)] flex items-center justify-center text-white shadow-[0_10px_24px_rgba(210,96,47,0.16)] transition-all duration-300
              ${!isOpen ? "group-hover/header:opacity-0 group-hover/header:scale-90" : ""}
            `}
          >
            <Compass size={22} strokeWidth={2.5} />
          </div>

          {!isOpen ? <SidebarCollapsedToggle /> : null}
        </div>

        {isOpen ? (
          <div className="flex flex-col transition-opacity duration-200">
            <h1 className="font-display text-[1.35rem] font-semibold leading-none text-[rgba(72,42,27,0.96)]">Poreia</h1>
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[rgba(215,101,58,0.9)]">
              Summer Atelier
            </span>
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <button
          onClick={onToggle}
          className="rounded-xl p-2 text-[rgba(133,95,66,0.56)] transition-colors hover:bg-white hover:text-[rgba(217,102,58,0.92)]"
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
      className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white text-[rgba(217,102,58,0.92)] opacity-0 scale-90 transition-all duration-300 group-hover/header:opacity-100 group-hover/header:scale-100"
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
          flex items-center gap-3 rounded-2xl border border-[rgba(214,98,54,0.18)] bg-[rgba(230,106,63,0.96)] text-white shadow-lg shadow-[rgba(224,104,49,0.16)] transition-all hover:-translate-y-0.5 hover:bg-[rgba(217,98,56,1)]
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
        <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[rgba(135,96,69,0.72)]">
          <History size={12} className="text-[rgba(217,102,58,0.92)]" /> Recent Trips
        </div>
      ) : null}

      {trips.map((trip) => (
        <SidebarTripHistoryItem key={trip.id} trip={trip} />
      ))}

      {trips.length === 0 && isOpen ? (
        <div className="px-3 py-4 text-center text-sm italic text-[rgba(135,96,69,0.74)]">
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
          ${
            isActive
              ? "bg-[rgba(255,240,222,0.92)] text-[rgba(78,47,29,0.96)] shadow-sm ring-1 ring-[rgba(237,170,118,0.45)]"
              : "text-[rgba(102,70,49,0.88)] hover:bg-white/90"
          }
        `}
        title={!isOpen ? trip.title : ""}
      >
        <MessageSquare
          size={18}
          className={`shrink-0 ${isActive ? "text-[rgba(217,102,58,0.96)]" : "text-[rgba(153,118,93,0.78)]"}`}
        />

        {isOpen ? <span className="text-sm font-medium truncate">{trip.title}</span> : null}
      </button>

      {isOpen ? (
        <button
          onClick={handleDeleteClick}
          className="absolute right-2 rounded-xl p-1.5 text-[rgba(153,118,93,0.74)] opacity-100 transition-all hover:bg-white hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
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
    <div className="shrink-0 border-t border-white/60 bg-white/55 p-4">
      <div className={`flex items-center ${isOpen ? "gap-3" : "justify-center"}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(214,98,54,0.14)] bg-[rgba(230,106,63,0.14)] text-xs font-bold text-[rgba(217,102,58,0.96)] shadow-sm ring-2 ring-white/80">
          AI
        </div>

        {isOpen ? (
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold text-[rgba(72,42,27,0.96)]">
              Poreia Planner
            </span>
            <span className="truncate text-xs text-[rgba(116,79,56,0.8)]">Chasing sunrises</span>
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
