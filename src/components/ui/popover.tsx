"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

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
  surfaceBackdrop,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  surfaceBackdrop?: React.ReactNode;
}) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        aria-describedby={undefined}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "bg-popover/80 text-popover-foreground z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-xl border border-border p-4 shadow-md outline-hidden backdrop-blur-md",
          surfaceBackdrop
            ? "[&>*:not([data-settings-surface-backdrop='true'])]:relative [&>*:not([data-settings-surface-backdrop='true'])]:z-10"
            : "",
          className,
        )}
        {...props}
      >
        {surfaceBackdrop}
        {props.children}
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
