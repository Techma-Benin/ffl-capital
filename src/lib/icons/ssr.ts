export type { Icon, IconProps, IconWeight } from "./types";
export { ICON_WEIGHT, ICON_WEIGHT_LINEAR, ICON_WEIGHT_BOLD } from "./types";
export { Plus } from "./plus";
export { DotsThreeVertical } from "./dots-three-vertical";

// Server pages must import individual icon modules. Re-exporting the package
// barrel pulls the complete Solar icon catalog into the affected route chunk.
export { default as ArrowLeft } from "@solar-icons/react/ssr/arrows/ArrowLeft";
export { default as ArrowRight } from "@solar-icons/react/ssr/arrows/ArrowRight";
export { default as ArrowCounterClockwise } from "@solar-icons/react/ssr/arrows/RefreshCircle";
export { default as TrendUp } from "@solar-icons/react/ssr/business/GraphUp";
export { default as TrendDown } from "@solar-icons/react/ssr/business/GraphDown";
export { default as ChartBar } from "@solar-icons/react/ssr/business/Chart2";
export { default as Lightning } from "@solar-icons/react/ssr/devices/Lightning";
export { default as FileText } from "@solar-icons/react/ssr/files/FileText";
export { default as TerminalWindow } from "@solar-icons/react/ssr/files/CodeFile";
export { default as Wallet } from "@solar-icons/react/ssr/money/Wallet";
export { default as Archive } from "@solar-icons/react/ssr/notes/Archive";
export { default as Shield } from "@solar-icons/react/ssr/security/Shield";
export { default as ShieldWarning } from "@solar-icons/react/ssr/security/ShieldWarning";
export { default as Funnel } from "@solar-icons/react/ssr/ui/Filter";
export { default as CheckCircle } from "@solar-icons/react/ssr/ui/CheckCircle";
export { default as Users } from "@solar-icons/react/ssr/users/UsersGroupTwoRounded";
export { default as UsersThree } from "@solar-icons/react/ssr/users/UsersGroupRounded";
