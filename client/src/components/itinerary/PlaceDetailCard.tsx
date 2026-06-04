"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock, DollarSign, X } from "lucide-react";
import FadeImage from "@/components/ui/FadeImage";
import type { Activity, MapPinData } from "@/types";

interface PlaceDetailCardProps {
  activity: Activity;
  pin: MapPinData;
  onClose: () => void;
}

function PlaceDetailCard({ activity, pin, onClose }: PlaceDetailCardProps) {
  return (
    <motion.div
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="absolute inset-x-0 bottom-20 z-20 overflow-hidden rounded-t-2xl border border-white/15 bg-black/75 backdrop-blur-xl"
    >
      {pin.image && (
        <div className="relative h-32 w-full overflow-hidden">
          <FadeImage src={pin.image} alt={pin.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            {pin.dayNumber != null && (
              <div className="mb-1 flex items-center gap-1.5">
                <span
                  className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: pin.dayColor ?? "#e66a3f" }}
                >
                  {pin.dayNumber}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
                  {pin.badgeLabel ?? `Day ${pin.dayNumber}`}
                </span>
              </div>
            )}
            <h3 className="truncate text-base font-semibold leading-tight text-white">
              {pin.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-white/70">{pin.description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close place detail"
            className="shrink-0 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        {(activity.time || activity.costEstimate != null) && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
            {activity.time && (
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                {activity.time}
              </span>
            )}
            {activity.costEstimate != null && (
              <span className="flex items-center gap-1.5">
                <DollarSign size={12} />
                ~{activity.costEstimate}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface PlaceDetailOverlayProps {
  activity: Activity | null;
  pin: MapPinData | null;
  onClose: () => void;
}

export function PlaceDetailOverlay({ activity, pin, onClose }: PlaceDetailOverlayProps) {
  return (
    <AnimatePresence>
      {activity && pin && (
        <PlaceDetailCard key={pin.id} activity={activity} pin={pin} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}
