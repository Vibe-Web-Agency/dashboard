import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-7 w-full rounded-[6px] px-2.5 py-1 text-[12.5px] transition-colors",
          "bg-[var(--surface)] border border-[var(--border)] text-[var(--text)]",
          "placeholder:text-[var(--text-muted)]",
          "focus-visible:outline-none focus-visible:border-[var(--accent-deep)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
