import { MenuDots } from "@solar-icons/react";
import { clsx } from "clsx";
import type { IconProps } from "./types";

/** Vertical ⋮ kebab; Solar `MenuDots` is horizontal (⋯). */
export function DotsThreeVertical({ className, ...props }: IconProps) {
  return <MenuDots className={clsx("rotate-90", className)} {...props} />;
}
