import Button from "@/components/ui/Button";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { ApiServiceError } from "@/services/apiService";
import { patchTrip } from "@/services/tripsService";
import { useTrips } from "@/contexts/trips";
import type { TripMemberResponse, TripRole, TripSession } from "@/types";
import {
  Check,
  Copy,
  Crown,
  Download,
  Eye,
  Globe,
  Loader2,
  Mail,
  Pencil,
  UserMinus,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import QRCode from "react-qr-code";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTripMembers } from "./useTripMembers";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

const TRIP_IMAGES = [
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=400&q=80",
  "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
];

interface TripCollaborationPanelProps {
  canManageMembers: boolean;
  memberCount: number;
  onClose: () => void;
  open: boolean;
  trip: TripSession;
}

const formatRoleLabel = (role: TripRole) => {
  switch (role) {
    case "owner":
      return "Owner";
    case "editor":
      return "Co-Traveler";
    case "viewer":
    default:
      return "Guest";
  }
};

const ROLE_OPTIONS = [
  {
    description: "Can refine and edit the itinerary together.",
    icon: Pencil,
    role: "editor",
    title: "Co-Traveler",
  },
  {
    description: "Can follow along without changing anything.",
    icon: Eye,
    role: "viewer",
    title: "Guest",
  },
] as const;

const getMemberDisplayName = (member: TripMemberResponse) =>
  member.displayName.trim() || member.email;

const getMemberInitial = (member: TripMemberResponse) =>
  getMemberDisplayName(member).charAt(0).toUpperCase();

