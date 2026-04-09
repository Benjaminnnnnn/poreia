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
      variant="primary"
      size="md"
      onClick={onClick}
      className="min-h-[46px] px-3.5"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/20 text-primary-foreground">
        <UserRoundPlus size={14} />
      </span>
      <span className="flex min-w-0 flex-col items-start leading-none">
        <span className="text-[0.82rem] font-semibold tracking-[-0.01em]">
          Invite
        </span>
        <span className="mt-1 text-[0.63rem] font-semibold uppercase tracking-[0.18em] opacity-80">
          {collaboratorCount} with access
        </span>
      </span>
    </Button>
  );
};

export default TripInviteButton;
