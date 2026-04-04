import React from "react";
import Field, { type FieldSize, type FieldVariant } from "./Field";
import { cx } from "./cx";

export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  description?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  label?: React.ReactNode;
  leading?: React.ReactNode;
  shellClassName?: string;
  size?: FieldSize;
  trailing?: React.ReactNode;
  variant?: FieldVariant;
  visuallyHideLabel?: boolean;
}

const INPUT_SIZES: Record<FieldSize, string> = {
  md: "min-h-[44px] text-sm",
  lg: "min-h-[54px] text-base",
};

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      className,
      description,
      error,
      hint,
      id,
      label,
      leading,
      shellClassName,
      size = "md",
      trailing,
      type = "text",
      variant = "default",
      visuallyHideLabel = false,
      ...props
    },
    ref,
  ) => (
    <Field
      description={description}
      error={error}
      hint={hint}
      inputId={id}
      label={label}
      leading={leading}
      shellClassName={shellClassName}
      size={size}
      trailing={trailing}
      variant={variant}
      visuallyHideLabel={visuallyHideLabel}
    >
      <input
        {...props}
        ref={ref}
        id={id}
        type={type}
        className={cx(
          "w-full border-none bg-transparent p-0 text-[rgba(74,43,26,0.96)] placeholder:text-[rgba(118,77,54,0.58)] focus:outline-none",
          INPUT_SIZES[size],
          className,
        )}
      />
    </Field>
  ),
);

TextInput.displayName = "TextInput";

export default TextInput;
