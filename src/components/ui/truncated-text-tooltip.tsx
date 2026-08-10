"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const DEFAULT_TOOLTIP_LENGTH_THRESHOLD = 40;

type TruncatedTextTooltipProps = {
  text: string | null | undefined;
  className?: string;
  fallback?: string;
  as?: "span" | "p";
  /** Show tooltip when text exceeds this length even if overflow can't be measured */
  tooltipLengthThreshold?: number;
};

export function TruncatedTextTooltip({
  text,
  className,
  fallback = "—",
  as: Component = "span",
  tooltipLengthThreshold = DEFAULT_TOOLTIP_LENGTH_THRESHOLD,
}: TruncatedTextTooltipProps) {
  const ref = useRef<HTMLSpanElement | HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const displayText = text?.trim() ? text.trim() : null;
  const content = displayText ?? fallback;

  useEffect(() => {
    const el = ref.current;
    if (!el || !displayText) {
      setIsTruncated(false);
      return;
    }

    const check = () => {
      const overflow =
        el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      setIsTruncated(overflow);
    };
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayText]);

  const showTooltip =
    !!displayText &&
    (isTruncated || displayText.length > tooltipLengthThreshold);

  const textEl = (
    <Component
      ref={ref}
      className={clsx(
        "block min-w-0 max-w-full w-full truncate",
        showTooltip && "cursor-default",
        className,
      )}
    >
      {content}
    </Component>
  );

  if (!showTooltip) {
    return textEl;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{textEl}</TooltipTrigger>
        <TooltipContent side="top">{displayText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
