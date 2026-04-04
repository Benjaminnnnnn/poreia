import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";

type TooltipSide = "top" | "right" | "bottom" | "left";

interface TooltipPosition {
  left: number;
  top: number;
}

export interface TooltipProps {
  children: React.ReactNode;
  className?: string;
  content: React.ReactNode;
  disabled?: boolean;
  offset?: number;
  openDelay?: number;
  side?: TooltipSide;
}

const VIEWPORT_PADDING = 12;

const getOppositeSide = (side: TooltipSide): TooltipSide => {
  switch (side) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
    default:
      return "left";
  }
};

const getTooltipPosition = (
  side: TooltipSide,
  offset: number,
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
) => {
  switch (side) {
    case "top":
      return {
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
        top: triggerRect.top - tooltipRect.height - offset,
      };
    case "bottom":
      return {
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
        top: triggerRect.bottom + offset,
      };
    case "left":
      return {
        left: triggerRect.left - tooltipRect.width - offset,
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      };
    case "right":
    default:
      return {
        left: triggerRect.right + offset,
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
      };
  }
};

const clampPosition = (
  position: TooltipPosition,
  tooltipRect: DOMRect,
): TooltipPosition => ({
  left: Math.min(
    Math.max(position.left, VIEWPORT_PADDING),
    window.innerWidth - tooltipRect.width - VIEWPORT_PADDING,
  ),
  top: Math.min(
    Math.max(position.top, VIEWPORT_PADDING),
    window.innerHeight - tooltipRect.height - VIEWPORT_PADDING,
  ),
});

const Tooltip: React.FC<TooltipProps> = ({
  children,
  className,
  content,
  disabled = false,
  offset = 12,
  openDelay = 80,
  side = "right",
}) => {
  const tooltipId = useId();
  const closeTimeoutRef = useRef<number | null>(null);
  const openTimeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimeoutRef.current !== null) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }

    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) {
      return;
    }

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    const preferredPosition = getTooltipPosition(
      side,
      offset,
      triggerRect,
      tooltipRect,
    );

    const oppositeSide = getOppositeSide(side);
    const oppositePosition = getTooltipPosition(
      oppositeSide,
      offset,
      triggerRect,
      tooltipRect,
    );

    const overflowsPreferred =
      preferredPosition.left < VIEWPORT_PADDING ||
      preferredPosition.top < VIEWPORT_PADDING ||
      preferredPosition.left + tooltipRect.width >
        window.innerWidth - VIEWPORT_PADDING ||
      preferredPosition.top + tooltipRect.height >
        window.innerHeight - VIEWPORT_PADDING;

    const nextPosition = overflowsPreferred
      ? clampPosition(oppositePosition, tooltipRect)
      : clampPosition(preferredPosition, tooltipRect);

    setPosition(nextPosition);
  }, [offset, side]);

  const openTooltip = useCallback(() => {
    if (disabled) {
      return;
    }

    clearTimers();
    openTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(true);
    }, openDelay);
  }, [clearTimers, disabled, openDelay]);

  const closeTooltip = useCallback(() => {
    clearTimers();
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setPosition(null);
    }, 0);
  }, [clearTimers]);

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const requestPositionUpdate = () => {
      window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener("resize", requestPositionUpdate);
    window.addEventListener("scroll", requestPositionUpdate, true);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(requestPositionUpdate)
        : null;

    if (triggerRef.current) {
      resizeObserver?.observe(triggerRef.current);
    }

    if (tooltipRef.current) {
      resizeObserver?.observe(tooltipRef.current);
    }

    return () => {
      window.removeEventListener("resize", requestPositionUpdate);
      window.removeEventListener("scroll", requestPositionUpdate, true);
      resizeObserver?.disconnect();
    };
  }, [isOpen, updatePosition]);

  useEffect(
    () => () => {
      clearTimers();
    },
    [clearTimers],
  );

  const tooltipNode = useMemo(() => {
    if (!isOpen || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div
        ref={tooltipRef}
        id={tooltipId}
        role="tooltip"
        className={cx(
          "pointer-events-none fixed z-[120] rounded-[0.8rem] border border-[rgba(229,214,198,0.96)] bg-[rgba(255,251,246,0.98)] px-3 py-1.5 text-sm font-semibold whitespace-nowrap text-[rgba(88,57,39,0.94)] shadow-[0_14px_28px_rgba(118,74,36,0.12)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
          position
            ? "translate-x-0 opacity-100"
            : side === "right"
              ? "translate-x-1.5 opacity-0"
              : side === "left"
                ? "-translate-x-1.5 opacity-0"
                : side === "top"
                  ? "-translate-y-1.5 opacity-0"
                  : "translate-y-1.5 opacity-0",
          className,
        )}
        style={
          position
            ? { left: position.left, top: position.top }
            : { left: 0, top: 0, visibility: "hidden" }
        }
      >
        {content}
      </div>,
      document.body,
    );
  }, [className, content, isOpen, position, side, tooltipId]);

  return (
    <>
      <span
        ref={triggerRef}
        aria-describedby={isOpen ? tooltipId : undefined}
        className="inline-flex"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            closeTooltip();
          }
        }}
        onFocus={openTooltip}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            closeTooltip();
          }
        }}
        onPointerEnter={openTooltip}
        onPointerLeave={closeTooltip}
      >
        {children}
      </span>
      {tooltipNode}
    </>
  );
};

export default Tooltip;
