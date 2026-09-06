interface Props {
  value: number;
  size?: number;
  strokeWidth?: number;
  indeterminate?: boolean;
}

export function CircularProgress({ value, size = 15, strokeWidth = 2, indeterminate = false }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 1);
  const offset = indeterminate ? circumference * 0.75 : circumference * (1 - clamped);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={indeterminate ? "animate-spin shrink-0" : "-rotate-90 shrink-0"}
      overflow="visible"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className={indeterminate ? "" : "transition-[stroke-dashoffset] duration-300"}
      />
    </svg>
  );
}
