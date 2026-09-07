import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { SourceArtwork } from "@/components/common/SourceArtwork";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  contentClassName?: string;
  artworkUrl?: string | null;
  artworkName: string;
  artworkClassName: string;
  artworkIconClassName?: string;
  artworkStyle?: CSSProperties;
  artworkHref?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function MediaCard({
  className,
  contentClassName,
  artworkUrl,
  artworkName,
  artworkClassName,
  artworkIconClassName,
  artworkStyle,
  artworkHref,
  rightSlot,
  children,
  actions,
}: Props) {
  const isMobile = useIsMobile();

  const artwork = artworkHref ? (
    <Link to={artworkHref} className={artworkClassName}>
      <SourceArtwork url={artworkUrl} name={artworkName} className="w-full h-full" />
    </Link>
  ) : (
    <SourceArtwork
      url={artworkUrl}
      name={artworkName}
      className={artworkClassName}
      iconClassName={artworkIconClassName}
      style={artworkStyle}
    />
  );

  return (
    <Card className={cn("overflow-hidden max-md:p-3 md:flex", className)}>
      <div className="flex gap-3 md:contents">
        {artwork}
        <div className={cn("min-w-0 flex-1 md:flex md:flex-col md:justify-between", contentClassName)}>
          {children}
          {actions && !isMobile && <div className="md:mt-3">{actions}</div>}
        </div>
      </div>
      {actions && isMobile && <div className="mt-3">{actions}</div>}
      {rightSlot}
    </Card>
  );
}
