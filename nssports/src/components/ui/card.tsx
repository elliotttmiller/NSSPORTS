import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-background text-card-foreground flex flex-col border border-border rounded-lg shadow-sm outline-[0.5px] outline-white/10",
        // Mobile: Completely non-interactive, no animations, no cursor changes
        // Desktop: Interactive with hover animations
        "md:transition-all md:duration-300 md:ease-[cubic-bezier(.4,0,.2,1)] md:hover:shadow-xl md:hover:-translate-y-1.5 md:hover:scale-[1.025] md:active:scale-95 md:focus-within:ring-2 md:focus-within:ring-accent/40 md:cursor-pointer",
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
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div 
      data-slot="card-content" 
      className={cn("p-6 pt-0", className)} 
      {...props} 
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
