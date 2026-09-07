import { useState } from "react";
import { MoreVertical, Loader2, type LucideIcon } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

export interface ActionItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: "default" | "destructive";
}

interface Props {
  items: ActionItem[];
  label?: string;
  icon?: LucideIcon;
  align?: "start" | "end";
  className?: string;
}

export function ActionMenu({ items, label, icon: TriggerIcon = MoreVertical, align = "end", className }: Props) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      className={cn("p-2.5 -m-2.5 text-muted-foreground hover:text-foreground transition-colors", className)}
      aria-label={label ?? "More actions"}
    >
      <TriggerIcon className="size-4" />
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="p-2">
          <SheetHeader className="p-2 pb-1">
            <SheetTitle className="text-sm">{label ?? "Actions"}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 h-12 px-4 rounded-md text-left text-sm transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-50",
                  item.variant === "destructive" && "text-destructive"
                )}
                disabled={item.disabled || item.pending}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
              >
                {item.pending ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : item.icon ? (
                  <item.icon className="size-4 shrink-0" />
                ) : null}
                {item.label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {items.map((item, i) => (
          <DropdownMenuItem
            key={i}
            variant={item.variant}
            disabled={item.disabled || item.pending}
            onSelect={() => item.onSelect()}
          >
            {item.pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : item.icon ? (
              <item.icon className="size-4" />
            ) : null}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
