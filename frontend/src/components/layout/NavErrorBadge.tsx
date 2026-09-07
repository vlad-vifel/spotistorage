import { cn } from "@/lib/utils";

interface Props {
  count: number;
  className?: string;
}

export function NavErrorBadge({ count, className }: Props) {
  return (
    <span
      className={cn(
        "text-xs font-medium rounded-full bg-destructive/15 text-destructive px-1.5 py-0.5 tabular-nums max-md:bg-destructive max-md:text-destructive-foreground max-md:px-1 max-md:py-0",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
