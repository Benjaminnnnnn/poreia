"use client";

import Button from "@/components/ui/Button";
import { useTrips } from "@/contexts/trips";
import { patchTrip } from "@/services/tripsService";
import type { TripSession } from "@/types";
import { Check, Copy, Globe, Lock } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface ShareButtonProps {
  trip: TripSession;
}

const ShareButton: React.FC<ShareButtonProps> = ({ trip }) => {
  const {
    actions: { syncTripSummary },
    state: { authUser },
  } = useTrips();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isShared = trip.visibility === "shared";
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${trip.id}`
      : `/s/${trip.id}`;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const nextVisibility = isShared ? "private" : "shared";
    try {
      const result = await patchTrip(authUser, trip.id, {
        visibility: nextVisibility,
        expectedVersion: trip.version,
      });
      syncTripSummary(result);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        err.message.includes("multiple active members")
      ) {
        setErrorMessage(
          "Remove all collaborators first to make this trip private.",
        );
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to update sharing.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [authUser, isShared, syncTripSummary, trip.id, trip.version]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — user can copy manually from the input
    }
  }, [shareUrl]);

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="primary"
        size="md"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setErrorMessage(null);
        }}
        className="min-h-[46px] px-3.5"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground">
          {isShared ? <Globe size={14} /> : <Lock size={14} />}
        </span>
        <span className="flex min-w-0 flex-col items-start leading-none">
          <span className="text-[0.82rem] font-semibold tracking-[-0.01em]">
            Share
          </span>
          <span className="mt-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] opacity-80">
            {isShared ? "Public" : "Private"}
          </span>
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/10 bg-black/80 p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">
              {isShared ? "Anyone with the link can view" : "Only you can view"}
            </span>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleToggle}
              aria-label={isShared ? "Disable public link" : "Enable public link"}
              className={[
                "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none",
                isShared ? "bg-emerald-500" : "bg-white/20",
                isLoading ? "opacity-50" : "",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  isShared ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          {errorMessage && (
            <p className="mt-2 text-xs text-red-400">{errorMessage}</p>
          )}

          {isShared && (
            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 focus:outline-none"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ShareButton;
