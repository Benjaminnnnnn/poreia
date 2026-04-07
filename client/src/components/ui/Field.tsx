import React from "react";
import { cx } from "./cx";

type FieldVariant = "default" | "subtle" | "glass";
type FieldSize = "md" | "lg";

const SHELL_VARIANTS: Record<FieldVariant, string> = {
  default:
    "border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
  subtle:
    "border-[rgba(228,215,201,0.95)] bg-[rgba(255,250,245,0.94)]",
  glass:
    "border-[var(--surface-glass-border)] bg-[var(--surface-glass-bg)] shadow-[var(--shadow-surface-inline)] backdrop-blur-[8px]",
};

const SHELL_SIZES: Record<FieldSize, string> = {
  md: "min-h-[44px] rounded-[var(--radius-md)] px-3.5",
  lg: "min-h-[54px] rounded-[var(--radius-lg)] px-4.5",
};

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  inputId?: string;
  label?: React.ReactNode;
  leading?: React.ReactNode;
  shellClassName?: string;
  size?: FieldSize;
  trailing?: React.ReactNode;
  variant?: FieldVariant;
  visuallyHideLabel?: boolean;
}

const Field: React.FC<FieldProps> = ({
  children,
  className,
  description,
  error,
  hint,
  inputId,
  label,
  leading,
  shellClassName,
  size = "md",
  trailing,
  variant = "default",
  visuallyHideLabel = false,
  ...props
}) => {
  const supportingText = error ?? hint;

  return (
    <div className={cx("space-y-2", className)} {...props}>
      {label ? (
        <label
          htmlFor={inputId}
          className={cx(
            "block text-[var(--font-size-label)] font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground",
            visuallyHideLabel && "sr-only",
          )}
        >
          {label}
        </label>
      ) : null}

      {description ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}

      <div
        className={cx(
          "field-focus flex items-center gap-3 border transition-[border-color,box-shadow,background-color] duration-[var(--duration-base)] ease-[var(--ease-standard)] focus-within:border-[rgba(223,147,93,0.92)] focus-within:shadow-[0_0_0_3px_rgba(223,147,93,0.14)]",
          SHELL_VARIANTS[variant],
          SHELL_SIZES[size],
          shellClassName,
        )}
      >
        {leading ? (
          <div className="shrink-0 text-primary">{leading}</div>
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>

        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>

      {supportingText ? (
        <p
          className={cx(
            "text-sm leading-6",
            error ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {supportingText}
        </p>
      ) : null}
    </div>
  );
};

export type { FieldSize, FieldVariant };
export default Field;
