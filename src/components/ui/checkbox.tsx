"use client";
import { cva, type VariantProps } from "class-variance-authority";

import {
  Checkbox as CheckboxPrimitive,
  CheckboxIndicator as CheckboxIndicatorPrimitive,
  type CheckboxProps as CheckboxPrimitiveProps,
} from "@/components/animate-ui/primitives/radix/checkbox";

import { cn } from "./utils";

const checkboxVariants = cva(
  "peer shrink-0 flex items-center justify-center outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-500 focus-visible:ring-offset-2 [&[data-state=checked],&[data-state=indeterminate]]:bg-primary [&[data-state=checked],&[data-state=indeterminate]]:text-primary-foreground",
  {
    variants: {
      variant: {
        default: "bg-input-background dark:bg-input/30 border border-border",
        accent: "bg-input border border-border",
      },
      size: {
        default: "size-4 rounded-[4px]",
        sm: "size-3.5 rounded-[4px]",
        lg: "size-5 rounded-[6px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const checkboxIndicatorVariants = cva("", {
  variants: {
    size: {
      default: "size-3",
      sm: "size-2.5",
      lg: "size-3.5",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

type CheckboxProps = CheckboxPrimitiveProps &
  VariantProps<typeof checkboxVariants>;

function Checkbox({
  className,
  children,
  variant,
  size,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive
      data-slot="checkbox"
      className={cn(checkboxVariants({ variant, size, className }))}
      {...props}
    >
      {children}
      <CheckboxIndicatorPrimitive
        data-slot="checkbox-indicator"
        className={cn(
          "flex items-center justify-center text-current transition-none",
          checkboxIndicatorVariants({ size }),
        )}
      />
    </CheckboxPrimitive>
  );
}

export { Checkbox, type CheckboxProps };
