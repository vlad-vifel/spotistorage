import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { SourceArtwork } from "@/components/common/SourceArtwork";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  contentClassName?: string;
  artworkUrl?: string | null;
  artworkName: string;
  artworkClassName: string;
  artworkIconClassName?: string;
  artworkStyle?: CSSProperties;
  /** Wraps the artwork in a Link to this path, for cards that open a detail page. */
  artworkHref?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
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
}: Props) {
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
    <Card className={cn("flex overflow-hidden", className)}>
      {artwork}
      <div className={cn("flex flex-col justify-between min-w-0 flex-1", contentClassName)}>
        {children}
      </div>
      {rightSlot}
    </Card>
  );
}
