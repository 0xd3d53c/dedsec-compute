"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  onError,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const [hasError, setHasError] = React.useState(false)

  const handleError = React.useCallback((event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true)
    onError?.(event)
  }, [onError])

  // Reset error state when src changes
  React.useEffect(() => {
    setHasError(false)
  }, [props.src])

  if (hasError) {
    return null // Let fallback show
  }

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      onError={handleError}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
