"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog@1.1.6";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";

import { useControlledState } from "@/hooks/use-controlled-state";
import { getStrictContext } from "@/lib/get-strict-context";

import { cn } from "./utils";
import { buttonVariants } from "./button";

type AlertDialogContextType = {
  isOpen: boolean;
  setIsOpen: AlertDialogProps["onOpenChange"];
};

const [AlertDialogProvider, useAlertDialog] =
  getStrictContext<AlertDialogContextType>("AlertDialogContext");

type AlertDialogProps = React.ComponentProps<typeof AlertDialogPrimitive.Root>;

function AlertDialog(props: AlertDialogProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props.open,
    defaultValue: props.defaultOpen,
    onChange: props.onOpenChange,
  });

  return (
    <AlertDialogProvider value={{ isOpen, setIsOpen }}>
      <AlertDialogPrimitive.Root
        data-slot="alert-dialog"
        {...props}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </AlertDialogProvider>
  );
}

function AlertDialogTrigger({
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

type AlertDialogPortalProps = Omit<
  React.ComponentProps<typeof AlertDialogPrimitive.Portal>,
  "forceMount"
>;

function AlertDialogPortal({ children, ...props }: AlertDialogPortalProps) {
  const { isOpen } = useAlertDialog();

  return (
    <AnimatePresence>
      {isOpen ? (
        <AlertDialogPrimitive.Portal
          data-slot="alert-dialog-portal"
          forceMount
          {...props}
        >
          {children}
        </AlertDialogPrimitive.Portal>
      ) : null}
    </AnimatePresence>
  );
}

type AlertDialogOverlayProps = Omit<
  React.ComponentProps<typeof AlertDialogPrimitive.Overlay>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div">;

function AlertDialogOverlay({
  className,
  transition = { duration: 0.2, ease: "easeInOut" },
  ...props
}: AlertDialogOverlayProps) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      asChild
      forceMount
    >
      <motion.div
        key="alert-dialog-overlay"
        className={cn("fixed inset-0 z-50 bg-black/50", className)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={transition}
        {...props}
      />
    </AlertDialogPrimitive.Overlay>
  );
}

type AlertDialogFlipDirection = "top" | "bottom" | "left" | "right";

type AlertDialogContentProps = Omit<
  React.ComponentProps<typeof AlertDialogPrimitive.Content>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div"> & {
    from?: AlertDialogFlipDirection;
  };

function AlertDialogContent({
  className,
  from = "top",
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  transition = { type: "spring", stiffness: 150, damping: 25 },
  ...props
}: AlertDialogContentProps) {
  const initialRotation =
    from === "bottom" || from === "left" ? "20deg" : "-20deg";
  const isVertical = from === "top" || from === "bottom";
  const rotateAxis = isVertical ? "rotateX" : "rotateY";

  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        asChild
        forceMount
        onOpenAutoFocus={onOpenAutoFocus}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={onEscapeKeyDown}
      >
        <motion.div
          key="alert-dialog-content"
          data-slot="alert-dialog-content"
          initial={{
            opacity: 0,
            transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
          }}
          animate={{
            opacity: 1,
            transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`,
          }}
          exit={{
            opacity: 0,
            transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
          }}
          transition={transition}
          className={cn(
            "bg-background fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[32px] border p-6 shadow-lg sm:max-w-lg",
            className,
          )}
          {...props}
        />
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("!text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("sr-only", className)}
      {...props}
    />
  );
}

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants(), className)}
      {...props}
    />
  );
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
