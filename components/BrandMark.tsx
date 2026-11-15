import { useId } from "react";

type BrandMarkProps = { size?: number; compact?: boolean };

export default function BrandMark({
  size = 34,
  compact = false,
}: BrandMarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const stroke = `brand-stroke-${id}`;
  const fill = `brand-fill-${id}`;
  return (
    <span className="brand-mark">
      <svg
        className="brand-glyph"
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={stroke}
            x1="6"
            y1="6"
            x2="34"
            y2="34"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#22E3FF" />
            <stop offset="0.55" stopColor="#8B5CFF" />
            <stop offset="1" stopColor="#FF3EC8" />
          </linearGradient>
          <radialGradient
            id={fill}
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(13 10) rotate(52) scale(36)"
          >
            <stop stopColor="#1C2260" />
            <stop offset="1" stopColor="#070818" />
          </radialGradient>
        </defs>
        <rect
          x="1.25"
          y="1.25"
          width="37.5"
          height="37.5"
          rx="12"
          fill={`url(#${fill})`}
          stroke={`url(#${stroke})`}
          strokeWidth="1.5"
        />
        <path
          d="M12 29V11h9c6 0 9 3 9 8s-3 8-9 8h-4"
          stroke={`url(#${stroke})`}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m26 9 2-4 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z"
          fill="#FF6BD8"
        />
      </svg>
      {!compact && (
        <span className="brand-word">
          prepify<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
