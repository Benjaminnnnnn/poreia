import React from "react";
import { cx } from "./cx";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "border-[var(--action-primary-border)] bg-[var(--action-primary-bg)] text-white hover:bg-[var(--action-primary-bg-hover)]",
  secondary:
    "border-[var(--action-secondary-border)] bg-[var(--action-secondary-bg)] text-[var(--text-primary)] hover:bg-[var(--action-secondary-bg-hover)]",
  ghost:
    "border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-[rgba(247,239,228,0.82)] hover:text-[var(--text-primary)]",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "min-h-[36px] gap-1.5 px-3 py-2 text-sm sm:min-h-[38px]",
  md: "min-h-[40px] gap-2 px-4 py-2.5 text-sm",
  lg: "min-h-[54px] gap-3 px-5 py-3 text-base",
  icon: "h-9 w-9 p-0",
  "icon-sm": "h-8 w-8 p-0",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      fullWidth = false,
      size = "md",
      type = "button",
      variant = "primary",
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex items-center justify-center rounded-[0.55rem] border font-semibold transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(224,146,94,0.42)] disabled:cursor-not-allowed disabled:opacity-55",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";

export default Button;
