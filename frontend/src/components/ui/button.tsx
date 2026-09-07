import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 max-md:[&_svg]:size-4 shrink-0 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring focus-visible:outline-none active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 border border-destructive/20",
        outline:
          "border border-input bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 max-md:h-10 max-md:px-4 max-md:text-sm",
        xs: "h-6 rounded-sm px-2 text-xs max-md:h-10 max-md:rounded-md max-md:px-3 max-md:text-sm",
        sm: "h-8 rounded-md px-3 text-xs max-md:h-10 max-md:px-3.5 max-md:text-sm",
        lg: "h-10 rounded-md px-6 max-md:px-6 max-md:text-sm",
        icon: "size-9 max-md:size-10",
        "icon-sm": "size-8 max-md:size-9",
        "icon-xs": "size-6 max-md:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}

export { Button, buttonVariants };
