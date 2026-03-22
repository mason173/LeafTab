"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch@1.1.3";

import { cn } from "@/components/ui/utils";

type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>;

function Switch({ className, children, ...props }: SwitchProps) {
  return (
    <SwitchPrimitives.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6 w-10 shrink-0 items-center justify-start rounded-full border border-border p-0.5 outline-none transition-colors data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children ?? <SwitchThumb />}
    </SwitchPrimitives.Root>
  );
}

type SwitchThumbProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Thumb> & {
  pressedAnimation?: unknown;
};

function SwitchThumb({ className, ...props }: SwitchThumbProps) {
  return (
    <SwitchPrimitives.Thumb
      data-slot="switch-thumb"
      className={cn("block h-full aspect-square rounded-full bg-background", className)}
      {...props}
    />
  );
}

type SwitchIconPosition = "left" | "right" | "thumb";

type SwitchIconProps = React.ComponentPropsWithoutRef<"div"> & {
  position: SwitchIconPosition;
};

function SwitchIcon({ position: _position, ...props }: SwitchIconProps) {
  return <div {...props} />;
}

function useSwitch() {
  return {
    isChecked: false,
    setIsChecked: () => {},
    isPressed: false,
    setIsPressed: () => {},
  };
}

export {
  Switch,
  SwitchThumb,
  SwitchIcon,
  useSwitch,
  type SwitchProps,
  type SwitchThumbProps,
  type SwitchIconProps,
  type SwitchIconPosition,
};
