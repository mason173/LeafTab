"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { MaterialSurfaceFrame } from "@/components/frosted/MaterialSurfaceFrame";
import { getFrostedSurfacePreset } from "@/components/frosted/frostedSurfacePresets";
import { useStableElementState } from "@/hooks/useStableElementState";

import { cn } from "./utils";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const [surfaceNode, handleSurfaceNodeRef] = useStableElementState<HTMLDivElement>();
  const frostedTooltipPreset = getFrostedSurfacePreset("popover-panel");
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={handleSurfaceNodeRef}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "relative isolate z-50 w-fit origin-(--radix-tooltip-content-transform-origin) overflow-hidden border border-border bg-transparent text-popover-foreground shadow-md backdrop-blur-none",
          frostedTooltipPreset.shellClassName,
          className,
          "!bg-transparent !backdrop-blur-none",
        )}
        {...props}
      >
        <MaterialSurfaceFrame
          surfaceNode={surfaceNode}
          preset="popover-panel"
          radiusClassName={frostedTooltipPreset.radiusClassName}
          contentClassName="px-3 py-1.5 text-xs text-balance"
        >
          {children}
        </MaterialSurfaceFrame>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
