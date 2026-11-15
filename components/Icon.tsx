import type { CSSProperties } from "react";

const paths = {
  arrow: "M5 12h14m-6-6 6 6-6 6",
  back: "M19 12H5m6-6-6 6 6 6",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  play: "m9 5 11 7-11 7V5Z",
  book: "M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-4-2-7-1-10 1Zm0 0v15",
  cards: "m4 5 12-2 3 16-12 2L4 5Zm-1 5-1 8 4 1M8 8l6-1M9 12l6-1",
  quiz: "M9 5h6m-6 0V3h6v2m-6 0H5v16h14V5h-4M8 10h1m3 0h4M8 15h1m3 0h4",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-10-6v6l4 2",
  notes: "M8 3H4v18h16v-4M7 12l10-10 5 5-10 10H7v-5Zm8-8 5 5M7 19h8",
  link: "m9 15 6-6m-7 8-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2-1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
  chevron: "m9 5 7 7-7 7",
  refresh:
    "M20 7v5h-5M4 17v-5h5M5 7a8 8 0 0 1 14-1l1 6M4 12l1 6a8 8 0 0 0 14-1",
  transcript: "M4 6h16M4 10h16M4 14h10M4 18h7m9-4v6m-3-3h6",
  chat: "M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 20.5l1.4-5.2A8.5 8.5 0 1 1 21 11.5ZM8.5 10h7m-7 3.5h4",
  download: "M12 3v12m-5-5 5 5 5-5M4 20h16",
  print: "M7 9V3h10v6M7 17H4v-8h16v8h-3M7 14h10v7H7v-7Z",
  shuffle: "M3 7h4l9 10h5m0 0-3-3m3 3-3 3M3 17h4l2.5-2.8M13 9.8 16 7h5m0 0-3-3m3 3-3 3",
  send: "m4 12 16-8-5.5 16-3-6.5L4 12Zm7.5 1.5L20 4",
  target: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-5 0a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z",
} as const;

export type IconName = keyof typeof paths;

export default function Icon({
  name,
  size = 20,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
