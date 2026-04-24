"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

type SwitchThumbProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Thumb> & {
  pressedAnimation?: unknown;
};

const SwitchThumb = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Thumb>,
  SwitchThumbProps
>(({ className, pressedAnimation: _pressedAnimation, ...props }, ref) => {
  return (
    <SwitchPrimitive.Thumb
      ref={ref}
      data-slot="switch-thumb"
      className={cn("block h-full aspect-square rounded-full bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.14)] dark:bg-white/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.28)]", className)}
      {...props}
    />
  );
});

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
        "relative inline-flex h-6 w-10 shrink-0 items-center justify-start rounded-full border border-border p-0.5 outline-none transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </SwitchPrimitive.Root>
  );
}

export { Switch, SwitchThumb };
