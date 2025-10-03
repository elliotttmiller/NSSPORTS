import { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border border-[color:var(--color-border)] px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden bg-gradient-to-br from-[color:var(--color-card-soft)] to-[color:var(--color-card)] text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-accent bg-accent/10 text-accent-foreground",
        secondary: "border-secondary bg-secondary/20 text-secondary-foreground",
        destructive: "border-destructive bg-destructive/10 text-destructive",
        outline:
          "border-[color:var(--color-border)] text-foreground bg-background/60",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
