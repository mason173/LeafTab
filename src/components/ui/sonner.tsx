"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RiCheckboxCircleFill, RiErrorWarningFill, RiInformationFill } from "@remixicon/react";
import { cn } from "./utils";

type ToastType = "default" | "success" | "error" | "info";

type ToastOptions = {
  id?: string;
  description?: ReactNode;
  duration?: number;
};

type ToastItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  type: ToastType;
  duration: number;
  isClosing?: boolean;
};

type ToasterProps = {
  position?: "top-center";
  offset?: number;
  className?: string;
};

const listeners = new Set<(items: ToastItem[]) => void>();
const timeoutMap = new Map<string, number>();
let toastQueue: ToastItem[] = [];
const EXIT_DURATION = 180;

const notify = () => {
  listeners.forEach((listener) => listener(toastQueue));
};

const removeToast = (id: string) => {
  toastQueue = toastQueue.filter((item) => item.id !== id);
  notify();
};

const closeToast = (id: string) => {
  const hasTarget = toastQueue.some((item) => item.id === id && !item.isClosing);
  if (!hasTarget) return;
  toastQueue = toastQueue.map((item) => item.id === id ? { ...item, isClosing: true } : item);
  notify();
  window.setTimeout(() => {
    removeToast(id);
  }, EXIT_DURATION);
};

const dismissToast = (id?: string) => {
  if (!id) {
    timeoutMap.forEach((timer) => window.clearTimeout(timer));
    timeoutMap.clear();
    const ids = toastQueue.map((item) => item.id);
    ids.forEach((toastId) => closeToast(toastId));
    return;
  }
  const timer = timeoutMap.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timeoutMap.delete(id);
  }
  closeToast(id);
};

const pushToast = (type: ToastType, title: ReactNode, options?: ToastOptions) => {
  const id = options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const duration = Math.max(800, options?.duration ?? 2400);
  const timer = timeoutMap.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timeoutMap.delete(id);
  }
  const next: ToastItem = {
    id,
    type,
    title,
    description: options?.description,
    duration,
  };
  toastQueue = [next, ...toastQueue.filter((item) => item.id !== id)].slice(0, 5);
  notify();
  const timeout = window.setTimeout(() => {
    dismissToast(id);
  }, duration);
  timeoutMap.set(id, timeout);
  return id;
};

const subscribe = (listener: (items: ToastItem[]) => void) => {
  listeners.add(listener);
  listener(toastQueue);
  return () => {
    listeners.delete(listener);
  };
};

type ToastApi = {
  (title: ReactNode, options?: ToastOptions): string;
  success: (title: ReactNode, options?: ToastOptions) => string;
  error: (title: ReactNode, options?: ToastOptions) => string;
  info: (title: ReactNode, options?: ToastOptions) => string;
  dismiss: (id?: string) => void;
};

const toast = ((title: ReactNode, options?: ToastOptions) => pushToast("default", title, options)) as ToastApi;
toast.success = (title, options) => pushToast("success", title, options);
toast.error = (title, options) => pushToast("error", title, options);
toast.info = (title, options) => pushToast("info", title, options);
toast.dismiss = dismissToast;

const getTypeClassName = (type: ToastType) => {
  if (type === "error") return "bg-primary text-primary-foreground ring-primary/35";
  if (type === "success") return "bg-primary text-primary-foreground ring-primary/35";
  if (type === "info") return "bg-secondary text-secondary-foreground ring-border/60";
  return "bg-primary text-primary-foreground ring-primary/35";
};

const getTypeIcon = (type: ToastType) => {
  if (type === "error") return <RiErrorWarningFill className="h-4 w-4 shrink-0" />;
  if (type === "success") return <RiCheckboxCircleFill className="h-4 w-4 shrink-0" />;
  return <RiInformationFill className="h-4 w-4 shrink-0" />;
};

const Toaster = ({ position = "top-center", offset = 16, className }: ToasterProps) => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribe(setItems), []);

  if (!items.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 z-[16000] flex w-full max-w-[calc(100vw-1.5rem)] -translate-x-1/2 flex-col items-center gap-2 sm:max-w-[460px]",
        position === "top-center" ? "top-0" : "top-0",
        className
      )}
      style={{ paddingTop: offset }}
      aria-live="polite"
      aria-atomic="true"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            "pointer-events-auto flex w-full items-center gap-2 rounded-full px-4 py-2.5 shadow-lg ring-1 transition-all duration-200 animate-in slide-in-from-top-2 fade-in",
            item.isClosing && "opacity-0",
            getTypeClassName(item.type)
          )}
          role="status"
        >
          {getTypeIcon(item.type)}
          <div className="min-w-0">
            <div className="truncate text-sm font-medium leading-5">{item.title}</div>
            {item.description ? <div className="truncate text-xs opacity-85">{item.description}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export { Toaster, toast };
