"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import { MaterialSurfaceFrame } from "@/components/frosted/MaterialSurfaceFrame";
import { getFrostedSurfacePreset } from "@/components/frosted/frostedSurfacePresets";
import { useStableElementState } from "@/hooks/useStableElementState";

import { cn } from "./utils";

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  );
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  const [surfaceNode, handleSurfaceNodeRef] = useStableElementState<HTMLDivElement>();
  const frostedHoverCardPreset = getFrostedSurfacePreset("popover-panel");
  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        ref={handleSurfaceNodeRef}
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "relative isolate z-50 w-64 origin-(--radix-hover-card-content-transform-origin) overflow-hidden border border-border bg-transparent text-popover-foreground shadow-md outline-hidden backdrop-blur-none",
          frostedHoverCardPreset.shellClassName,
          className,
          "!bg-transparent !backdrop-blur-none",
        )}
        {...props}
      >
        <MaterialSurfaceFrame
          surfaceNode={surfaceNode}
          preset="popover-panel"
          radiusClassName={frostedHoverCardPreset.radiusClassName}
          contentClassName="p-4"
        >
          {props.children}
        </MaterialSurfaceFrame>
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardTrigger, HoverCardContent };
