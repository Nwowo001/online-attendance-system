"use client";
import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function Badge({ status, label, className }: BadgeProps) {
  return (
    <span className={cn("badge", getStatusColor(status), className)}>
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className, showLabel = true }: ProgressBarProps) {
  const pct = Math.min(Math.round((value / max) * 100), 100);
  const color = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        {showLabel && <span>{pct}%</span>}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={cn("h-2 rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
