import { forwardRef } from "react";
import type { IconProps } from "./types";

/** Plain + (no circle/square). Solar only ships AddCircle / AddSquare. */
const PLUS_LINEAR = "M12 5v14M5 12h14";

export const Plus = forwardRef<SVGSVGElement, IconProps>(function Plus(
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
      <path
        d={PLUS_LINEAR}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
});

Plus.displayName = "Plus";
