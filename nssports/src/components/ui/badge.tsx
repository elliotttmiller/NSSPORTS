import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends ComponentProps<"div"> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold md:transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-primary text-primary-foreground md:hover:bg-primary/80":
            variant === "default",
          "border-transparent bg-secondary text-secondary-foreground md:hover:bg-secondary/80":
            variant === "secondary",
          "border-transparent bg-destructive text-destructive-foreground md:hover:bg-destructive/80":
            variant === "destructive",
          "text-foreground": variant === "outline",
        },
        className
      )}
      {...props}
    />
  );
}
