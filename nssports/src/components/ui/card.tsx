import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Modern sleek container - fully fluid and responsive
        "bg-card text-card-foreground flex flex-col w-full min-w-0",
        "border border-border/60 rounded-lg",
        "shadow-sm shadow-black/5",
        // Subtle backdrop blur for depth
        "backdrop-blur-sm",
        // Refined hover interactions - desktop only
        "md:transition-shadow md:duration-200 md:ease-out",
        "md:hover:border-border md:hover:shadow-md md:hover:shadow-black/10",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Sleeker header spacing - fully fluid responsive
        "flex flex-col gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 w-full min-w-0",
        // Border separator
        "border-b border-border/40",
        className
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn(
        "text-sm font-semibold leading-tight tracking-tight text-foreground",
        className
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn(
        "text-xs leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div 
      data-slot="card-content" 
      className={cn(
        // Fully fluid responsive content padding
        "px-3 sm:px-4 py-2.5 sm:py-3 w-full min-w-0",
        className
      )} 
      {...props} 
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        // Fully fluid responsive footer
        "flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 w-full min-w-0",
        // Top border separator
        "border-t border-border/40",
        className
      )}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
