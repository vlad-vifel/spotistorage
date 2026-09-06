import type { CSSProperties } from "react";
import { Music2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  url?: string | null;
  name: string;
  className?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  style?: CSSProperties;
}

export function SourceArtwork({ url, name, className, icon: Icon = Music2, iconClassName, style }: Props) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        style={style}
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div style={style} className={cn("bg-muted flex items-center justify-center", className)}>
      <Icon className={cn("size-1/3 text-muted-foreground", iconClassName)} />
    </div>
  );
}
