import type { CSSProperties } from "react";

type FluidBackdropProps = {
  overlay?: string;
  imageOpacity?: number;
  accentOpacity?: number;
  imageSrc?: string;
};

const layer: CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
};

export default function FluidBackdrop({
  overlay = "linear-gradient(115deg, rgba(3, 5, 18, 0.12) 0%, rgba(3, 5, 18, 0.32) 45%, rgba(3, 5, 18, 0.72) 100%)",
  imageOpacity = 0.98,
  accentOpacity = 1,
  imageSrc = "/fluid-bg.jpg",
}: FluidBackdropProps) {
  return (
    <>
      <div aria-hidden style={{ ...layer, zIndex: 0, background: "#050714" }} />
      <div
        aria-hidden
        style={{
          ...layer,
          zIndex: 0,
          backgroundImage: `${overlay}, url("${imageSrc}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: imageOpacity,
          transform: "scale(1.03)",
          filter: "saturate(1.72) contrast(1.18) brightness(1.08)",
          animation: "fluidDrift 32s ease-in-out infinite alternate",
          willChange: "transform",
        }}
      />
      <div
        aria-hidden
        style={{
          ...layer,
          zIndex: 0,
          background: [
            "linear-gradient(120deg, rgba(0,229,255,0.28), transparent 34%, rgba(255,43,194,0.22) 72%, rgba(255,64,64,0.2))",
            "linear-gradient(260deg, rgba(39,100,255,0.38), transparent 46%, rgba(255,176,0,0.12))",
            "linear-gradient(180deg, rgba(4, 6, 18, 0.02), rgba(4, 6, 18, 0.32) 46%, rgba(4, 6, 18, 0.66) 100%)",
          ].join(", "),
          opacity: accentOpacity,
          mixBlendMode: "plus-lighter",
          animation: "fluidGlow 18s ease-in-out infinite alternate",
        }}
      />
      <div
        aria-hidden
        style={{
          ...layer,
          zIndex: 0,
          background:
            "linear-gradient(180deg, rgba(4, 6, 18, 0.04) 0%, rgba(4, 6, 18, 0.18) 22%, rgba(4, 6, 18, 0.62) 100%)",
          animation: "fluidVeil 16s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        style={{
          ...layer,
          zIndex: 0,
          opacity: 0.08,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
          backgroundSize: "54px 54px",
          maskImage: "linear-gradient(180deg, transparent, black 18%, black 76%, transparent)",
        }}
      />
      <style jsx global>{`
        @keyframes fluidDrift {
          0% {
            transform: scale(1.03) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.08) translate3d(-1.4%, 1%, 0);
          }
          100% {
            transform: scale(1.05) translate3d(1.2%, -1.5%, 0);
          }
        }

        @keyframes fluidGlow {
          0% {
            opacity: 0.74;
            filter: blur(0px);
          }
          50% {
            opacity: 1;
            filter: blur(8px);
          }
          100% {
            opacity: 0.82;
            filter: blur(0px);
          }
        }

        @keyframes fluidVeil {
          0%,
          100% {
            opacity: 0.92;
          }
          50% {
            opacity: 0.76;
          }
        }
      `}</style>
    </>
  );
}
