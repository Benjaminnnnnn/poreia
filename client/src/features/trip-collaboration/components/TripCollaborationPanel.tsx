import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { TripMemberResponse, TripRole } from "@/types";
import {
  Crown,
  Eye,
  Loader2,
  Mail,
  Pencil,
  UserMinus,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTripMembers } from "../hooks/useTripMembers";

const MOBILE_MEDIA_QUERY = "(max-width: 767px)";

interface TripCollaborationPanelProps {
  canManageMembers: boolean;
  memberCount: number;
  onClose: () => void;
  open: boolean;
  tripId: string;
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
  tripId,
}) => {
  const isMobileViewport = useMediaQuery(MOBILE_MEDIA_QUERY);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] =
    useState<Exclude<TripRole, "owner">>("editor");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
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

  if (!open) {
    return null;
  }

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

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close collaboration panel"
        className="absolute inset-0 bg-[rgba(72,45,27,0.18)] backdrop-blur-[3px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Invite collaborators"
        tabIndex={-1}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden shadow-[0_28px_64px_rgba(100,63,34,0.16)] outline-none before:absolute before:inset-0 before:bg-white/60 before:-z-10 before:backdrop-blur after:absolute after:inset-0 after:bg-black/50 after:backdrop-blur-md after:mix-blend-overlay after:-z-10",
          !isMobileViewport && "max-w-[30rem] border-l border-white/15",
        )}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="relative z-10 shrink-0 px-6 pb-6 pt-7 sm:px-8">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="focus-ring absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            <X size={17} />
          </button>

          {/* Eyebrow */}
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-white/80">
            Trip Collaboration
          </p>

          {/* Display title */}
          <h2 className="font-display mt-3 text-[clamp(1.85rem,4.5vw,2.4rem)] leading-[0.94] tracking-[-0.045em] text-white drop-shadow">
            Share the journey.
          </h2>

          {/* Stats — divider layout */}
          {canManageMembers && (
            <div className="mt-6 flex divide-x divide-white/20">
              {[
                { label: "Active", value: activeMembers.length },
                { label: "Editors", value: editorCount },
                { label: "Viewers", value: viewerCount },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 px-4 first:pl-0 last:pr-0">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-white/60">
                    {label}
                  </p>
                  <p className="mt-1.5 text-[1.6rem] font-semibold leading-none tracking-[-0.04em] text-white drop-shadow">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 h-px bg-white/20" />

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="relative z-10 flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          {!canManageMembers ? (
            <p className="rounded-xl border border-white/20 bg-white/10 px-5 py-5 text-sm leading-7 text-white/80">
              You do not have permission to manage trip collaborators.
            </p>
          ) : (
            <div className="space-y-8">
              {/* ── Invite form ──────────────────────────────── */}
              <form onSubmit={handleInviteSubmit} className="space-y-6">
                {/* Section label */}
                <div className="flex items-center gap-2.5 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/70">
                  <Mail size={13} />
                  Send Invitation
                </div>

                {/* Email — underline style */}
                <div className="border-b border-white/30 pb-1 focus-within:border-white/60">
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
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="companion@example.com"
                    className="w-full bg-transparent py-2 text-[0.97rem] text-white placeholder:text-white/40 focus:outline-none"
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
                      <button
                        key={option.role}
                        type="button"
                        onClick={() => setSelectedRole(option.role)}
                        className={cn(
                          "focus-ring rounded-[1.1rem] border px-4 py-4 text-left transition-[border-color,background-color,box-shadow] duration-200",
                          isActive
                            ? "border-white/40 bg-white/20 shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.15)]"
                            : "border-white/20 bg-white/10 hover:border-white/30 hover:bg-white/15",
                        )}
                      >
                        <div
                          className={cn(
                            "mb-2.5 flex items-center gap-2 text-[0.93rem] font-semibold",
                            isActive ? "text-white" : "text-white/90",
                          )}
                        >
                          <Icon size={15} strokeWidth={2} />
                          {option.title}
                        </div>
                        <p className="text-[0.78rem] leading-5 text-white/70">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <p className="text-[0.78rem] italic leading-5 text-white/70">
                    {memberCount > 1
                      ? `${memberCount} people already have access.`
                      : "Only you have access right now."}
                  </p>
                  <button
                    type="submit"
                    disabled={!inviteEmail.trim() || isAdding}
                    className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-[#e66a3f] px-5 py-2.5 text-[0.85rem] font-semibold text-white transition-all duration-150 hover:bg-[#e66a3f]/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isAdding ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <UserRoundPlus size={14} />
                    )}
                    {isAdding ? "Adding…" : "Send Invite"}
                  </button>
                </div>
              </form>

              {/* Messages */}
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

              <div className="h-px bg-white/20" />

              {/* ── Current guests ───────────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-white/80">
                    Current Guests
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/70">
                    <UsersRound size={11} />
                    {activeMembers.length} active
                  </span>
                </div>

                {isLoading ? (
                  <div className="flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-5 py-5 text-sm text-white/80">
                    <Loader2 className="animate-spin text-white/80" size={17} />
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
                          className="flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-4"
                        >
                          {/* Avatar */}
                          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e66a3f]/20 text-[1rem] font-bold text-white/90">
                            {getMemberInitial(member)}
                          </div>

                          {/* Name + email */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-white">
                                {getMemberDisplayName(member)}
                              </span>
                              {isOwner && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/80">
                                  <Crown size={9} />
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[0.82rem] text-white/70">
                              {member.email}
                            </p>
                          </div>

                          {/* Right side */}
                          {isOwner ? (
                            <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/60">
                              Owner
                            </span>
                          ) : (
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              {/* Role toggle */}
                              <div className="inline-flex rounded-[0.8rem] border border-white/20 bg-white/10 p-0.5">
                                {(["editor", "viewer"] as const).map((role) => {
                                  const isActive = member.role === role;
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() =>
                                        handleRoleChange(member, role)
                                      }
                                      disabled={isBusy}
                                      className={cn(
                                        "focus-ring rounded-[0.65rem] px-3 py-1.5 text-[0.75rem] font-semibold leading-none transition-[background-color,color] duration-150",
                                        isActive
                                          ? "bg-[#e66a3f] text-white"
                                          : "text-white/70 hover:bg-white/20",
                                      )}
                                    >
                                      {role === "editor" ? "Edit" : "View"}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                disabled={isBusy}
                                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-semibold text-white/70 transition-colors duration-150 hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isBusy ? (
                                  <Loader2 className="animate-spin" size={12} />
                                ) : (
                                  <UserMinus size={12} />
                                )}
                                Remove
                              </button>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-white/20 px-5 py-6 text-[0.9rem] leading-6 text-white/70">
                    No collaborators yet. Add someone by their account email to
                    start co-editing this trip.
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default TripCollaborationPanel;
