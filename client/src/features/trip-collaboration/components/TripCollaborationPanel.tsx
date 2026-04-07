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
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import type { TripMemberResponse, TripRole } from "@/types";
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
  const [selectedRole, setSelectedRole] = useState<Exclude<TripRole, "owner">>(
    "editor",
  );
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

    setSuccessMessage(`Removed ${getMemberDisplayName(member)} from this trip.`);
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
          "absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden bg-[rgba(255,252,248,0.99)] shadow-[0_28px_64px_rgba(100,63,34,0.16)] outline-none",
          !isMobileViewport && "max-w-[30rem] border-l border-[rgba(229,214,198,0.9)]",
        )}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="relative shrink-0 px-6 pb-6 pt-7 sm:px-8">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="focus-ring absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-[rgba(130,90,65,0.56)] transition-colors duration-150 hover:bg-[rgba(244,236,226,0.88)] hover:text-[rgba(90,57,40,0.9)]"
          >
            <X size={17} />
          </button>

          {/* Eyebrow */}
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.26em] text-primary/70">
            Trip Collaboration
          </p>

          {/* Display title */}
          <h2 className="font-display mt-3 text-[clamp(1.85rem,4.5vw,2.4rem)] leading-[0.94] tracking-[-0.045em] text-[rgba(55,32,17,0.96)]">
            Share the journey.
          </h2>

          {/* Stats — divider layout */}
          {canManageMembers && (
            <div className="mt-6 flex divide-x divide-[rgba(224,209,192,0.72)]">
              {[
                { label: "Active", value: activeMembers.length },
                { label: "Editors", value: editorCount },
                { label: "Viewers", value: viewerCount },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 px-4 first:pl-0 last:pr-0">
                  <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-[rgba(130,90,65,0.58)]">
                    {label}
                  </p>
                  <p className="mt-1.5 text-[1.6rem] font-semibold leading-none tracking-[-0.04em] text-[rgba(55,32,17,0.94)]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-[rgba(222,208,192,0.7)]" />

        {/* ── Scrollable body ─────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-7 sm:px-8">
          {!canManageMembers ? (
            <p className="rounded-xl border border-border bg-card px-5 py-5 text-sm leading-7 text-[rgba(102,68,47,0.8)]">
              You do not have permission to manage trip collaborators.
            </p>
          ) : (
            <div className="space-y-8">
              {/* ── Invite form ──────────────────────────────── */}
              <form onSubmit={handleInviteSubmit} className="space-y-6">
                {/* Section label */}
                <div className="flex items-center gap-2.5 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[rgba(120,83,58,0.66)]">
                  <Mail size={13} />
                  Send Invitation
                </div>

                {/* Email — underline style */}
                <div className="border-b border-[rgba(210,193,175,0.84)] pb-1 focus-within:border-primary/60">
                  <label htmlFor="invite-collaborator-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="invite-collaborator-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    placeholder="companion@example.com"
                    className="w-full bg-transparent py-2 text-[0.97rem] text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(160,122,92,0.48)] focus:outline-none"
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
                            ? "border-primary/30 bg-[rgba(255,244,236,0.98)] shadow-[0_0_0_1px_rgba(230,106,63,0.15),0_8px_20px_rgba(117,74,36,0.07)]"
                            : "border-[rgba(228,214,198,0.88)] bg-[rgba(255,251,246,0.92)] hover:border-[rgba(210,170,130,0.6)] hover:bg-[rgba(255,248,240,0.98)]",
                        )}
                      >
                        <div className={cn(
                          "mb-2.5 flex items-center gap-2 text-[0.93rem] font-semibold",
                          isActive ? "text-primary/90" : "text-[rgba(74,43,26,0.84)]",
                        )}>
                          <Icon size={15} strokeWidth={2} />
                          {option.title}
                        </div>
                        <p className="text-[0.78rem] leading-5 text-[rgba(110,76,54,0.68)]">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Footer row */}
                <div className="flex items-center justify-between gap-4 pt-1">
                  <p className="text-[0.78rem] italic leading-5 text-[rgba(130,90,65,0.62)]">
                    {memberCount > 1
                      ? `${memberCount} people already have access.`
                      : "Only you have access right now."}
                  </p>
                  <button
                    type="submit"
                    disabled={!inviteEmail.trim() || isAdding}
                    className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full bg-[rgba(42,26,14,0.93)] px-5 py-2.5 text-[0.85rem] font-semibold text-[rgba(255,248,240,0.96)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
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
                <p className="rounded-xl border border-[rgba(230,191,177,0.86)] bg-[rgba(253,242,238,0.96)] px-4 py-3 text-[0.87rem] leading-6 text-[rgba(142,78,67,0.92)]">
                  {errorMessage}
                </p>
              )}
              {successMessage && (
                <p className="rounded-xl border border-[rgba(188,217,195,0.88)] bg-[rgba(240,249,242,0.96)] px-4 py-3 text-[0.87rem] leading-6 text-[rgba(68,112,78,0.92)]">
                  {successMessage}
                </p>
              )}

              <div className="h-px bg-[rgba(222,208,192,0.7)]" />

              {/* ── Current guests ───────────────────────────── */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-[rgba(55,32,17,0.78)]">
                    Current Guests
                  </p>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(222,208,192,0.88)] bg-[rgba(248,242,234,0.92)] px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[rgba(120,83,58,0.72)]">
                    <UsersRound size={11} />
                    {activeMembers.length} active
                  </span>
                </div>

                {isLoading ? (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-5 text-sm text-[rgba(103,67,46,0.82)]">
                    <Loader2 className="animate-spin text-primary/80" size={17} />
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
                          className="flex items-center gap-4 rounded-2xl border border-[rgba(228,214,198,0.88)] bg-[rgba(255,251,246,0.96)] px-4 py-4"
                        >
                          {/* Avatar */}
                          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[rgba(230,106,63,0.10)] text-[1rem] font-bold text-primary/80">
                            {getMemberInitial(member)}
                          </div>

                          {/* Name + email */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-[0.95rem] font-semibold tracking-[-0.01em] text-[rgba(55,32,17,0.95)]">
                                {getMemberDisplayName(member)}
                              </span>
                              {isOwner && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(210,165,110,0.5)] bg-[rgba(255,243,224,0.92)] px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[rgba(174,108,42,0.92)]">
                                  <Crown size={9} />
                                  Owner
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[0.82rem] text-[rgba(110,76,54,0.66)]">
                              {member.email}
                            </p>
                          </div>

                          {/* Right side */}
                          {isOwner ? (
                            <span className="shrink-0 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[rgba(130,90,65,0.54)]">
                              Owner
                            </span>
                          ) : (
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              {/* Role toggle */}
                              <div className="inline-flex rounded-[0.8rem] border border-[rgba(224,209,193,0.88)] bg-[rgba(250,244,236,0.92)] p-0.5">
                                {(["editor", "viewer"] as const).map((role) => {
                                  const isActive = member.role === role;
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => handleRoleChange(member, role)}
                                      disabled={isBusy}
                                      className={cn(
                                        "focus-ring rounded-[0.65rem] px-3 py-1.5 text-[0.75rem] font-semibold leading-none transition-[background-color,color] duration-150",
                                        isActive
                                          ? "bg-primary/90 text-white"
                                          : "text-[rgba(110,76,54,0.7)] hover:bg-[rgba(238,226,212,0.88)]",
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
                                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-semibold text-[rgba(152,82,70,0.78)] transition-colors duration-150 hover:bg-[rgba(251,238,234,0.9)] hover:text-[rgba(133,63,52,0.96)] disabled:cursor-not-allowed disabled:opacity-50"
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
                  <p className="rounded-xl border border-dashed border-[rgba(218,202,184,0.86)] px-5 py-6 text-[0.9rem] leading-6 text-[rgba(118,80,57,0.66)]">
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
