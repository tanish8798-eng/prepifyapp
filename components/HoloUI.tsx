import type { CSSProperties, ReactNode } from "react";

type Accent = "cyan" | "violet" | "pink" | "amber" | "lime" | "blue";

const ACCENTS: Record<
  Accent,
  {
    line: string;
    glow: string;
    chip: string;
    text: string;
    shadow: string;
  }
> = {
  cyan: {
    line: "linear-gradient(135deg, rgba(103,232,249,0.85), rgba(37,99,235,0.4), rgba(103,232,249,0.65))",
    glow: "rgba(34,211,238,0.2)",
    chip: "linear-gradient(135deg, rgba(103,232,249,0.28), rgba(14,165,233,0.12))",
    text: "#8ff6ff",
    shadow: "0 18px 42px rgba(8,145,178,0.18)",
  },
  violet: {
    line: "linear-gradient(135deg, rgba(196,181,253,0.88), rgba(139,92,246,0.38), rgba(196,181,253,0.7))",
    glow: "rgba(167,139,250,0.2)",
    chip: "linear-gradient(135deg, rgba(196,181,253,0.24), rgba(124,58,237,0.1))",
    text: "#ddd0ff",
    shadow: "0 18px 42px rgba(124,58,237,0.16)",
  },
  pink: {
    line: "linear-gradient(135deg, rgba(255,110,199,0.86), rgba(255,43,194,0.36), rgba(255,170,220,0.7))",
    glow: "rgba(255,43,194,0.22)",
    chip: "linear-gradient(135deg, rgba(255,110,199,0.22), rgba(255,43,194,0.1))",
    text: "#ff9ee4",
    shadow: "0 18px 42px rgba(255,43,194,0.16)",
  },
  amber: {
    line: "linear-gradient(135deg, rgba(251,191,36,0.9), rgba(249,115,22,0.32), rgba(254,240,138,0.66))",
    glow: "rgba(251,191,36,0.18)",
    chip: "linear-gradient(135deg, rgba(251,191,36,0.22), rgba(245,158,11,0.08))",
    text: "#ffd97f",
    shadow: "0 18px 42px rgba(245,158,11,0.14)",
  },
  lime: {
    line: "linear-gradient(135deg, rgba(132,255,130,0.88), rgba(34,197,94,0.3), rgba(190,242,100,0.66))",
    glow: "rgba(74,222,128,0.18)",
    chip: "linear-gradient(135deg, rgba(132,255,130,0.22), rgba(34,197,94,0.08))",
    text: "#bdffb1",
    shadow: "0 18px 42px rgba(34,197,94,0.14)",
  },
  blue: {
    line: "linear-gradient(135deg, rgba(147,197,253,0.9), rgba(59,130,246,0.36), rgba(125,211,252,0.68))",
    glow: "rgba(59,130,246,0.18)",
    chip: "linear-gradient(135deg, rgba(147,197,253,0.22), rgba(59,130,246,0.08))",
    text: "#b8d9ff",
    shadow: "0 18px 42px rgba(37,99,235,0.14)",
  },
};

export function appPageStyle(): CSSProperties {
  return {
    minHeight: "100vh",
    background: "#050714",
    color: "#f8fafc",
    position: "relative",
    overflow: "hidden",
    fontFamily: "Trebuchet MS, Segoe UI, sans-serif",
  };
}

export function pageContainerStyle(maxWidth = 1180): CSSProperties {
  return {
    width: "100%",
    maxWidth,
    margin: "0 auto",
    padding: "clamp(22px, 3vw, 38px) clamp(14px, 2.5vw, 26px) 64px",
  };
}

export function ambientOrbStyle(
  top: string,
  side: "left" | "right",
  size: number,
  gradient: string,
  animationDelay = "0s",
): CSSProperties {
  return {
    position: "absolute",
    top,
    [side]: "5%",
    width: size,
    height: size,
    borderRadius: "50%",
    background: gradient,
    filter: "blur(24px)",
    opacity: 0.92,
    pointerEvents: "none",
    animation: `orbFloat 14s ease-in-out ${animationDelay} infinite`,
  };
}

