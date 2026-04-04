import React from "react";
import { cx } from "./cx";

type SearchPromptBarVariant = "overlay" | "refine";

const ROOT_CLASSES: Record<SearchPromptBarVariant, string> = {
  overlay:
    "group/search-prompt relative flex items-center overflow-hidden rounded-[0.8rem] border border-[rgba(232,219,205,0.94)] bg-[rgba(255,255,253,0.96)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-[rgba(223,147,93,0.92)] focus-within:bg-[rgba(255,252,248,0.98)] focus-within:shadow-[0_0_0_3px_rgba(223,147,93,0.18),inset_0_1px_0_rgba(255,255,255,0.75)]",
  refine:
    "group/search-prompt relative flex items-center overflow-hidden rounded-[0.7rem] border border-[rgba(228,215,201,0.95)] bg-[rgba(255,250,245,0.97)] p-1.5 shadow-[0_14px_36px_rgba(108,62,26,0.12)] transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:border-[rgba(223,147,93,0.92)] focus-within:bg-[rgba(255,252,248,0.98)] focus-within:shadow-[0_0_0_3px_rgba(223,147,93,0.16),0_14px_36px_rgba(108,62,26,0.12)]",
};

const ICON_WRAPPER_CLASSES: Record<SearchPromptBarVariant, string> = {
  overlay:
    "pointer-events-none flex h-14 w-14 shrink-0 items-center justify-center text-[rgba(211,98,57,0.96)]",
  refine: "pl-2.5 pr-2 text-[rgba(217,102,58,0.92)]",
};

const INPUT_CLASSES: Record<SearchPromptBarVariant, string> = {
  overlay:
    "h-14 min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap bg-transparent pr-4 text-base font-medium text-[rgba(74,43,26,0.97)] placeholder:text-base placeholder:font-medium placeholder:text-[rgba(150,112,82,0.52)] focus:outline-none sm:text-[1.05rem] sm:placeholder:text-[1.05rem]",
  refine:
    "h-11 min-w-0 flex-1 rounded-[0.45rem] border border-transparent bg-transparent px-1 text-sm font-medium text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(118,77,54,0.58)] focus:outline-none md:text-base",
};

export interface SearchPromptBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  label: string;
  leadingIcon: React.ReactNode;
  loadingIcon?: React.ReactNode;
  onFocusStateChange?: (isFocused: boolean) => void;
  onValueChange: (value: string) => void;
  trailingContent?: React.ReactNode;
  value: string;
  variant?: SearchPromptBarVariant;
}

const SearchPromptBar = React.forwardRef<HTMLInputElement, SearchPromptBarProps>(
  (
    {
      className,
      disabled,
      id,
      inputMode,
      isLoading = false,
      label,
      leadingIcon,
      loadingIcon,
      onBlur,
      onFocus,
      onFocusStateChange,
      onValueChange,
      placeholder,
      trailingContent,
      type = "text",
      value,
      variant = "overlay",
      ...props
    },
    ref,
  ) => {
    const handleFocusCapture = () => {
      onFocusStateChange?.(true);
    };

    const handleBlurCapture = (event: React.FocusEvent<HTMLDivElement>) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
        return;
      }

      onFocusStateChange?.(false);
    };

    return (
      <div
        className={cx(ROOT_CLASSES[variant], className)}
        onBlurCapture={handleBlurCapture}
        onFocusCapture={handleFocusCapture}
      >
        <div className={ICON_WRAPPER_CLASSES[variant]}>
          <span
            className={`search-status-icon ${
              isLoading ? "search-status-icon-loading" : ""
            }`}
          >
            <span aria-hidden="true" className="search-status-icon-glow" />
            {isLoading ? loadingIcon ?? leadingIcon : leadingIcon}
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
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          type={type}
          value={value}
          className={INPUT_CLASSES[variant]}
        />

        {trailingContent ? <div className="shrink-0">{trailingContent}</div> : null}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[rgba(226,199,174,0.72)]" />
          <div
            className={cx(
              "absolute inset-y-0 left-0 right-0 bg-[linear-gradient(90deg,rgba(236,165,119,0)_0%,rgba(230,106,63,0.7)_16%,rgba(247,196,157,0.92)_50%,rgba(230,106,63,0.7)_84%,rgba(236,165,119,0)_100%)] shadow-[0_0_14px_rgba(230,106,63,0.32)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 scale-x-[0.72] group-focus-within/search-prompt:scale-x-100 group-focus-within/search-prompt:opacity-100",
              isLoading && "scale-x-100 opacity-100",
            )}
          />
          {isLoading ? (
            <div className="search-prompt-progress-sweep absolute inset-y-0 left-0 w-[32%] bg-[linear-gradient(90deg,rgba(230,106,63,0)_0%,rgba(235,146,95,0.7)_18%,rgba(255,231,212,0.96)_50%,rgba(235,146,95,0.7)_82%,rgba(230,106,63,0)_100%)] opacity-95 shadow-[0_0_18px_rgba(230,106,63,0.4)]" />
          ) : null}
        </div>
      </div>
    );
  },
);

SearchPromptBar.displayName = "SearchPromptBar";

export default SearchPromptBar;
