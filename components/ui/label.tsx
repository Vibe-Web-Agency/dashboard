"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
    "block font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    {
        variants: {
            variant: {
                default: "text-[var(--text-muted)] text-[12px]",
                mono: "font-[var(--font-mono)] text-[10px] tracking-[0.07em] uppercase text-[var(--text-muted)]",
            }
        },
        defaultVariants: { variant: "default" }
    }
)

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, variant, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants({ variant }), className)}
        {...props}
    />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
