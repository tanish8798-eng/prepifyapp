import Icon, { type IconName } from "@/components/Icon";

export function NextActivity({
  title,
  label,
  icon,
  onClick,
}: {
  title: string;
  label: string;
  icon: IconName;
  onClick: () => void;
}) {
  return (
    <div className="next-activity">
      <span className="next-icon">
        <Icon name={icon} size={23} />
      </span>
      <div>
        <p className="eyebrow">NEXT LITTLE STEP</p>
        <h3>{title}</h3>
      </div>
      <button className="button button-outline" onClick={onClick}>
        {label}
        <Icon name="arrow" size={16} />
      </button>
    </div>
  );
}

export function EmptyActivity({ text }: { text: string }) {
  return (
    <div className="empty-activity">
      <span className="neon-orb" aria-hidden="true">
        <Icon name="spark" size={30} />
      </span>
      <p>{text}</p>
    </div>
  );
}

export function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(
    element &&
      (element.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)),
  );
}

export function isControlTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(
    element &&
      (isTypingTarget(element) ||
        element.closest("button, a, summary, [role='tablist']")),
  );
}
