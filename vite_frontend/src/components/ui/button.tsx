import { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-[color:var(--color-focus-ring)] focus-visible:ring-[color:var(--color-focus-ring)]/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive shadow-xs",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground shadow-md hover:bg-accent/90",
        destructive:
          "bg-destructive text-white shadow-md hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-[color:var(--color-border)] bg-background/80 shadow-xs hover:bg-accent/10 hover:text-accent-foreground",
        secondary:
          "bg-secondary/80 text-secondary-foreground shadow-xs hover:bg-secondary/90",
        ghost: "hover:bg-accent/10 hover:text-accent-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        // Professional betting variants
        bet: "bg-accent/10 text-accent border border-accent/20 shadow-xs hover:bg-accent/20 hover:border-accent/30 active:bg-accent/30 transition-all duration-200 transform active:scale-95",
        "bet-positive":
          "bg-[color:var(--color-win)]/10 text-[color:var(--color-win)] border border-[color:var(--color-win)]/20 shadow-xs hover:bg-[color:var(--color-win)]/20 hover:border-[color:var(--color-win)]/30 active:bg-[color:var(--color-win)]/30 transition-all duration-200 transform active:scale-95",
        "bet-negative":
          "bg-[color:var(--color-loss)]/10 text-[color:var(--color-loss)] border border-[color:var(--color-loss)]/20 shadow-xs hover:bg-[color:var(--color-loss)]/20 hover:border-[color:var(--color-loss)]/30 active:bg-[color:var(--color-loss)]/30 transition-all duration-200 transform active:scale-95",
        "bet-selected":
          "bg-accent text-accent-foreground border-accent shadow-lg ring-2 ring-accent/20 transform scale-[1.02]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
