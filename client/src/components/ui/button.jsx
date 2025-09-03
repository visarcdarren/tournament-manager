import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-primary hover:bg-slate-700 hover:border-slate-700 hover:text-white",
        destructive:
          "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/90 hover:border-destructive/90",
        outline:
          "border-input bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary",
        secondary:
          "bg-secondary text-secondary-foreground border-secondary hover:bg-slate-700 hover:border-slate-700 hover:text-white",
        ghost: "border-transparent hover:bg-primary hover:text-primary-foreground hover:border-primary",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
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
