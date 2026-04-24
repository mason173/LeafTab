import * as React from "react";

import { cn } from "./utils";

type InputProps = React.ComponentProps<"input"> & {
  variant?: "default" | "auth";
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          variant === "auth"
            ? [
                "flex h-9 w-full min-w-0 rounded-xl border border-border px-3 py-1 text-base transition-[background-color,color,box-shadow] outline-none",
                "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                "bg-input-background text-foreground rounded-[16px] hover:bg-accent/80",
              ]
            : [
                "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-full border border-border px-3 py-1 text-base bg-input-background transition-[background-color,color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:bg-accent/80",
                "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
              ],
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
