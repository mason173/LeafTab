"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog@1.1.6";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { RiCloseFill as XIcon } from "@remixicon/react";

import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/lib/get-strict-context";

import { cn } from "./utils";

type DialogContextType = {
  isOpen: boolean;
  setIsOpen: DialogProps["onOpenChange"];
};

const [DialogProvider, useDialog] =
  getStrictContext<DialogContextType>("DialogContext");

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

function Dialog(props: DialogProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props.open,
    defaultValue: props.defaultOpen,
    onChange: props.onOpenChange,
  });

  return (
    <DialogProvider value={{ isOpen, setIsOpen }}>
      <DialogPrimitive.Root
        data-slot="dialog"
        {...props}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </DialogProvider>
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogPortalProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Portal>,
  "forceMount"
>;

function DialogPortal({ children, ...props }: DialogPortalProps) {
  const { isOpen } = useDialog();

  return (
    <AnimatePresence>
      {isOpen ? (
        <DialogPrimitive.Portal data-slot="dialog-portal" forceMount {...props}>
          {children}
        </DialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  );
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogOverlayProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Overlay>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div">;

function DialogOverlay({
  className,
  transition = { duration: 0.2, ease: "easeInOut" },
  ...props
}: DialogOverlayProps) {
  return (
    <DialogPrimitive.Overlay data-slot="dialog-overlay" asChild forceMount>
      <motion.div
        key="dialog-overlay"
        className={cn("fixed inset-0 z-50 bg-black/50", className)}
        initial={{ opacity: 0, filter: "blur(4px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, filter: "blur(4px)" }}
        transition={transition}
        {...props}
      />
    </DialogPrimitive.Overlay>
  );
}

type DialogFlipDirection = "top" | "bottom" | "left" | "right";

type DialogContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div"> & {
    from?: DialogFlipDirection;
    overlayClassName?: string;
    overlayStyle?: React.CSSProperties;
  };

function DialogContent({
  className,
  children,
  from = "top",
  overlayClassName,
  overlayStyle,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  transition = { type: "spring", stiffness: 150, damping: 25 },
  ...props
}: DialogContentProps) {
  const initialRotation =
    from === "bottom" || from === "left" ? "20deg" : "-20deg";
  const isVertical = from === "top" || from === "bottom";
  const rotateAxis = isVertical ? "rotateX" : "rotateY";

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay className={overlayClassName} style={overlayStyle} />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        aria-describedby={undefined}
        asChild
        forceMount
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={onEscapeKeyDown}
        onPointerDownOutside={onPointerDownOutside}
        onInteractOutside={onInteractOutside}
      >
        <motion.div
          key="dialog-content"
          data-slot="dialog-content"
          initial={{
            opacity: 0,
            filter: "blur(4px)",
            transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
          }}
          animate={{
            opacity: 1,
            filter: "blur(0px)",
            transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`,
          }}
          exit={{
            opacity: 0,
            filter: "blur(4px)",
            transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
          }}
          transition={transition}
          className={cn(
            "bg-background/80 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[32px] border border-border p-6 shadow-lg sm:max-w-lg min-w-0 max-w-full overflow-hidden backdrop-blur-xl",
            className,
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </motion.div>
      </DialogPrimitive.Content>
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

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("!text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("sr-only", className)}
      {...props}
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
