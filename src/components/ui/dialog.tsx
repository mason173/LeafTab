"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { RiCloseFill as XIcon } from "@/icons/ri-compat";
import { MaterialSurfaceFrame } from "@/components/frosted/MaterialSurfaceFrame";
import { getFrostedSurfacePreset, type FrostedSurfacePreset } from "@/components/frosted/frostedSurfacePresets";
import type { FrostedSurfaceTone } from "@/components/frosted/FrostedBackdrop";
import { useStableElementState } from "@/hooks/useStableElementState";

import { cn } from "./utils";

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

function Dialog(props: DialogProps) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger(
  props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal(
  props: React.ComponentProps<typeof DialogPrimitive.Portal>,
) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose(
  props: React.ComponentProps<typeof DialogPrimitive.Close>,
) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogOverlayProps = React.ComponentProps<typeof DialogPrimitive.Overlay>;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  DialogOverlayProps
>(({ className, ...props }, ref) => {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-[18000] bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-200 data-[state=closed]:duration-200",
        className,
      )}
      {...props}
    />
  );
});

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

type DialogContentProps = React.ComponentProps<typeof DialogPrimitive.Content> & {
  overlayClassName?: string;
  overlayStyle?: React.CSSProperties;
  surfaceVariant?: "solid" | "frosted";
  surfaceTone?: FrostedSurfaceTone;
  surfacePreset?: FrostedSurfacePreset;
  surfaceContentClassName?: string;
};

function DialogContent({
  className,
  children,
  overlayClassName,
  overlayStyle,
  surfaceVariant = "frosted",
  surfaceTone = "default",
  surfacePreset = "dialog-panel",
  surfaceContentClassName,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: DialogContentProps) {
  const [surfaceNode, handleSurfaceNodeRef] = useStableElementState<HTMLDivElement>();
  const frostedDialogPreset = getFrostedSurfacePreset(surfacePreset);
  const resolvedOverlayClassName = cn(
    surfaceVariant === "frosted" ? "bg-black/0 dark:bg-black/16" : undefined,
    overlayClassName,
  );

  return (
    <DialogPortal>
      <DialogOverlay className={resolvedOverlayClassName} style={overlayStyle} />
      <div className="fixed inset-0 z-[18001] flex items-center justify-center p-4 pointer-events-none sm:p-6">
        <DialogPrimitive.Content
          ref={handleSurfaceNodeRef}
          data-slot="dialog-content"
          aria-describedby={undefined}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={onEscapeKeyDown}
          onPointerDownOutside={onPointerDownOutside}
          onInteractOutside={onInteractOutside}
          className={cn(
            "pointer-events-auto relative grid w-full min-w-0 max-w-[calc(100%-2rem)] gap-4 overflow-hidden rounded-[32px] border border-border p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-200 data-[state=closed]:duration-200 sm:max-w-lg",
            surfaceVariant === "frosted"
              ? cn(frostedDialogPreset.shellClassName, "bg-transparent")
              : "bg-background/80",
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
              radiusClassName={frostedDialogPreset.radiusClassName}
              contentClassName={surfaceContentClassName}
            >
              {children}
            </MaterialSurfaceFrame>
          ) : (
            <div className="grid" style={{ gap: "inherit" }}>
              {children}
            </div>
          )}
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 z-10 rounded-xs opacity-70 transition-colors hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle(
  props: React.ComponentProps<typeof DialogPrimitive.Title>,
) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("!text-lg leading-none font-semibold", className)}
      {...rest}
    />
  );
}

function DialogDescription(
  props: React.ComponentProps<typeof DialogPrimitive.Description>,
) {
  const { className, ...rest } = props;
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("sr-only", className)}
      {...rest}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
