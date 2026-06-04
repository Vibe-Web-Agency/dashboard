import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap text-xs font-medium transition-all duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg)] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "rounded bg-[var(--accent)] text-[#0E0D0B] font-semibold hover:opacity-88 active:opacity-75 shadow-sm",
        destructive:
          "rounded bg-[oklch(62%_0.22_25/0.10)] text-[oklch(72%_0.18_25)] border border-[oklch(62%_0.22_25/0.20)] hover:bg-[oklch(62%_0.22_25/0.16)]",
        outline:
          "rounded border border-[var(--border-2)] bg-transparent text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] hover:border-[var(--border-2)]",
        secondary:
          "rounded bg-[var(--surface-2)] text-[var(--text-2)] border border-[var(--border)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]",
        ghost:
          "rounded text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-7 px-3 py-1",
        sm: "h-6 px-2.5 text-[10.5px] tracking-wide",
        lg: "h-8 px-4 text-[12.5px]",
        icon: "h-7 w-7",
        "icon-sm": "h-6 w-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
