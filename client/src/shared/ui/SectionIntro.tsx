import React from "react";
import { cn as cx } from "@/shared/lib/utils";

type SectionIntroAlign = "start" | "between";
type SectionIntroTone = "default" | "compact";

const TONE_CLASSES: Record<SectionIntroTone, string> = {
  default: "gap-3",
  compact: "gap-2",
};

export interface SectionIntroProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  actions?: React.ReactNode;
  align?: SectionIntroAlign;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  tone?: SectionIntroTone;
}

const SectionIntro: React.FC<SectionIntroProps> = ({
  actions,
  align = "between",
  className,
  description,
  eyebrow,
  title,
  tone = "default",
  ...props
}) => (
  <div
    className={cx(
      "flex flex-col",
      align === "between" && "sm:flex-row sm:items-end sm:justify-between",
      TONE_CLASSES[tone],
      className,
    )}
    {...props}
  >
    <div className="min-w-0 max-w-3xl">
      {eyebrow ? <p className="ui-kicker">{eyebrow}</p> : null}
      <h2 className={cx(eyebrow ? "mt-3 ui-section-title" : "ui-section-title")}>
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-[42rem] ui-body-copy">{description}</p>
      ) : null}
    </div>

    {actions ? <div className="shrink-0">{actions}</div> : null}
  </div>
);

export default SectionIntro;
