import { Share2, UserRoundPlus } from "lucide-react";
import React from "react";
import Button from "@/components/ui/Button";

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
      variant="secondary"
      size="md"
      onClick={onClick}
      className="min-h-[46px] rounded-[0.95rem] border-[rgba(235,214,196,0.96)] bg-[rgba(255,251,246,0.94)] px-3.5 text-[rgba(93,62,42,0.94)] shadow-[0_10px_22px_rgba(120,78,42,0.06)] hover:border-[rgba(227,166,126,0.78)] hover:bg-[rgba(255,248,241,0.98)] hover:text-[rgba(201,95,56,0.96)]"
    >
      <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(230,106,63,0.12)] text-[rgba(209,98,57,0.94)]">
        <Share2 size={14} />
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[rgba(255,251,246,0.96)] text-[rgba(84,57,41,0.82)] shadow-[0_4px_10px_rgba(120,78,42,0.12)]">
          <UserRoundPlus size={9} />
        </span>
      </span>
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className="text-[0.82rem] font-semibold tracking-[-0.01em]">
          Invite
        </span>
        <span className="mt-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,84,59,0.74)]">
          {collaboratorCount} with access
        </span>
      </span>
    </Button>
  );
};

export default TripInviteButton;
