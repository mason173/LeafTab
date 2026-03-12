"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch@1.1.3";
import { motion } from "framer-motion";

import { cn } from "./utils";

type SwitchThumbProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Thumb> & {
  pressedAnimation?: {
    width?: number;
    height?: number;
    scale?: number;
  };
};

const SwitchThumb = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Thumb>, SwitchThumbProps>(
  ({ className, pressedAnimation = { width: 22 }, ...props }, ref) => {
    return (
      <SwitchPrimitive.Thumb ref={ref} asChild {...props}>
        <motion.span
          data-slot="switch-thumb"
          className={cn("block h-full aspect-square rounded-full bg-background", className)}
          whileTap={pressedAnimation}
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        />
      </SwitchPrimitive.Thumb>
    );
  },
);

SwitchThumb.displayName = SwitchPrimitive.Thumb.displayName;

function Switch({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center justify-start rounded-full border border-border p-0.5 transition-colors outline-none data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </SwitchPrimitive.Root>
  );
}

export { Switch, SwitchThumb };
