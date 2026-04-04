import {
  Loader2,
  Mail,
  ShieldCheck,
  UserMinus,
  UserRoundPlus,
  UsersRound,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import Surface from "@/components/ui/Surface";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
      return "Can edit";
    case "viewer":
    default:
      return "Can view";
  }
};

const ROLE_OPTIONS = [
  {
    description: "Can refine and edit the trip together.",
    role: "editor",
    title: "Can edit",
  },
  {
    description: "Can follow along without changing anything.",
    role: "viewer",
    title: "Can view",
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
      <button
        type="button"
        aria-label="Close collaboration panel"
        className="absolute inset-0 bg-[rgba(72,45,27,0.16)] backdrop-blur-[3px]"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Invite collaborators"
        tabIndex={-1}
        className={`absolute right-0 top-0 flex h-full w-full flex-col overflow-hidden border-l border-[rgba(229,214,198,0.92)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98)_0%,rgba(247,241,232,0.98)_100%)] shadow-[0_28px_64px_rgba(100,63,34,0.14)] outline-none ${
          isMobileViewport ? "" : "max-w-[32rem]"
        }`}
      >
        <div className="border-b border-[rgba(231,217,201,0.94)] px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[25rem]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[rgba(205,99,57,0.84)]">
                Collaboration
              </p>
              <h2 className="font-display mt-3 max-w-[12ch] text-[clamp(1.95rem,4vw,2.55rem)] leading-[0.92] tracking-[-0.045em] text-[rgba(74,43,26,0.96)]">
                Invite people into the same trip.
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(232,219,205,0.92)] bg-[rgba(255,251,246,0.96)] text-[rgba(118,79,57,0.78)] transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:bg-[rgba(249,241,232,0.98)] hover:text-[rgba(84,57,43,0.96)]"
            >
              <X size={18} />
            </button>
          </div>

          {canManageMembers ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <Surface
                variant="subtle"
                radius="md"
                className="px-3.5 py-3"
              >
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[rgba(125,84,59,0.68)]">
                  Active
                </p>
                <p className="mt-2 text-[1.2rem] font-semibold leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                  {activeMembers.length}
                </p>
              </Surface>
              <Surface
                variant="subtle"
                radius="md"
                className="px-3.5 py-3"
              >
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[rgba(125,84,59,0.68)]">
                  Editors
                </p>
                <p className="mt-2 text-[1.2rem] font-semibold leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                  {editorCount}
                </p>
              </Surface>
              <Surface
                variant="subtle"
                radius="md"
                className="px-3.5 py-3"
              >
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[rgba(125,84,59,0.68)]">
                  Viewers
                </p>
                <p className="mt-2 text-[1.2rem] font-semibold leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                  {viewerCount}
                </p>
              </Surface>
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-6">
          {!canManageMembers ? (
            <Surface
              variant="card"
              radius="lg"
              className="px-5 py-5 text-sm leading-7 text-[rgba(102,68,47,0.8)]"
            >
              You do not have permission to manage trip collaborators.
            </Surface>
          ) : (
            <div className="space-y-6">
              <Surface
                as="section"
                variant="card"
                radius="lg"
                className="px-4 py-4 sm:px-5"
              >
                <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.74)]">
                  <Mail size={14} />
                  Add collaborator
                </div>

                <form onSubmit={handleInviteSubmit} className="mt-4 space-y-5">
                  <div>
                    <label
                      htmlFor="invite-collaborator-email"
                      className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]"
                    >
                      Account email
                    </label>
                    <input
                      id="invite-collaborator-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="teammate@example.com"
                      className="field-focus mt-2 min-h-[3.25rem] w-full rounded-[0.95rem] border border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] px-4 text-[0.97rem] text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(150,112,82,0.54)]"
                      disabled={isAdding}
                      required
                    />
                  </div>

                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]">
                      Access
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {ROLE_OPTIONS.map((option) => {
                        const isActive = selectedRole === option.role;
                        return (
                          <button
                            key={option.role}
                            type="button"
                            onClick={() => setSelectedRole(option.role)}
                            className={`focus-ring rounded-[1rem] border px-4 py-3.5 text-left transition-[border-color,background-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                              isActive
                                ? "border-[rgba(223,147,93,0.42)] bg-[rgba(255,245,236,0.98)] text-[rgba(86,56,39,0.96)] shadow-[0_12px_24px_rgba(117,74,36,0.08)]"
                                : "border-[rgba(234,221,207,0.92)] bg-[rgba(255,251,246,0.94)] text-[rgba(101,68,47,0.82)] hover:border-[rgba(226,170,126,0.56)] hover:bg-[rgba(255,248,240,0.98)]"
                            }`}
                          >
                            <p className="text-[0.92rem] font-semibold tracking-[-0.01em]">
                              {option.title}
                            </p>
                            <p className="mt-1.5 text-[0.8rem] leading-5 text-[rgba(119,80,57,0.72)]">
                              {option.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[rgba(239,223,207,0.82)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-[28ch] text-[0.8rem] leading-5 text-[rgba(118,80,57,0.72)]">
                      {memberCount > 1
                        ? `${memberCount} people already have access.`
                        : "Only you have access right now."}
                    </p>
                    <Button
                      type="submit"
                      disabled={!inviteEmail.trim() || isAdding}
                      className="rounded-[0.9rem] px-4"
                    >
                      {isAdding ? (
                        <>
                          <Loader2 className="animate-spin" size={15} />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserRoundPlus size={15} />
                          Add collaborator
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Surface>

              {errorMessage ? (
                <Surface
                  variant="subtle"
                  radius="md"
                  className="border-[rgba(230,191,177,0.92)] bg-[rgba(253,242,238,0.96)] px-4 py-3 text-[0.88rem] leading-6 text-[rgba(142,78,67,0.92)]"
                >
                  {errorMessage}
                </Surface>
              ) : null}

              {successMessage ? (
                <Surface
                  variant="subtle"
                  radius="md"
                  className="border-[rgba(188,217,195,0.92)] bg-[rgba(240,249,242,0.96)] px-4 py-3 text-[0.88rem] leading-6 text-[rgba(68,112,78,0.92)]"
                >
                  {successMessage}
                </Surface>
              ) : null}

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(120,83,58,0.72)]">
                    Current access
                  </p>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(231,216,201,0.94)] bg-[rgba(255,249,243,0.92)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,84,59,0.78)]">
                    <UsersRound size={12} />
                    {activeMembers.length} active
                  </span>
                </div>

                {isLoading ? (
                  <Surface
                    variant="card"
                    radius="lg"
                    className="px-5 py-6 text-sm text-[rgba(103,67,46,0.82)]"
                  >
                    <div className="flex items-center gap-3">
                      <Loader2
                        className="animate-spin text-[rgba(217,102,58,0.92)]"
                        size={18}
                      />
                      Loading collaborators...
                    </div>
                  </Surface>
                ) : activeMembers.length ? (
                  activeMembers.map((member) => {
                    const isOwner = member.role === "owner";
                    const isBusy = busyMemberId === member.userId;

                    return (
                      <Surface
                        as="article"
                        key={member.userId}
                        variant="card"
                        radius="lg"
                        className="px-4 py-4 sm:px-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3.5">
                            <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[rgba(230,106,63,0.12)] text-[0.92rem] font-semibold text-[rgba(203,95,55,0.92)]">
                              {getMemberInitial(member)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-[0.98rem] font-semibold tracking-[-0.015em] text-[rgba(74,43,26,0.96)]">
                                  {getMemberDisplayName(member)}
                                </p>
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(234,221,207,0.9)] bg-[rgba(255,251,246,0.9)] px-2.5 py-1 text-[0.64rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,84,59,0.78)]">
                                  <ShieldCheck size={11} />
                                  {formatRoleLabel(member.role)}
                                </div>
                              </div>
                              <p className="mt-1 truncate text-[0.87rem] leading-6 text-[rgba(106,72,49,0.74)]">
                                {member.email}
                              </p>
                            </div>
                          </div>

                          {isOwner ? (
                            <span className="rounded-full border border-[rgba(235,214,196,0.96)] bg-[rgba(255,249,243,0.96)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(205,99,57,0.84)]">
                              Owner
                            </span>
                          ) : (
                            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                              <div className="inline-flex self-start rounded-[0.9rem] border border-[rgba(233,219,204,0.92)] bg-[rgba(255,252,248,0.92)] p-1 sm:self-auto">
                                {(["editor", "viewer"] as const).map((role) => {
                                  const isActive = member.role === role;
                                  return (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={() => handleRoleChange(member, role)}
                                      disabled={isBusy}
                                      className={`focus-ring rounded-[0.7rem] px-3.5 py-1.5 text-[0.8rem] font-semibold leading-none tracking-[-0.01em] transition-[background-color,color] duration-150 ${
                                        isActive
                                          ? "bg-[rgba(230,106,63,0.92)] text-[rgba(255,251,246,0.98)]"
                                          : "text-[rgba(120,83,58,0.78)] hover:bg-[rgba(247,239,228,0.88)]"
                                      }`}
                                    >
                                      {role === "editor" ? "Edit" : "View"}
                                    </button>
                                  );
                                })}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                disabled={isBusy}
                                className="focus-ring inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full border border-[rgba(233,219,204,0.92)] bg-[rgba(255,252,248,0.92)] px-3.5 py-1.5 text-[0.8rem] font-semibold leading-none tracking-[-0.01em] text-[rgba(152,82,70,0.86)] transition-[background-color,color,border-color] duration-150 hover:border-[rgba(226,170,126,0.5)] hover:bg-[rgba(251,238,234,0.94)] hover:text-[rgba(133,63,52,0.96)] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <Loader2 className="animate-spin" size={13} />
                                ) : (
                                  <UserMinus size={13} />
                                )}
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </Surface>
                    );
                  })
                ) : (
                  <Surface
                    variant="dashed"
                    radius="lg"
                    className="px-5 py-6 text-[0.92rem] leading-6 text-[rgba(118,80,57,0.74)]"
                  >
                    No collaborators yet. Add someone by their account email to
                    start co-editing this trip.
                  </Surface>
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
