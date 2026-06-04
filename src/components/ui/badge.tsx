import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        success:
          "border-emerald-200/70 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200/70 bg-amber-50 text-amber-700",
        info: "border-sky-200/70 bg-sky-50 text-sky-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
