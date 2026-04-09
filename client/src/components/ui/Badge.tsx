import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/* ── Custom tonal system ──────────────────────────────────────────────── */
type BadgeTone = "coral" | "teal" | "neutral" | "glass"
type BadgeSize = "xs" | "sm" | "md"

const TONE_CLASSES: Record<BadgeTone, string> = {
  coral:
    "border-[var(--badge-coral-border)] bg-[var(--badge-coral-bg)] text-[var(--badge-coral-text)]",
  teal:
    "border-[var(--badge-teal-border)] bg-[var(--badge-teal-bg)] text-[var(--badge-teal-text)]",
  neutral:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-text)]",
  glass:
    "border-white/70 bg-white/86 text-[var(--color-accent-teal)] backdrop-blur-sm",
}

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "rounded-sm px-2.5 py-1 text-[11px]",
  sm: "rounded-md px-3 py-1 text-[0.68rem]",
  md: "px-3 py-1.5 text-[0.68rem]",
}

export interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean
  tone?: BadgeTone
  size?: BadgeSize
}

function Badge({
  className,
  variant = "default",
  asChild = false,
  tone,
  size,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  // When tone is provided, skip the variant system and use tone-specific styling
  const resolvedClassName = tone
    ? cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border font-semibold uppercase tracking-[0.16em] whitespace-nowrap",
        TONE_CLASSES[tone],
        size && SIZE_CLASSES[size],
        className
      )
    : cn(
        badgeVariants({ variant }),
        size && SIZE_CLASSES[size],
        className
      )

  return (
    <Comp
      data-slot="badge"
      data-variant={tone ?? variant}
      className={resolvedClassName}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
export type { BadgeTone, BadgeSize }
export default Badge
