import React from "react";
import { cx } from "./cx";

type BadgeTone = "coral" | "teal" | "neutral" | "glass";
type BadgeSize = "xs" | "sm" | "md";

const TONE_CLASSES: Record<BadgeTone, string> = {
  coral:
    "border-[var(--badge-coral-border)] bg-[var(--badge-coral-bg)] text-[var(--badge-coral-text)]",
  teal:
    "border-[var(--badge-teal-border)] bg-[var(--badge-teal-bg)] text-[var(--badge-teal-text)]",
  neutral:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]",
  glass:
    "border-[rgba(255,255,255,0.68)] bg-[rgba(255,252,247,0.86)] text-[rgba(72,131,126,0.94)] backdrop-blur-sm",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "rounded-[calc(var(--radius-sm)-0.1rem)] px-2.5 py-1 text-[11px]",
  sm: "rounded-[var(--radius-sm)] px-3 py-1 text-[0.68rem]",
  md: "rounded-[var(--radius-md)] px-3 py-1.5 text-[0.68rem]",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: BadgeSize;
  tone?: BadgeTone;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  size = "sm",
  tone,
  ...props
}) => (
  <span
    className={cx(
      "inline-flex items-center border font-semibold uppercase tracking-[0.16em]",
      tone && TONE_CLASSES[tone],
      SIZE_CLASSES[size],
      className,
    )}
    {...props}
  >
    {children}
  </span>
);

export default Badge;
