import type { SVGProps } from "react";

type IconName =
  | "check"
  | "x"
  | "question"
  | "alert"
  | "arrow-right"
  | "arrow-up-right"
  | "chevron-right"
  | "chevron-down"
  | "play"
  | "pause"
  | "copy"
  | "search"
  | "overview"
  | "agent"
  | "experiments"
  | "replay"
  | "incidents"
  | "reports"
  | "inventory"
  | "knowledge"
  | "settings"
  | "lens"
  | "shield"
  | "clock"
  | "git"
  | "dot"
  | "menu"
  | "print"
  | "lock"
  | "minus";

const PATHS: Record<IconName, string> = {
  check: "M3.5 8.5l3 3 6-7",
  x: "M4 4l8 8M12 4l-8 8",
  question: "M6 6.2a2 2 0 113 1.7c-.6.4-1 .8-1 1.6M8 11.6v.1",
  alert: "M8 2.5l6 11H2l6-11zM8 6.5v3.2M8 11.6v.1",
  "arrow-right": "M3 8h10M9 4l4 4-4 4",
  "arrow-up-right": "M5 11l6-6M6 5h5v5",
  "chevron-right": "M6 4l4 4-4 4",
  "chevron-down": "M4 6l4 4 4-4",
  play: "M5 3.5v9l7-4.5-7-4.5z",
  pause: "M5 3.5v9M11 3.5v9",
  copy: "M5.5 5.5h7v7h-7zM3.5 10.5v-7h7",
  search: "M7 12A5 5 0 107 2a5 5 0 000 10zM10.6 10.6L14 14",
  overview: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  agent: "M8 2v2M3.5 6.5h9v6h-9zM6 9.2v.1M10 9.2v.1M2 9h1.5M12.5 9H14",
  experiments: "M6 2h4M6.5 2v4.5L3 13.5h10L9.5 6.5V2M4.5 10.5h7",
  replay: "M2.5 8a5.5 5.5 0 109.6-3.6M12.5 2v2.8H9.7",
  incidents: "M8 2.5l6 11H2l6-11zM8 6.5v3.2M8 11.6v.1",
  reports: "M4 2h6l3 3v9H4zM10 2v3h3M6 8h5M6 10.5h5",
  inventory: "M2.5 4h11v3h-11zM2.5 9h11v3h-11zM4.5 5.5v.1M4.5 10.5v.1",
  knowledge: "M3 3h4.5a1.5 1.5 0 011.5 1.5V13a1.5 1.5 0 00-1.5-1.5H3zM13 3H8.5A1.5 1.5 0 007 4.5V13a1.5 1.5 0 011.5-1.5H13z",
  settings: "M8 10a2 2 0 100-4 2 2 0 000 4zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4",
  lens: "M7 12A5 5 0 107 2a5 5 0 000 10zM10.6 10.6L14 14M5 7h4",
  shield: "M8 1.8l5 2v4c0 3.1-2.1 5.4-5 6.4-2.9-1-5-3.3-5-6.4v-4l5-2zM5.8 8l1.6 1.6L10.5 6.4",
  clock: "M8 14A6 6 0 108 2a6 6 0 000 12zM8 4.5V8l2.5 1.5",
  git: "M5 3v6.5M5 9.5a2 2 0 100 4 2 2 0 000-4zM11 6.5a2 2 0 100-4 2 2 0 000 4zM11 6.5c0 2.5-6 1.5-6 4",
  dot: "M8 8.01",
  menu: "M2.5 4.5h11M2.5 8h11M2.5 11.5h11",
  print: "M4.5 6V2.5h7V6M4.5 11.5h-2v-5.5h11v5.5h-2M4.5 9.5h7v4h-7z",
  lock: "M4 7h8v6.5H4zM5.5 7V5a2.5 2.5 0 015 0v2",
  minus: "M4 8h8",
};

export function Icon({ name, size = 14, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}

export type { IconName };
