import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import React, { useState } from "react";
import Button from "./Button";

// App-palette conic gradient — coral → amber → peach → teal → sea → coral
const RING_GRADIENT =
  "conic-gradient(from 0deg, oklch(0.64 0.17 36), oklch(0.84 0.16 82), oklch(0.87 0.10 58), oklch(0.69 0.11 188), oklch(0.57 0.10 213), oklch(0.64 0.17 36))";

// Aurora glow gradient — wider spread, slightly cooler palette for the diffuse outer halo
const GLOW_GRADIENT =
  "conic-gradient(from 0deg, oklch(0.60 0.19 30), oklch(0.82 0.18 78), oklch(0.85 0.12 55), oklch(0.65 0.14 185), oklch(0.52 0.12 215), oklch(0.60 0.19 30))";

type SearchPromptBarVariant = "overlay" | "refine";

export interface SearchPromptBarProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "size"
> {
  disableGlow?: boolean;
  disableRing?: boolean;
  isLoading?: boolean;
  label: string;
  leadingIcon: React.ReactNode;
  loadingIcon?: React.ReactNode;
  loadingLabel?: string;
  onFocusStateChange?: (isFocused: boolean) => void;
  onValueChange: (value: string) => void;
  submitLabel?: string;
  trailingContent?: React.ReactNode;
  value: string;
  variant?: SearchPromptBarVariant;
}

const SearchPromptBar = React.forwardRef<
  HTMLInputElement,
  SearchPromptBarProps
>(
  (
    {
      className,
      disabled,
      disableGlow = false,
      disableRing = false,
      id,
      inputMode,
      isLoading = false,
      label,
      leadingIcon,
      loadingIcon,
      loadingLabel = "Planning…",
      onBlur,
      onFocus,
      onFocusStateChange,
      onValueChange,
      placeholder,
      submitLabel,
      trailingContent,
      type = "text",
      value,
      variant = "overlay",
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const prefersReducedMotion = useReducedMotion();

    const slowSpin = prefersReducedMotion
      ? {}
      : ({ duration: 4, repeat: Infinity, ease: "linear" } as const);

    const fastSpin = prefersReducedMotion
      ? {}
      : ({ duration: 1, repeat: Infinity, ease: "linear" } as const);

    const handleFocusCapture = () => {
      setIsFocused(true);
      onFocusStateChange?.(true);
    };

    const handleBlurCapture = (e: React.FocusEvent<HTMLDivElement>) => {
      if (
        e.relatedTarget instanceof Node &&
        e.currentTarget.contains(e.relatedTarget)
      ) {
        return;
      }
      setIsFocused(false);
      onFocusStateChange?.(false);
    };

    /* ── Refine variant ──────────────────────────────────────── */
    if (variant === "refine") {
      return (
        <div
          className={cn(
            "group/search-prompt relative flex items-center overflow-hidden rounded-full border border-white/25 bg-white/12 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md transition-[border-color,box-shadow] duration-200 ease-[var(--ease-standard)] focus-within:border-white/45 focus-within:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_18%,transparent),0_12px_40px_rgba(0,0,0,0.25)]",
            className,
          )}
          onBlurCapture={handleBlurCapture}
          onFocusCapture={handleFocusCapture}
        >
          <div className="pl-2.5 pr-2 text-primary">
            <span
              className={`search-status-icon ${isLoading ? "search-status-icon-loading" : ""}`}
            >
              <span aria-hidden="true" className="search-status-icon-glow" />
              {isLoading ? (loadingIcon ?? leadingIcon) : leadingIcon}
            </span>
          </div>

          <label htmlFor={id} className="sr-only">
            {label}
          </label>

          <input
            {...props}
            ref={ref}
            disabled={disabled}
            id={id}
            inputMode={inputMode}
            onBlur={onBlur}
            onChange={(e) => onValueChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            type={type}
            value={value}
            className="h-11 min-w-0 flex-1 rounded-[var(--radius-sm)] border border-transparent bg-transparent px-1 text-sm font-medium text-white placeholder:text-white/38 focus:outline-none md:text-base"
          />

          {trailingContent ? (
            <div className="shrink-0">{trailingContent}</div>
          ) : null}

        </div>
      );
    }

    /* ── Overlay variant — new pill ring design ──────────────── */
    const glowActive = isFocused || isLoading;

    return (
      <div
        className={cn("relative w-full", className)}
        onBlurCapture={handleBlurCapture}
        onFocusCapture={handleFocusCapture}
      >
        {/* Outer soft glow — always visible, intensifies on focus/loading */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-3 rounded-full blur-2xl transition-opacity duration-500",
            disableGlow ? "opacity-0" : glowActive ? "opacity-55" : "opacity-20",
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={slowSpin}
              className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2"
              style={{ background: GLOW_GRADIENT }}
            />
          </div>
        </div>

        {/* Inner tight glow — subtle halo hugging the ring border */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -inset-0.5 rounded-full blur-md transition-opacity duration-500",
            disableGlow ? "opacity-0" : glowActive ? "opacity-70" : "opacity-30",
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={slowSpin}
              className="absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2"
              style={{ background: RING_GRADIENT }}
            />
          </div>
        </div>

        {/* Pill shell — gradient ring or static border */}
        <div
          className={cn(
            "relative overflow-hidden rounded-full shadow-md",
            disableRing ? "border border-border p-0" : "p-[2px]",
          )}
        >
          {!disableRing && (
            <motion.div
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={slowSpin}
              className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2"
              style={{ background: RING_GRADIENT }}
            />
          )}

          {/* Inner content area */}
          <div className="relative flex items-center gap-2 rounded-full bg-card px-2 py-2">
            {/* Left circle icon / spinner */}
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-primary"
            >
              {isLoading ? (
                <div className="relative h-5 w-5">
                  {/* Blur glow behind ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={fastSpin}
                    className="absolute inset-0 rounded-full opacity-60"
                    style={{ background: RING_GRADIENT, filter: "blur(3px)" }}
                  />
                  {/* Crisp spinner ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={fastSpin}
                    className="absolute inset-0 rounded-full p-[2px]"
                    style={{ background: RING_GRADIENT }}
                  >
                    <div className="h-full w-full rounded-full bg-card" />
                  </motion.div>
                </div>
              ) : (
                leadingIcon
              )}
            </div>

            <label htmlFor={id} className="sr-only">
              {label}
            </label>

            <input
              {...props}
              ref={ref}
              disabled={disabled}
              id={id}
              inputMode={inputMode}
              onBlur={onBlur}
              onChange={(e) => onValueChange(e.target.value)}
              onFocus={onFocus}
              placeholder={placeholder}
              type={type}
              value={value}
              className="min-w-0 flex-1 border-none bg-transparent text-[1rem] font-medium text-foreground placeholder:text-muted-foreground/55 focus:outline-none sm:text-[1.05rem]"
            />

            {trailingContent && (
              <div className="shrink-0">{trailingContent}</div>
            )}

            {submitLabel && (
              <Button
                type="submit"
                variant="primary"
                disabled={disabled || !value.trim()}
                className="shrink-0 rounded-[1.25rem]"
              >
                {isLoading ? loadingLabel : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

SearchPromptBar.displayName = "SearchPromptBar";

export default SearchPromptBar;
