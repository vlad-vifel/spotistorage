import type { ReactNode } from "react";
import { RefreshCw, Download, Trash2, Loader2, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMissingCount, getRemovedCount } from "@/lib/status";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import type { Source, RefreshResult } from "@/api/types";
import type { useSourceActions } from "@/hooks/useSourceActions";

type Actions = ReturnType<typeof useSourceActions>;

interface Props {
  source: Source;
  actions: Actions;
  variant: "header" | "card";
  onRefreshed?: (result: RefreshResult) => void;
  onDeleteClick: () => void;
  onDeleteRemovedClick?: () => void;
}

function WithTooltip({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex", className)}>{children}</span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function SourceActions({ source, actions, variant, onRefreshed, onDeleteClick, onDeleteRemovedClick }: Props) {
  const { download, refresh, deleteSource, isDownloading, locked } = actions;
  const isMobile = useIsMobile();
  const missing = getMissingCount(source);
  const removed = onDeleteRemovedClick ? getRemovedCount(source) : 0;
  const size = variant === "card" ? "xs" : "sm";
  const iconSize = size === "xs" ? "size-3" : "size-3.5";
  const iconButtonSize = size === "xs" ? "icon-xs" : "icon-sm";
  const hasDownload = missing > 0 || isDownloading;
  const hasRemoved = removed > 0;
  const deleteLabel = `Delete ${source.type}`;
  const deleteDisabled = deleteSource.isPending || locked;
  const onRefresh = () => refresh.mutate(source.id, { onSuccess: onRefreshed });
  const refreshDisabled = refresh.isPending || locked;
  const refreshIcon = <RefreshCw className={cn(iconSize, refresh.isPending && "animate-spin")} />;
  const textButtonClass = isMobile ? "flex-1" : undefined;
  const textIconClass = cn(iconSize, variant === "header" && "md:max-lg:hidden");
  const both = hasDownload && hasRemoved;

  const downloadButton = hasDownload && (
    <Button size={size} className={textButtonClass} onClick={() => download.mutate(source.id)} disabled={locked}>
      {isDownloading ? (
        <><Loader2 className={`${iconSize} animate-spin`} /> Downloading</>
      ) : (
        <><Download className={textIconClass} /> Download ({missing})</>
      )}
    </Button>
  );

  const deleteRemovedButton = hasRemoved && (
    <Button
      variant="outline"
      size={size}
      className={cn(textButtonClass, isMobile && both && "max-sm:order-last max-sm:basis-full")}
      onClick={onDeleteRemovedClick}
      disabled={locked}
    >
      <Eraser className={textIconClass} /> Delete removed ({removed})
    </Button>
  );

  const refreshIconButton = (
    <Button variant="outline" size={iconButtonSize} className="shrink-0 max-md:size-10" onClick={onRefresh} disabled={refreshDisabled} aria-label="Refresh">
      {refreshIcon}
    </Button>
  );

  const refreshTextButton = (className?: string) => (
    <Button variant="outline" size={size} className={className} onClick={onRefresh} disabled={refreshDisabled}>
      {refreshIcon} Refresh
    </Button>
  );

  const deleteIconButton = (
    <Button variant="destructive" size={iconButtonSize} className="shrink-0 max-md:size-10" onClick={onDeleteClick} disabled={deleteDisabled} aria-label={deleteLabel}>
      <Trash2 className={iconSize} />
    </Button>
  );

  if (isMobile) {
    const onlyRefresh = !hasDownload && !hasRemoved;
    return (
      <div className="flex flex-wrap items-center gap-2 w-full">
        {downloadButton}
        {deleteRemovedButton}
        <div className={cn("flex items-center gap-2", onlyRefresh && "flex-1")}>
          {onlyRefresh ? refreshTextButton("flex-1") : refreshIconButton}
          {deleteIconButton}
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {downloadButton}
        {refreshTextButton()}
        <WithTooltip label={deleteLabel}>{deleteIconButton}</WithTooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {downloadButton}
      {deleteRemovedButton}
      {both && <WithTooltip label="Refresh" className="lg:hidden">{refreshIconButton}</WithTooltip>}
      {refreshTextButton(both ? "max-lg:hidden" : undefined)}
      {(hasDownload || hasRemoved) && <WithTooltip label={deleteLabel} className="lg:hidden">{deleteIconButton}</WithTooltip>}
      <Button
        variant="destructive"
        size={size}
        className={hasDownload || hasRemoved ? "max-lg:hidden" : undefined}
        onClick={onDeleteClick}
        disabled={deleteDisabled}
      >
        <Trash2 className={iconSize} /> {deleteLabel}
      </Button>
    </div>
  );
}
