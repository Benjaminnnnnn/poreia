import React from "react";
import { cx } from "./cx";

type SurfaceVariant = "card" | "subtle" | "glass" | "muted" | "dashed";
type SurfacePadding = "none" | "sm" | "md" | "lg" | "xl";
type SurfaceRadius = "md" | "lg" | "xl" | "2xl" | "3xl";

const VARIANT_CLASSES: Record<SurfaceVariant, string> = {
  card:
    "border border-[var(--surface-card-border)] bg-[var(--surface-card-bg)] shadow-[var(--shadow-surface-card)]",
  subtle:
    "border border-[var(--surface-subtle-border)] bg-[var(--surface-subtle-bg)]",
  glass:
    "border border-[var(--surface-glass-border)] bg-[var(--surface-glass-bg)] shadow-[var(--shadow-surface-float)] backdrop-blur-[10px]",
  muted:
    "border border-[var(--surface-muted-border)] bg-[var(--surface-muted-bg)]",
  dashed:
    "border border-dashed border-[var(--surface-dashed-border)] bg-[var(--surface-dashed-bg)]",
};

const PADDING_CLASSES: Record<SurfacePadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  xl: "p-6",
};

const RADIUS_CLASSES: Record<SurfaceRadius, string> = {
  md: "rounded-[var(--radius-md)]",
  lg: "rounded-[var(--radius-lg)]",
  xl: "rounded-[var(--radius-xl)]",
  "2xl": "rounded-[var(--radius-2xl)]",
  "3xl": "rounded-[var(--radius-3xl)]",
};

export interface SurfaceProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  padding?: SurfacePadding;
  radius?: SurfaceRadius;
  variant?: SurfaceVariant;
}

const Surface: React.FC<SurfaceProps> = ({
  as: Component = "div",
  children,
  className,
  padding = "md",
  radius = "md",
  variant = "card",
  ...props
}) => (
  <Component
    className={cx(
      VARIANT_CLASSES[variant],
      PADDING_CLASSES[padding],
      RADIUS_CLASSES[radius],
      className,
    )}
    {...props}
  >
    {children}
  </Component>
);

export default Surface;
