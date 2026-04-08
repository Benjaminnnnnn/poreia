import Button from "@/components/ui/Button";
import { UserRoundPlus } from "lucide-react";
import React from "react";

interface TripInviteButtonProps {
  memberCount: number;
  onClick: () => void;
}

const TripInviteButton: React.FC<TripInviteButtonProps> = ({
  memberCount,
  onClick,
}) => {
  const collaboratorCount = Math.max(memberCount, 1);

  return (
    <Button
      type="button"
      size="md"
      onClick={onClick}
      className="relative min-h-[46px] rounded-[0.95rem] border border-white/30 bg-white/10 px-3.5 text-white shadow-[0_10px_22px_rgba(120,78,42,0.06)] backdrop-blur transition-all duration-200 hover:bg-white/15 hover:border-white/40 before:absolute before:inset-0 before:rounded-[inherit] before:bg-black/20 before:backdrop-blur before:mix-blend-overlay before:-z-10"
    >
      <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#e66a3f]/30 text-white">
        <UserRoundPlus size={14} />
      </span>
      <span className="relative z-10 flex min-w-0 flex-col items-start leading-none">
        <span className="text-[0.82rem] font-semibold tracking-[-0.01em]">
          Invite
        </span>
        <span className="mt-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-white/70">
          {collaboratorCount} with access
        </span>
      </span>
    </Button>
  );
};

export default TripInviteButton;
