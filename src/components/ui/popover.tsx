"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { MaterialSurfaceFrame } from "@/components/frosted/MaterialSurfaceFrame";
import { getFrostedSurfacePreset, type FrostedSurfacePreset } from "@/components/frosted/frostedSurfacePresets";
import type { FrostedSurfaceTone } from "@/components/frosted/FrostedBackdrop";
import { useStableElementState } from "@/hooks/useStableElementState";

import { cn } from "./utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  children,
  surfaceVariant = "frosted",
  surfacePreset = "popover-panel",
  surfaceTone = "default",
  surfaceContentClassName,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  surfaceVariant?: "solid" | "frosted";
  surfacePreset?: FrostedSurfacePreset;
  surfaceTone?: FrostedSurfaceTone;
  surfaceContentClassName?: string;
}) {
  const [surfaceNode, handleSurfaceNodeRef] = useStableElementState<HTMLDivElement>();
  const frostedPopoverPreset = getFrostedSurfacePreset(surfacePreset);
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={handleSurfaceNodeRef}
        data-slot="popover-content"
        aria-describedby={undefined}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-[18020] w-72 origin-(--radix-popover-content-transform-origin) outline-hidden",
          surfaceVariant === "frosted"
            ? cn(
                "relative isolate overflow-hidden border border-border bg-transparent text-popover-foreground backdrop-blur-none",
                frostedPopoverPreset.shellClassName,
              )
            : "rounded-xl border border-border bg-popover/80 p-4 text-popover-foreground shadow-md backdrop-blur-md",
          className,
          surfaceVariant === "frosted" ? "!bg-transparent !backdrop-blur-none" : undefined,
        )}
        {...props}
      >
        {surfaceVariant === "frosted" ? (
          <MaterialSurfaceFrame
            surfaceNode={surfaceNode}
            preset={surfacePreset}
            tone={surfaceTone}
            radiusClassName={frostedPopoverPreset.radiusClassName}
            contentClassName={cn("p-4", surfaceContentClassName)}
          >
            {children}
          </MaterialSurfaceFrame>
        ) : children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
