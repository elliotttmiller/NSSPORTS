import { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-gradient-to-br from-[color:var(--color-card-soft)] to-[color:var(--color-card)] text-card-foreground flex flex-col border border-[color:var(--color-border)] transition-transform duration-200 backdrop-blur-md hover:-translate-y-0.5 hover:scale-[1.015]",
        className,
      )}
      style={{
        borderRadius: "var(--fluid-radius)",
        gap: "var(--fluid-gap)",
        padding: "var(--fluid-panel-padding)",
      }}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      style={{
        gap: "var(--fluid-gap)",
        paddingLeft: "var(--fluid-panel-padding)",
        paddingRight: "var(--fluid-panel-padding)",
      }}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(className)}
      style={{
        paddingLeft: "var(--fluid-panel-padding)",
        paddingRight: "var(--fluid-panel-padding)",
      }}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center [.border-t]:pt-6", className)}
      style={{
        paddingLeft: "var(--fluid-panel-padding)",
        paddingRight: "var(--fluid-panel-padding)",
      }}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
