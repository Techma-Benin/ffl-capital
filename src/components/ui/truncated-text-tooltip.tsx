"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TruncatedTextTooltipProps = {
  text: string | null | undefined;
  className?: string;
  fallback?: string;
  as?: "span" | "p";
};

export function TruncatedTextTooltip({
  text,
  className,
  fallback = "—",
  as: Component = "span",
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

    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth);
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [displayText]);

  const textEl = (
    <Component
      ref={ref}
      className={clsx(
        "truncate",
        isTruncated && displayText && "cursor-default",
        className,
      )}
    >
      {content}
    </Component>
  );

  if (!displayText || !isTruncated) {
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
