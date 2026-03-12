"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch@1.1.3";
import {
  motion,
  type HTMLMotionProps,
  type LegacyAnimationControls,
  type TargetAndTransition,
  type VariantLabels,
} from "framer-motion";

import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/lib/get-strict-context";
import { cn } from "@/components/ui/utils";

type SwitchContextType = {
  isChecked: boolean;
  setIsChecked: (isChecked: boolean) => void;
  isPressed: boolean;
  setIsPressed: (isPressed: boolean) => void;
};

const [SwitchProvider, useSwitch] =
  getStrictContext<SwitchContextType>("SwitchContext");

type SwitchProps = Omit<
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>,
  "asChild"
> &
  HTMLMotionProps<"button">;

function Switch({
  className,
  children,
  checked,
  defaultChecked,
  onCheckedChange,
  type,
  ...props
}: SwitchProps) {
  const [isPressed, setIsPressed] = React.useState(false);
  const [isChecked, setIsChecked] = useControlledState({
    value: checked,
    defaultValue: defaultChecked,
    onChange: onCheckedChange,
  });

  return (
    <SwitchProvider value={{ isChecked, setIsChecked, isPressed, setIsPressed }}>
      <SwitchPrimitives.Root
        checked={isChecked}
        onCheckedChange={setIsChecked}
        asChild
      >
        <motion.button
          data-slot="switch"
          whileTap="tap"
          initial={false}
          onTapStart={() => setIsPressed(true)}
          onTapCancel={() => setIsPressed(false)}
          onTap={() => setIsPressed(false)}
          className={className}
          type={type ?? "button"}
          {...props}
        >
          {children ?? <SwitchThumb />}
        </motion.button>
      </SwitchPrimitives.Root>
    </SwitchProvider>
  );
}

type SwitchThumbProps = Omit<
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Thumb>,
  "asChild"
> &
  HTMLMotionProps<"div"> & {
    pressedAnimation?:
      | TargetAndTransition
      | VariantLabels
      | boolean
      | LegacyAnimationControls;
  };

function SwitchThumb({
  className,
  pressedAnimation,
  transition = { type: "spring", stiffness: 300, damping: 25 },
  ...props
}: SwitchThumbProps) {
  const { isPressed } = useSwitch();

  return (
    <SwitchPrimitives.Thumb asChild>
      <motion.div
        data-slot="switch-thumb"
        layout
        className={cn("block h-full aspect-square rounded-full bg-background", className)}
        transition={transition}
        animate={isPressed ? pressedAnimation : undefined}
        {...props}
      />
    </SwitchPrimitives.Thumb>
  );
}

type SwitchIconPosition = "left" | "right" | "thumb";

type SwitchIconProps = HTMLMotionProps<"div"> & {
  position: SwitchIconPosition;
};

function SwitchIcon({
  position,
  transition = { type: "spring", bounce: 0 },
  ...props
}: SwitchIconProps) {
  const { isChecked } = useSwitch();

  const isAnimated = React.useMemo(() => {
    if (position === "right") return !isChecked;
    if (position === "left") return isChecked;
    if (position === "thumb") return true;
    return false;
  }, [position, isChecked]);

  return (
    <motion.div
      data-slot={`switch-${position}-icon`}
      animate={isAnimated ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={transition}
      {...props}
    />
  );
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
  type SwitchContextType,
};
