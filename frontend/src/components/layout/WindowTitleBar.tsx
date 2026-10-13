import type { MouseEvent, ReactNode } from "react";
import { Copy, Minus, Square, X } from "lucide-react";
import { WindowResizeGrips } from "./WindowResizeGrips";
import { useWindowMaximized } from "@/hooks/useWindowMaximized";
import { closeWindow, minimizeWindow, startWindowDrag, toggleMaximizeWindow } from "@/lib/desktopBridge";
import { cn } from "@/lib/utils";

function WindowButton({ label, onClick, danger, children }: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "flex w-11 items-center justify-center text-foreground/70 transition-colors outline-none",
        danger
          ? "hover:bg-destructive hover:text-destructive-foreground"
          : "hover:bg-foreground/10 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function WindowTitleBar() {
  const [maximized, setMaximized] = useWindowMaximized();

  const toggleMaximize = () => toggleMaximizeWindow().then(setMaximized).catch(() => {});

  const onDragAreaMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (e.detail === 2) void toggleMaximize();
    else void startWindowDrag();
  };

  return (
    <div className="flex h-6 shrink-0 select-none items-stretch bg-sidebar">
      {!maximized && <WindowResizeGrips />}
      <div className="flex-1" onMouseDown={onDragAreaMouseDown} />
      <WindowButton label="Minimize" onClick={() => void minimizeWindow()}>
        <Minus className="size-3.5" strokeWidth={1.5} />
      </WindowButton>
      <WindowButton label={maximized ? "Restore" : "Maximize"} onClick={() => void toggleMaximize()}>
        {maximized ? <Copy className="size-3 -scale-x-100" strokeWidth={1.5} /> : <Square className="size-3" strokeWidth={1.5} />}
      </WindowButton>
      <WindowButton label="Close" onClick={() => void closeWindow()} danger>
        <X className="size-3.5" strokeWidth={1.5} />
      </WindowButton>
    </div>
  );
}
