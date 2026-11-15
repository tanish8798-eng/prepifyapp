import type { CSSProperties } from "react";
import Icon, { type IconName } from "@/components/Icon";

type NeonCoreProps = {
  size?: number;
  icon?: IconName;
  className?: string;
};

export default function NeonCore({
  size = 160,
  icon = "spark",
  className = "",
}: NeonCoreProps) {
  return (
    <span
      className={`neon-core ${className}`.trim()}
      style={{ "--core-size": `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <span className="neon-core-ring" />
      <span className="neon-core-ring neon-core-ring-alt" />
      <span className="neon-core-orbit" />
      <span className="neon-core-heart">
        <Icon name={icon} size={Math.round(size * 0.3)} />
      </span>
    </span>
  );
}
