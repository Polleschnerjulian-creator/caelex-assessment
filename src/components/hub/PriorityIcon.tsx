import { AlertTriangle, ArrowUp, Minus, ArrowDown } from "lucide-react";

type Priority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";

interface PriorityIconProps {
  priority: Priority;
  showLabel?: boolean;
  size?: number;
}

const PRIORITY_CONFIG: Record<
  Priority,
  { icon: React.ElementType; colorClass: string; label: string }
> = {
  URGENT: { icon: AlertTriangle, colorClass: "text-red-400", label: "Urgent" },
  HIGH: { icon: ArrowUp, colorClass: "text-orange-400", label: "High" },
  MEDIUM: { icon: Minus, colorClass: "text-blue-400", label: "Medium" },
  LOW: { icon: ArrowDown, colorClass: "text-slate-400", label: "Low" },
};

export function PriorityIcon({
  priority,
  showLabel = false,
  size = 14,
}: PriorityIconProps) {
  const { icon: Icon, colorClass, label } = PRIORITY_CONFIG[priority];

  return (
    <span className={`inline-flex items-center gap-1 ${colorClass}`}>
      <Icon size={size} strokeWidth={2} />
      {showLabel && <span className="text-caption font-medium">{label}</span>}
    </span>
  );
}
