interface LabelBadgeProps {
  name: string;
  color: string;
}

export function LabelBadge({ name, color }: LabelBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-medium"
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
