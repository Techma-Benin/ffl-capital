import { forwardRef } from "react";
import type { IconProps } from "./types";

/** Vertical ⋮ kebab. Solar `MenuDots` is horizontal (⋯); this matches its Linear style. */
export const DotsThreeVertical = forwardRef<SVGSVGElement, IconProps>(
  function DotsThreeVertical(
    {
      size = 24,
      color = "currentColor",
      weight = "Linear",
      mirrored,
      className,
      alt,
      ...rest
    },
    ref,
  ) {
    const strokeWidth =
      weight === "Bold" || weight === "Outline" ? 2 : 1.5;

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        color={color}
        className={className}
        transform={mirrored ? "scale(-1, 1)" : undefined}
        aria-hidden={alt ? undefined : true}
        {...rest}
      >
        {alt ? <title>{alt}</title> : null}
        <circle
          cx="12"
          cy="5"
          r="2"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="12"
          cy="12"
          r="2"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <circle
          cx="12"
          cy="19"
          r="2"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  },
);

DotsThreeVertical.displayName = "DotsThreeVertical";
