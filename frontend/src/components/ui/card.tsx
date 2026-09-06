import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl border border-border/50 bg-card text-card-foreground", className)}
      {...props}
    />
  );
}

export { Card };