export function HoloPanel({
  children,
  accent = "cyan",
  radius = 28,
  padding = 22,
  style,
  className = "",
}: {
  children: ReactNode;
  accent?: Accent;
  radius?: number;
  padding?: number | string;
  style?: CSSProperties;
  className?: string;
}) {
  const theme = ACCENTS[accent];
  return (
    <div className={className} style={{ position: "relative", borderRadius: radius, ...style }}>
      <div
        style={{
          position: "absolute",
          inset: "-1px",
          borderRadius: radius,
          background: theme.line,
          opacity: 0.52,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "-10px",
          borderRadius: radius + 10,
          background: theme.glow,
          filter: "blur(22px)",
          opacity: 0.46,
        }}
      />
      <div
        style={{
          position: "relative",
          borderRadius: radius,
          padding,
          background:
            "linear-gradient(180deg, rgba(9,13,30,0.86), rgba(7,10,24,0.94) 58%, rgba(5,7,18,0.98) 100%)",
          border: "1px solid rgba(226,232,240,0.1)",
          backdropFilter: "blur(20px)",
          boxShadow: `0 22px 54px rgba(2,6,23,0.34), ${theme.shadow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.018) 30%, rgba(255,255,255,0) 50%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -42,
            right: -34,
            width: 130,
            height: 130,
            borderRadius: "50%",
            background: theme.glow,
            filter: "blur(16px)",
            opacity: 0.38,
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

export function SectionLead({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div style={{ textAlign: align, marginBottom: 24 }}>
      <div
        style={{
          display: align === "center" ? "inline-flex" : "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 16px",
          borderRadius: 9999,
          background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))",
          border: "1px solid rgba(125,211,252,0.14)",
          color: "rgba(226,232,240,0.7)",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#67e8f9,#ff2bc2)",
            boxShadow: "0 0 18px rgba(103,232,249,0.55)",
          }}
        />
        {eyebrow}
      </div>
      <h1
        style={{
          color: "#f8fafc",
          fontSize: "clamp(2rem, 3.3vw, 3.35rem)",
          lineHeight: 1.02,
          fontWeight: 900,
          letterSpacing: 0,
          marginBottom: body ? 12 : 0,
        }}
      >
        {title}
      </h1>
      {body ? (
        <p
          style={{
            color: "rgba(226,232,240,0.68)",
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.8,
            maxWidth: align === "center" ? 760 : 680,
            margin: align === "center" ? "0 auto" : undefined,
          }}
        >
          {body}
        </p>
      ) : null}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  accent = "cyan",
  detail,
  className = "",
}: {
  label: string;
  value: string;
  accent?: Accent;
  detail?: string;
  className?: string;
}) {
  const theme = ACCENTS[accent];
  return (
    <HoloPanel accent={accent} radius={22} padding={18} className={className}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <p style={{ color: theme.text, fontSize: "1.7rem", fontWeight: 900, lineHeight: 1 }}>{value}</p>
          <p style={{ color: "rgba(226,232,240,0.7)", fontSize: 12, fontWeight: 800, marginTop: 8 }}>{label}</p>
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 14,
            background: theme.chip,
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: theme.shadow,
          }}
        />
      </div>
      {detail ? (
        <p style={{ color: "rgba(226,232,240,0.42)", fontSize: 11, fontWeight: 700, marginTop: 12 }}>{detail}</p>
      ) : null}
    </HoloPanel>
  );
}

export function ActionLink({
  href,
  label,
  accent = "cyan",
  secondary,
  className = "",
}: {
  href: string;
  label: string;
  accent?: Accent;
  secondary?: boolean;
  className?: string;
}) {
  const theme = ACCENTS[accent];
  return (
    <a
      href={href}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "14px 20px",
        borderRadius: 16,
        textDecoration: "none",
        color: "#f8fafc",
        fontSize: 14,
        fontWeight: 900,
        background: secondary
          ? "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))"
          : theme.line,
        border: secondary ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(255,255,255,0.08)",
        boxShadow: secondary ? "0 18px 40px rgba(2,6,23,0.18)" : theme.shadow,
      }}
    >
      {label}
    </a>
  );
}

export function EmptyDock({
  title,
  body,
  actionHref,
  actionLabel,
  accent = "cyan",
  className = "",
}: {
  title: string;
  body: string;
  actionHref: string;
  actionLabel: string;
  accent?: Accent;
  className?: string;
}) {
  return (
    <HoloPanel accent={accent} radius={30} padding={28} className={className}>
      <div style={{ minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: 24,
            background: "linear-gradient(135deg, rgba(103,232,249,0.2), rgba(255,43,194,0.14), rgba(147,197,253,0.16))",
            border: "1px solid rgba(125,211,252,0.18)",
            boxShadow: "0 18px 40px rgba(59,130,246,0.18)",
            marginBottom: 18,
          }}
        />
        <h2 style={{ color: "#fff", fontSize: "1.45rem", fontWeight: 900, marginBottom: 10 }}>{title}</h2>
        <p style={{ color: "rgba(226,232,240,0.62)", fontSize: 14, fontWeight: 600, lineHeight: 1.8, maxWidth: 520, marginBottom: 20 }}>
          {body}
        </p>
        <ActionLink href={actionHref} label={actionLabel} accent={accent} />
      </div>
    </HoloPanel>
  );
}

export function CommandField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          inset: "-2px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(103,232,249,0.8), rgba(59,130,246,0.26), rgba(255,43,194,0.36))",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "-14px",
          borderRadius: 30,
          background: "rgba(37,99,235,0.14)",
          filter: "blur(22px)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "15px 18px",
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(8,12,29,0.88), rgba(8,10,22,0.96))",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(103,232,249,0.22), rgba(255,43,194,0.12))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#8ff6ff",
            fontSize: 16,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          ?
        </div>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
          }}
        />
      </div>
    </div>
  );
}
