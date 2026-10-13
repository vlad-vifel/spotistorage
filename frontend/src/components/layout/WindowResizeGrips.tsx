import type { MouseEvent } from "react";
import { startWindowResize, type ResizeEdge } from "@/lib/desktopBridge";
import { cn } from "@/lib/utils";

const GRIPS: { edge: ResizeEdge; className: string }[] = [
  { edge: "top", className: "inset-x-2 h-1 cursor-ns-resize" },
  { edge: "top-left", className: "left-0 size-2 cursor-nwse-resize" },
  { edge: "top-right", className: "right-0 size-2 cursor-nesw-resize" },
];

export function WindowResizeGrips() {
  const onMouseDown = (edge: ResizeEdge) => (e: MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    void startWindowResize(edge);
  };

  return GRIPS.map(({ edge, className }) => (
    <div key={edge} className={cn("fixed top-0 z-50", className)} onMouseDown={onMouseDown(edge)} />
  ));
}
