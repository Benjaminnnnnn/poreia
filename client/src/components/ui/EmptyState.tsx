import React from "react";
import Surface from "./Surface";
import { cx } from "./cx";

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  action?: React.ReactNode;
  description?: React.ReactNode;
  title: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  action,
  className,
  description,
  title,
  ...props
}) => (
  <Surface
    as="section"
    variant="dashed"
    radius="xl"
    className={cx("px-5 py-10 text-center", className)}
    {...props}
  >
    <h3 className="font-display text-[1.8rem] leading-none tracking-[-0.04em] text-[rgba(84,50,31,0.96)]">
      {title}
    </h3>
    {description ? (
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[rgba(112,75,52,0.76)]">
        {description}
      </p>
    ) : null}
    {action ? <div className="mt-5">{action}</div> : null}
  </Surface>
);

export default EmptyState;