const TripCollaborationPanel: React.FC<TripCollaborationPanelProps> = ({
  canManageMembers,
  memberCount,
  onClose,
  open,
  trip,
}) => {
  const tripId = trip.id;
  const isShared = trip.visibility === "shared";
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/s/${tripId}`
      : `/s/${tripId}`;

  const isMobileViewport = useMediaQuery(MOBILE_MEDIA_QUERY);

  const {
    actions: { syncTripSummary },

  } = useTrips();

  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<Exclude<TripRole, "owner">>("editor");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    actions: { addMember, deleteMember, updateMember },
    state: { busyMemberId, errorMessage, isAdding, isLoading, members },
  } = useTripMembers({
    enabled: open && canManageMembers,
    tripId,
  });

  useEffect(() => {
    if (!open) {
      setInviteEmail("");
      setSelectedRole("editor");
      setSuccessMessage(null);
      setToggleError(null);
      setCopied(false);
      return;
    }

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const frameId = window.requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frameId);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [onClose, open]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members],
  );
  const editorCount = useMemo(
    () => activeMembers.filter((member) => member.role === "editor").length,
    [activeMembers],
  );
  const viewerCount = useMemo(
    () => activeMembers.filter((member) => member.role === "viewer").length,
    [activeMembers],
  );

  const handleToggle = useCallback(async () => {
    setIsTogglingVisibility(true);
    setToggleError(null);
    const nextVisibility = isShared ? "private" : "shared";
    try {
      const result = await patchTrip(tripId, {
        visibility: nextVisibility,
        expectedVersion: trip.version,
      });
      syncTripSummary(result);
    } catch (err: unknown) {
      if (err instanceof ApiServiceError && err.status === 422) {
        setToggleError(
          "Remove all collaborators first to make this trip private.",
        );
      } else {
        setToggleError("Something went wrong. Please try again.");
      }
    } finally {
      setIsTogglingVisibility(false);
    }
  }, [isShared, syncTripSummary, trip.version, tripId]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — user can copy manually from the input
    }
  }, [shareUrl]);

  const handleDownloadQR = useCallback(() => {
    try {
      const svg = qrContainerRef.current?.querySelector("svg");
      if (!svg) return;

      const serializer = new XMLSerializer();
      let svgStr = serializer.serializeToString(svg);
      if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgStr = svgStr.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([svgStr], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 256, 256);
        ctx.drawImage(img, 0, 0, 256, 256);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = pngUrl;
        a.download = "trip-qr.png";
        a.click();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch {
      // Download failed — user can right-click the QR code to save
    }
  }, []);

  const handleInviteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedEmail = inviteEmail.trim();
    if (!trimmedEmail || isAdding) {
      return;
    }

    const addedMember = await addMember({
      email: trimmedEmail,
      role: selectedRole,
    });

    if (!addedMember) {
      return;
    }

    setInviteEmail("");
    setSelectedRole("editor");
    setSuccessMessage(
      `Added ${getMemberDisplayName(addedMember)} as ${formatRoleLabel(addedMember.role).toLowerCase()}.`,
    );
  };

  const handleRoleChange = async (
    member: TripMemberResponse,
    nextRole: Exclude<TripRole, "owner">,
  ) => {
    if (member.role === nextRole || busyMemberId === member.userId) {
      return;
    }

    const updatedMember = await updateMember(member.userId, {
      role: nextRole,
    });

    if (!updatedMember) {
      return;
    }

    setSuccessMessage(
      `Updated ${getMemberDisplayName(updatedMember)} to ${formatRoleLabel(updatedMember.role).toLowerCase()}.`,
    );
  };

  const handleRemoveMember = async (member: TripMemberResponse) => {
    if (busyMemberId === member.userId) {
      return;
    }

    const removed = await deleteMember(member.userId);
    if (!removed) {
      return;
    }

    setSuccessMessage(
      `Removed ${getMemberDisplayName(member)} from this trip.`,
    );
  };

  const showPublicLinkSection = canManageMembers || isShared;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-[rgba(8,5,3,0.78)] backdrop-blur-[6px]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Share trip"
            tabIndex={-1}
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 flex w-full overflow-hidden rounded-[20px] shadow-[0_32px_80px_rgba(0,0,0,0.45)] border border-white/20 outline-none backdrop-blur-md",
              isMobileViewport
                ? "max-h-[94vh] max-w-lg flex-col"
                : "max-h-[92vh] max-w-5xl flex-row",
            )}
          >
            {/* ── Left: Polaroid collage ───────────────────────── */}
            <div className="hidden md:flex w-5/12 bg-white/8 relative overflow-hidden flex-col items-center justify-center py-12 border-r border-white/15">
              {/* Dot texture */}
              <div
                className="absolute inset-0 opacity-[0.12]"
                style={{
                  backgroundImage:
                    "radial-gradient(rgba(217,119,87,0.6) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />
              {/* Warm floor glow */}
              <div className="absolute bottom-0 inset-x-0 h-2/3 bg-[radial-gradient(ellipse_90%_50%_at_50%_130%,rgba(217,119,87,0.09),transparent)]" />

              <div className="relative z-10 flex flex-col items-center w-full px-10">
                {TRIP_IMAGES.map((src, i) => (
                  <motion.div
                    key={src}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.28 + i * 0.1,
                      duration: 0.6,
                      ease: "easeOut",
                    }}
                    className={cn(
                      "bg-white p-2.5 pb-10 rounded-sm w-44 lg:w-52 transition-transform hover:scale-105 cursor-default",
                      "shadow-[0_12px_48px_rgba(0,0,0,0.75)]",
                      i !== 0 && "-mt-14 lg:-mt-[4.5rem]",
                    )}
                    style={{
                      rotate: i % 2 === 0 ? -4 + i * 1.5 : 5 - i * 2,
                      zIndex: i * 10,
                    }}
                  >
                    <img
                      src={src}
                      alt={`Trip memory ${i + 1}`}
                      className="w-full aspect-square object-cover bg-gray-200"
                    />
                  </motion.div>
                ))}
              </div>
            </div>

            {/* ── Right: Form ──────────────────────────────────── */}
            <div className="w-full md:w-7/12 flex flex-col bg-white/12">
              {/* Header */}
              <div className="relative shrink-0 px-8 pb-6 pt-8 bg-[radial-gradient(ellipse_120%_80%_at_0%_-10%,rgba(217,119,87,0.13),transparent)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="absolute right-5 top-5 rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </Button>

                <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-white/60 mb-3">
                  Trip Collaboration
                </p>
                <h2 className="font-display text-[clamp(1.85rem,4.5vw,2.4rem)] leading-[0.94] tracking-[-0.045em] text-white drop-shadow">
                  Share the journey.
                </h2>

                {canManageMembers && (
                  <div className="mt-6 flex divide-x divide-white/15">
                    {[
                      { label: "Active", value: activeMembers.length },
                      { label: "Editors", value: editorCount },
                      { label: "Viewers", value: viewerCount },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex-1 px-4 first:pl-0 last:pr-0"
                      >
                        <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white/50">
                          {label}
                        </p>
                        <p className="mt-1.5 text-[1.6rem] font-semibold leading-none tracking-[-0.04em] text-white">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-white/10" />

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto scrollbar-themed px-8 py-7">
                <div className="space-y-6">
                  {/* ── Public Link section ──────────────────────── */}
                  {showPublicLinkSection && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/60">
                        <Globe size={13} />
                        Public Link
                      </div>

                      {/* Toggle — owners only */}
                      {canManageMembers && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-white">
                            {isShared
                              ? "Anyone with the link can view"
                              : "Only members can view"}
                          </span>
                          <button
                            type="button"
                            disabled={isTogglingVisibility}
                            onClick={handleToggle}
                            aria-label={
                              isShared
                                ? "Disable public link"
                                : "Enable public link"
                            }
                            className={[
                              "relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none",
                              isShared ? "bg-emerald-500" : "bg-white/20",
                              isTogglingVisibility ? "opacity-50" : "",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                                isShared
                                  ? "translate-x-5"
                                  : "translate-x-0.5",
                              ].join(" ")}
                            />
                          </button>
                        </div>
                      )}

                      {toggleError && (
                        <p className="text-xs text-red-400">{toggleError}</p>
                      )}

                      {/* URL + copy + QR */}
                      {isShared && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
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
                              {copied ? "Copied!" : "Copy"}
                            </Button>
                          </div>

                          <div className="flex flex-col items-center gap-3 rounded-xl bg-white p-4">
                            <div ref={qrContainerRef}>
                              <QRCode value={shareUrl} size={180} />
                            </div>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleDownloadQR}
                              className="gap-1.5"
                            >
                              <Download size={14} />
                              Download QR
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Divider between public link and invite section */}
                  {canManageMembers && showPublicLinkSection && (
                    <div className="h-px bg-white/15" />
                  )}

                  {/* ── Invite section — owners only ─────────────── */}
                  {canManageMembers && (
                    <div className="space-y-8">
                      {/* Invite form */}
                      <form onSubmit={handleInviteSubmit} className="space-y-6">
                        <div className="flex items-center gap-2.5 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/60">
                          <Mail size={13} />
                          Send Invitation
                        </div>

                        {/* Email — underline style */}
                        <div className="border-b border-white/25 pb-1 focus-within:border-white/55 transition-colors">
                          <label
                            htmlFor="invite-collaborator-email"
                            className="sr-only"
                          >
                            Email address
                          </label>
                          <input
                            id="invite-collaborator-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(event) =>
                              setInviteEmail(event.target.value)
                            }
                            placeholder="companion@example.com"
                            className="w-full bg-transparent py-2 text-[0.97rem] text-white placeholder:text-white/35 focus:outline-none"
                            disabled={isAdding}
                            required
                          />
                        </div>

                        {/* Role cards */}
                        <div className="grid grid-cols-2 gap-3">
                          {ROLE_OPTIONS.map((option) => {
                            const isActive = selectedRole === option.role;
                            const Icon = option.icon;
                            return (
                              <Button
                                key={option.role}
                                type="button"
                                variant="ghost"
                                onClick={() => setSelectedRole(option.role)}
                                className={cn(
                                  "h-auto w-full flex-col items-start justify-start whitespace-normal rounded-[1.1rem] p-4 transition-all duration-150",
                                  isActive
                                    ? "bg-primary border-2 border-white/25 text-white shadow-[0_8px_24px_rgba(0,0,0,0.3)] hover:bg-primary"
                                    : "border border-white/15 bg-white/6 text-white/60 hover:bg-primary hover:border-primary hover:text-white",
                                )}
                              >
                                <div
                                  className={cn(
                                    "mb-2 flex items-center gap-2 text-[0.93rem] font-semibold",
                                    isActive ? "text-white" : "text-white/70",
                                  )}
                                >
                                  <Icon size={15} strokeWidth={2} />
                                  {option.title}
                                </div>
                                <p
                                  className={cn(
                                    "text-[0.78rem] leading-5 text-left",
                                    isActive
                                      ? "text-white/80"
                                      : "text-white/40",
                                  )}
                                >
                                  {option.description}
                                </p>
                              </Button>
                            );
                          })}
                        </div>

                        {/* Submit row */}
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <p className="text-[0.78rem] italic leading-5 text-white/60">
                            {memberCount > 1
                              ? `${memberCount} people already have access.`
                              : "Only you have access right now."}
                          </p>
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={!inviteEmail.trim() || isAdding}
                            className="shrink-0 gap-2 rounded-full"
                          >
                            {isAdding ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <UserRoundPlus size={14} />
                            )}
                            {isAdding ? "Adding…" : "Send Invite"}
                          </Button>
                        </div>
                      </form>

                      {/* Status messages */}
                      {errorMessage && (
                        <p className="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-[0.87rem] leading-6 text-red-200">
                          {errorMessage}
                        </p>
                      )}
                      {successMessage && (
                        <p className="rounded-xl border border-green-300/40 bg-green-500/10 px-4 py-3 text-[0.87rem] leading-6 text-green-200">
                          {successMessage}
                        </p>
                      )}

                      <div className="h-px bg-white/15" />

                      {/* Current members */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/70">
                            Current Guests
                          </p>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/8 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/60">
                            <UsersRound size={11} />
                            {activeMembers.length} active
                          </span>
                        </div>

                        {isLoading ? (
                          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/8 px-5 py-5 text-sm text-white/70">
                            <Loader2
                              className="animate-spin text-white/70"
                              size={17}
                            />
                            Loading collaborators…
                          </div>
                        ) : activeMembers.length ? (
                          <div className="space-y-3">
                            {activeMembers.map((member) => {
                              const isOwner = member.role === "owner";
                              const isBusy = busyMemberId === member.userId;

                              return (
                                <article
                                  key={member.userId}
                                  className="flex items-center gap-4 rounded-2xl border border-white/15 bg-white/8 px-4 py-4"
                                >
                                  {/* Avatar */}
                                  <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[1rem] font-bold text-white/90">
                                    {getMemberInitial(member)}
                                  </div>

                                  {/* Name + email */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="truncate text-[0.93rem] font-semibold tracking-[-0.01em] text-white">
                                        {getMemberDisplayName(member)}
                                      </span>
                                      {isOwner && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/70">
                                          <Crown size={9} />
                                          Owner
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-0.5 truncate text-[0.82rem] text-white/55">
                                      {member.email}
                                    </p>
                                  </div>

                                  {/* Controls */}
                                  {isOwner ? (
                                    <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/50">
                                      Owner
                                    </span>
                                  ) : (
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                      {/* Role toggle */}
                                      <div className="inline-flex rounded-[0.8rem] border border-white/20 bg-white/8 p-0.5">
                                        {(["editor", "viewer"] as const).map(
                                          (role) => {
                                            const isActive =
                                              member.role === role;
                                            return (
                                              <Button
                                                key={role}
                                                type="button"
                                                variant={
                                                  isActive ? "default" : "ghost"
                                                }
                                                onClick={() =>
                                                  handleRoleChange(member, role)
                                                }
                                                disabled={isBusy}
                                                size="sm"
                                                className="h-auto rounded-[0.65rem] px-3 py-1.5 text-[0.75rem] font-semibold leading-none"
                                              >
                                                {role === "editor"
                                                  ? "Edit"
                                                  : "View"}
                                              </Button>
                                            );
                                          },
                                        )}
                                      </div>

                                      {/* Remove */}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() =>
                                          handleRemoveMember(member)
                                        }
                                        disabled={isBusy}
                                        size="sm"
                                        className="h-auto gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-semibold text-white/60 hover:bg-red-500/20 hover:text-red-200"
                                      >
                                        {isBusy ? (
                                          <Loader2
                                            className="animate-spin"
                                            size={12}
                                          />
                                        ) : (
                                          <UserMinus size={12} />
                                        )}
                                        Remove
                                      </Button>
                                    </div>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="rounded-xl border border-dashed border-white/20 px-5 py-6 text-[0.9rem] leading-6 text-white/60">
                            No collaborators yet. Add someone by their account
                            email to start co-editing this trip.
                          </p>
                        )}
                      </section>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default TripCollaborationPanel;
