import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
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
    
    // Add inline styles based on variant
    const getStyles = () => {
      const base = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        fontWeight: '500',
        padding: '0.5rem 1rem',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s'
      }
      
      switch (variant) {
        case 'outline':
          return {
            ...base,
            border: '1px solid #475569',
            backgroundColor: 'transparent',
            color: '#f8fafc'
          }
        case 'destructive':
          return {
            ...base,
            backgroundColor: '#dc2626',
            color: '#ffffff'
          }
        default:
          return {
            ...base,
            backgroundColor: '#3b82f6',
            color: '#ffffff'
          }
      }
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        style={getStyles()}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
